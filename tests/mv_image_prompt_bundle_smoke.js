const assert = require("assert");

const originalConsole = { ...console };
const elements = new Map();
let clipboardText = "";
let toastMessage = "";
let blobText = "";
let clickedDownload = "";
let appended = false;
let removed = false;
let revokedUrl = "";

console.log = function logStub() {};

function addElement(id, value = "") {
  elements.set(id, { id, value, textContent: value });
}

global.window = global;
global.document = {
  getElementById(id) {
    return elements.get(id) || null;
  },
  querySelectorAll() {
    return [];
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
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: {
    clipboard: {
      writeText(text) {
        clipboardText = text;
        return Promise.resolve();
      },
    },
  },
});
global.Blob = class BlobStub {
  constructor(parts, options) {
    blobText = parts.join("");
    this.options = options;
  }
};
global.URL = {
  createObjectURL() {
    return "blob:mv-image-bundle-test";
  },
  revokeObjectURL(url) {
    revokedUrl = url;
  },
};
global.alert = function alertStub(message) {
  throw new Error(`Unexpected alert: ${message}`);
};

window.showCopyIndicator = function showCopyIndicator(message) {
  toastMessage = message;
};
window.currentProject = {
  title: "Image Bundle Project",
};
window.currentScenes = [
  {
    time: "00:00-00:08",
    scene: "비 오는 골목",
    lyrics: "비처럼 흘러내린 밤",
    location: "rainy alley",
    mood: "quiet negative space",
    cameraWork: "slow dolly-in",
    durationSeconds: 8,
    prompt: "fallback rainy alley image prompt",
    promptKo: "비 오는 골목 이미지 프롬프트",
  },
  {
    time: "00:08-00:16",
    scene: "옥상 위 인물",
    prompt: "fallback rooftop image prompt",
    promptKo: "옥상 위 인물 이미지 프롬프트",
  },
];

addElement("mvThumbnailPromptKo", "대표 썸네일 한글");
addElement("mvThumbnailPromptEn", "hero thumbnail image prompt");
addElement("mvBackgroundDetailPromptKo", "상세 배경 한글");
addElement("mvBackgroundDetailPromptEn", "detailed background image prompt");
addElement("mvCharacterDetailPromptKo", "상세 인물 한글");
addElement("mvCharacterDetailPromptEn", "detailed character image prompt");
addElement("mvCombinedPromptKo", "통합 스타일 한글");
addElement("mvCombinedPromptEn", "combined visual style prompt");
addElement("scene_1_en", "textarea rooftop image prompt");
addElement("scene_1_ko", "textarea 옥상 이미지 설명");

require("../js/step6.js");

const bundleText = window.buildMVImagePromptBundle();

assert.ok(bundleText.includes("MV 이미지 생성 프롬프트 번들"));
assert.ok(bundleText.includes("프로젝트: Image Bundle Project"));
assert.ok(bundleText.includes("릴리스 기준: mv-stabilization-2026-05-06"));
assert.ok(bundleText.includes("=== 대표 썸네일 이미지 프롬프트 ==="));
assert.ok(bundleText.includes("hero thumbnail image prompt"));
assert.ok(bundleText.includes("=== 배경 이미지 프롬프트 ==="));
assert.ok(bundleText.includes("detailed background image prompt"));
assert.ok(bundleText.includes("=== 인물 이미지 프롬프트 ==="));
assert.ok(bundleText.includes("detailed character image prompt"));
assert.ok(bundleText.includes("=== 통합 이미지 스타일 프롬프트 ==="));
assert.ok(bundleText.includes("combined visual style prompt"));
assert.ok(bundleText.includes("=== 씬별 이미지 생성 프롬프트 ==="));
assert.ok(bundleText.includes("씬 1 (00:00-00:08)"));
assert.ok(bundleText.includes("가사 구간: 비처럼 흘러내린 밤"));
assert.ok(bundleText.includes("카메라: slow dolly-in"));
assert.ok(bundleText.includes("16:9 aspect ratio"));
assert.ok(bundleText.includes("textarea rooftop image prompt"));
assert.ok(bundleText.includes("textarea 옥상 이미지 설명"));

window.copyMVImagePromptBundle();

setImmediate(() => {
  assert.strictEqual(clipboardText, bundleText);
  assert.ok(toastMessage.includes("이미지 생성 프롬프트"));

  window.downloadMVImagePromptBundle();
  assert.strictEqual(clickedDownload, "mv-image-prompts.txt");
  assert.strictEqual(appended, true);
  assert.strictEqual(removed, true);
  assert.strictEqual(revokedUrl, "blob:mv-image-bundle-test");
  assert.strictEqual(blobText, bundleText);

  originalConsole.log("MV image prompt bundle smoke test: PASS");
  process.exit(0);
});
