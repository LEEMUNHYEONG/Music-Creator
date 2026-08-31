const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const elements = new Map();
const alerts = [];
const confirmMessages = [];
let blobText = "";
let createdUrl = "";
let revokedUrl = "";
let clickedDownload = "";
let appended = false;
let removed = false;

function addElement(id, value = "") {
  const el = { id, value, textContent: value };
  elements.set(id, el);
  return el;
}

global.window = global;
window.currentProject = {
  title: "Codex Export Song",
};
global.document = {
  getElementById(id) {
    return elements.get(id) || null;
  },
  createElement(tag) {
    assert.strictEqual(tag, "a");
    return {
      href: "",
      download: "",
      click() {
        clickedDownload = this.download;
      },
    };
  },
  body: {
    appendChild() {
      appended = true;
    },
    removeChild() {
      removed = true;
    },
  },
};
global.alert = function alertStub(message) {
  alerts.push(message);
};
// alert()가 window.showToast(message, level)로 전환되어 동일하게 스텁한다.
window.showToast = function showToastStub(message, level) {
  alerts.push(message);
};
global.confirm = function confirmStub(message) {
  confirmMessages.push(message);
  return true;
};
// downloadMVPrompts의 확인 게이트는 네이티브 confirm() 대신 비차단
// showConfirmAsync를 사용하므로 동일하게 스텁한다.
window.showConfirmAsync = function showConfirmAsyncStub(message) {
  confirmMessages.push(message);
  return Promise.resolve(true);
};
global.Blob = class BlobStub {
  constructor(parts, options) {
    blobText = parts.join("");
    this.options = options;
  }
};
global.URL = {
  createObjectURL() {
    createdUrl = "blob:test-url";
    return createdUrl;
  },
  revokeObjectURL(url) {
    revokedUrl = url;
  },
};

const step6Source = fs.readFileSync(path.resolve(__dirname, "../test-results/mv_modules.compat.js"), "utf8");
const start = step6Source.indexOf("window.formatMVSceneExportMetadata = function");
const end = step6Source.indexOf("// --- Extracted generateSRTPreview ---", start);
assert.ok(start !== -1, "MV prompt export helpers should exist in js/step6.js");
assert.ok(end !== -1, "downloadMVPrompts block should end before SRT helpers");
vm.runInThisContext(step6Source.slice(start, end), {
  filename: "js/step6.js.download-mv-prompts-slice",
});

addElement("mvCombinedPromptKo", "통합 한글");
addElement("mvCombinedPromptEn", "combined english");
addElement("mvBackgroundPromptKo", "배경 한글");
addElement("mvBackgroundPromptEn", "background english");
addElement("mvCharacterPromptKo", "인물 한글");
addElement("mvCharacterPromptEn", "character english");
addElement("scene_0_en", "scene zero textarea en");
addElement("scene_0_ko", "씬 0 textarea ko");

window.currentScenes = [
  {
    time: "00:00-00:08",
    scene: "첫 장면",
    lyrics: "첫 가사 구간",
    location: "rainy alley",
    emotion: "lonely",
    mood: "quiet negative space",
    lighting: "blue-hour side light",
    cameraWork: "slow dolly-in",
    durationSeconds: 8,
    prompt: "scene zero fallback en",
    promptKo: "씬 0 fallback ko",
  },
  {
    time: "00:08-00:16",
    scene: "둘째 장면",
    prompt: "scene one fallback en",
    promptKo: "씬 1 fallback ko",
  },
];

// downloadMVPrompts는 확인 게이트를 await하는 async 함수이므로
// 이후 나머지 검증도 async IIFE 안에서 await한다.
(async () => {

await window.downloadMVPrompts();

assert.strictEqual(clickedDownload, "mv-prompts.txt");
assert.strictEqual(appended, true);
assert.strictEqual(removed, true);
assert.strictEqual(revokedUrl, createdUrl);
assert.ok(blobText.includes("MV 프롬프트"));
assert.ok(blobText.includes("프로젝트: Codex Export Song"));
assert.ok(blobText.includes("릴리스 기준: mv-stabilization-2026-05-06"));
assert.ok(blobText.includes("=== 통합 프롬프트 ==="));
assert.ok(blobText.includes("combined english"));
assert.ok(blobText.includes("=== 씬별 개별 프롬프트 ==="));
assert.ok(blobText.includes("씬 1 (00:00-00:08)"));
assert.ok(blobText.includes("[씬 메타데이터]"));
assert.ok(blobText.includes("가사 구간: 첫 가사 구간"));
assert.ok(blobText.includes("장소: rainy alley"));
assert.ok(blobText.includes("감정: lonely"));
assert.ok(blobText.includes("조명: blue-hour side light"));
assert.ok(blobText.includes("카메라: slow dolly-in"));
assert.ok(blobText.includes("길이: 8초"));
assert.ok(blobText.includes("scene zero textarea en"));
assert.ok(blobText.includes("씬 0 textarea ko"));
assert.ok(blobText.includes("씬 2 (00:08-00:16)"));
assert.ok(blobText.includes("scene one fallback en"));
assert.ok(blobText.includes("씬 1 fallback ko"));
assert.strictEqual(confirmMessages.length, 1);
assert.ok(confirmMessages[0].includes("전체 MV 프롬프트 최종 확인"));
assert.ok(confirmMessages[0].includes("작업: 전체 MV 프롬프트 다운로드"));
assert.ok(confirmMessages[0].includes("프로젝트: Codex Export Song"));
assert.ok(confirmMessages[0].includes("포함 항목:"));

window.currentScenes = [];
await window.downloadMVPrompts();
assert.ok(alerts.some((message) => message.includes("다운로드할 프롬프트")));

console.log("MV download prompts smoke test: PASS");
process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
