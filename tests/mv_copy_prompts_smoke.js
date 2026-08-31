const assert = require("assert");

const originalConsole = { ...console };
const elements = new Map();
let clipboardText = "";
let toastMessage = "";
const confirmMessages = [];

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
global.alert = function alertStub(message) {
  throw new Error(`Unexpected alert: ${message}`);
};
global.confirm = function confirmStub(message) {
  confirmMessages.push(message);
  return true;
};
// copyAllMVPrompts의 확인 게이트는 네이티브 confirm() 대신 비차단
// showConfirmAsync를 사용하므로 동일하게 스텁한다.
window.showConfirmAsync = function showConfirmAsyncStub(message) {
  confirmMessages.push(message);
  return Promise.resolve(true);
};

window.showCopyIndicator = function showCopyIndicator(message) {
  toastMessage = message;
};
window.currentScenes = [
  {
    time: "0:00-0:06",
    scene: "비 오는 도시 골목",
    lyrics: "비처럼 흘러내린 밤",
    location: "rainy alley",
    emotion: "lonely",
    mood: "quiet negative space",
    lighting: "blue-hour side light",
    cameraWork: "slow dolly-in",
    durationSeconds: 6,
    prompt: "rainy city alley, cinematic lighting",
    promptKo: "비 오는 도시 골목, 시네마틱 조명",
  },
  {
    time: "0:06-0:12",
    scene: "옥상에서 하늘을 보는 인물",
    prompt: "person on rooftop looking at the sky",
    promptKo: "옥상에서 하늘을 바라보는 인물",
  },
];

addElement("mvThumbnailPromptKo", "썸네일 한글");
addElement("mvThumbnailPromptEn", "thumbnail english");
addElement("mvBackgroundDetailPromptKo", "배경 한글");
addElement("mvBackgroundDetailPromptEn", "background english");
addElement("mvCharacterDetailPromptKo", "인물 한글");
addElement("mvCharacterDetailPromptEn", "character english");
addElement("scene_0_en", "scene zero english from textarea");
addElement("scene_0_ko", "씬 0 한글 textarea");

require("../test-results/mv_modules.compat.js");

// copyAllMVPrompts는 확인 게이트를 await하는 async 함수이므로
// 완료를 직접 기다린 뒤 검증한다.
(async () => {

await window.copyAllMVPrompts();
// writeText().then() 콜백(toastMessage 설정)이 마이크로태스크 큐에 남아
// 있을 수 있으므로 매크로태스크 한 틱을 더 기다린다.
await new Promise((resolve) => setImmediate(resolve));

  assert.ok(clipboardText.includes("=== MV 프롬프트 상세 ==="));
  assert.ok(clipboardText.includes("🎬 썸네일 이미지 프롬프트"));
  assert.ok(clipboardText.includes("thumbnail english"));
  assert.ok(clipboardText.includes("🏞️ 배경 프롬프트 (상세)"));
  assert.ok(clipboardText.includes("character english"));
  assert.ok(clipboardText.includes("=== 씬별 개별 프롬프트 ==="));
  assert.ok(clipboardText.includes("씬 1 (0:00-0:06)"));
  assert.ok(clipboardText.includes("[씬 메타데이터]"));
  assert.ok(clipboardText.includes("가사 구간: 비처럼 흘러내린 밤"));
  assert.ok(clipboardText.includes("장소: rainy alley"));
  assert.ok(clipboardText.includes("감정: lonely"));
  assert.ok(clipboardText.includes("카메라: slow dolly-in"));
  assert.ok(clipboardText.includes("scene zero english from textarea"));
  assert.ok(clipboardText.includes("씬 0 한글 textarea"));
  assert.ok(clipboardText.includes("씬 2 (0:06-0:12)"));
  assert.ok(clipboardText.includes("person on rooftop looking at the sky"));
  assert.strictEqual(confirmMessages.length, 1);
  assert.ok(confirmMessages[0].includes("전체 MV 프롬프트 최종 확인"));
  assert.ok(confirmMessages[0].includes("작업: 전체 MV 프롬프트 복사"));
  assert.ok(confirmMessages[0].includes("씬 수: 전체 2개"));
  assert.ok(confirmMessages[0].includes("포함 항목:"));
  assert.ok(toastMessage.includes("클립보드"));
  originalConsole.log("MV copy prompts smoke test: PASS");
  process.exit(0);
})().catch((err) => {
  originalConsole.error(err);
  process.exit(1);
});
