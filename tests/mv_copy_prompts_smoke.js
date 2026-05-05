const assert = require("assert");

const originalConsole = { ...console };
const elements = new Map();
let clipboardText = "";
let toastMessage = "";

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

window.showCopyIndicator = function showCopyIndicator(message) {
  toastMessage = message;
};
window.currentScenes = [
  {
    time: "0:00-0:06",
    scene: "비 오는 도시 골목",
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

require("../js/step6.js");

window.copyAllMVPrompts();

setImmediate(() => {
  assert.ok(clipboardText.includes("=== MV 프롬프트 상세 ==="));
  assert.ok(clipboardText.includes("🎬 썸네일 이미지 프롬프트"));
  assert.ok(clipboardText.includes("thumbnail english"));
  assert.ok(clipboardText.includes("🏞️ 배경 프롬프트 (상세)"));
  assert.ok(clipboardText.includes("character english"));
  assert.ok(clipboardText.includes("=== 씬별 개별 프롬프트 ==="));
  assert.ok(clipboardText.includes("씬 1 (0:00-0:06)"));
  assert.ok(clipboardText.includes("scene zero english from textarea"));
  assert.ok(clipboardText.includes("씬 0 한글 textarea"));
  assert.ok(clipboardText.includes("씬 2 (0:06-0:12)"));
  assert.ok(clipboardText.includes("person on rooftop looking at the sky"));
  assert.ok(toastMessage.includes("클립보드"));
  originalConsole.log("MV copy prompts smoke test: PASS");
  process.exit(0);
});
