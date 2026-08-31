const assert = require("assert");

const originalConsole = { ...console };
const elements = new Map();
let clipboardText = "";
let confirmMessage = "";
let toastMessage = "";
let focusedScene = false;
let scrolledScene = false;
let allowExport = false;

console.log = function logStub() {};

function addElement(id, value = "") {
  elements.set(id, {
    id,
    value,
    textContent: value,
    focus() {
      if (id === "scene_0_en") focusedScene = true;
    },
    scrollIntoView() {
      if (id === "scene_0_en") scrolledScene = true;
    },
  });
}

const dirtyBadges = [
  {
    dataset: {
      sceneIndex: "0",
    },
  },
];

global.window = global;
global.document = {
  getElementById(id) {
    return elements.get(id) || null;
  },
  querySelector(selector) {
    if (selector === '.mv-scene-unsaved-badge[data-dirty="true"]') {
      return dirtyBadges[0];
    }
    return null;
  },
  querySelectorAll(selector) {
    if (selector === '.mv-scene-unsaved-badge[data-dirty="true"]') {
      return dirtyBadges;
    }
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
  confirmMessage = message;
  return allowExport;
};
// 미저장 씬 확인 게이트는 네이티브 confirm() 대신 비차단 showConfirmAsync를
// 사용하므로 동일하게 스텁한다.
window.showConfirmAsync = function showConfirmAsyncStub(message) {
  confirmMessage = message;
  return Promise.resolve(allowExport);
};

window.showCopyIndicator = function showCopyIndicator(message) {
  toastMessage = message;
};
window.currentProject = {
  title: "Unsaved Guard Project",
};
window.currentScenes = [
  {
    time: "0:00-0:08",
    scene: "새벽 무대 위 인물",
    lyrics: "아직 저장하지 않은 마음",
    location: "dawn stage",
    mood: "hopeful",
    cameraWork: "slow push-in",
    durationSeconds: 8,
    prompt: "cinematic dawn stage image prompt",
    promptKo: "새벽 무대 이미지 프롬프트",
  },
];

addElement("scene_0_en", "edited scene prompt from textarea");
addElement("scene_0_ko", "수정된 한글 씬 프롬프트");

require("../test-results/mv_modules.compat.js");

assert.deepStrictEqual(window.getMVUnsavedSceneIndexes(), [0]);
assert.ok(
  window
    .buildMVUnsavedSceneExportMessage("이미지 프롬프트 번들 복사")
    .includes("대상 씬: 1"),
);

// copyMVImagePromptBundle은 확인 게이트를 await하는 async 함수이므로
// 완료를 직접 기다린 뒤 검증한다. writeText().then() 콜백은 별도
// 마이크로태스크이므로 매크로태스크 한 틱을 더 기다린다.
(async () => {

await window.copyMVImagePromptBundle();
await new Promise((resolve) => setImmediate(resolve));

assert.ok(confirmMessage.includes("수정 미저장 씬 1개"));
assert.ok(confirmMessage.includes("이미지 프롬프트 번들 복사"));
assert.strictEqual(clipboardText, "");
assert.strictEqual(focusedScene, true);
assert.strictEqual(scrolledScene, true);
assert.ok(toastMessage.includes("저장되지 않은 씬"));

allowExport = true;
confirmMessage = "";
toastMessage = "";
await window.copyMVImagePromptBundle();
await new Promise((resolve) => setImmediate(resolve));

assert.ok(confirmMessage.includes("수정 미저장 씬 1개"));
assert.ok(clipboardText.includes("edited scene prompt from textarea"));
assert.ok(toastMessage.includes("이미지 생성 프롬프트"));
originalConsole.log("MV unsaved export guard smoke test: PASS");
process.exit(0);
})().catch((err) => {
  originalConsole.error(err);
  process.exit(1);
});
