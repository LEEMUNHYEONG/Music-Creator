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

window.copyMVImagePromptBundle();

setImmediate(() => {
  assert.ok(confirmMessage.includes("수정 미저장 씬 1개"));
  assert.ok(confirmMessage.includes("이미지 프롬프트 번들 복사"));
  assert.strictEqual(clipboardText, "");
  assert.strictEqual(focusedScene, true);
  assert.strictEqual(scrolledScene, true);
  assert.ok(toastMessage.includes("저장되지 않은 씬"));

  allowExport = true;
  confirmMessage = "";
  toastMessage = "";
  window.copyMVImagePromptBundle();

  setImmediate(() => {
    assert.ok(confirmMessage.includes("수정 미저장 씬 1개"));
    assert.ok(clipboardText.includes("edited scene prompt from textarea"));
    assert.ok(toastMessage.includes("이미지 생성 프롬프트"));
    originalConsole.log("MV unsaved export guard smoke test: PASS");
    process.exit(0);
  });
});
