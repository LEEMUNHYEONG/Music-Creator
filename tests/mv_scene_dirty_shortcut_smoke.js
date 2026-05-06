const assert = require("assert");

const originalConsole = { ...console };
const elements = new Map();
let saveCalled = 0;
let toastMessage = "";
let keydownHandler = null;
let prevented = false;
let stopped = false;

console.log = function logStub() {};

function createClassList(classes = []) {
  const set = new Set(classes);
  return {
    add(name) {
      set.add(name);
    },
    remove(name) {
      set.delete(name);
    },
    contains(name) {
      return set.has(name);
    },
    toggle(name, force) {
      if (force) set.add(name);
      else set.delete(name);
    },
  };
}

function addElement(id, value = "", classes = []) {
  const el = {
    id,
    value,
    textContent: value,
    dataset: {},
    style: {},
    title: "",
    classList: createClassList(classes),
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
  };
  elements.set(id, el);
  return el;
}

global.window = global;
global.alert = function alertStub(message) {
  throw new Error(`Unexpected alert: ${message}`);
};

const dirtyBadge = addElement("scene_0_dirty");
dirtyBadge.dataset.sceneIndex = "0";
dirtyBadge.dataset.dirty = "false";
addElement("saveScenePromptBtn_0");
const enEl = addElement("scene_0_en", "new dirty prompt", ["scene-prompt-en"]);
enEl.dataset.sceneIndex = "0";
addElement("scene_0_ko", "새 프롬프트", ["scene-prompt-ko"]).dataset.sceneIndex = "0";

global.document = {
  activeElement: enEl,
  addEventListener(type, handler) {
    if (type === "keydown") keydownHandler = handler;
  },
  getElementById(id) {
    return elements.get(id) || null;
  },
  querySelector(selector) {
    if (selector === '.mv-scene-unsaved-badge[data-dirty="true"]') {
      return dirtyBadge.dataset.dirty === "true" ? dirtyBadge : null;
    }
    return null;
  },
  querySelectorAll() {
    return [];
  },
};

window.currentScenes = [
  {
    scene: "도시 골목",
    prompt: "old prompt",
    promptKo: "기존 프롬프트",
  },
];
window.currentProject = { data: { marketing: { mvScenes: [] } } };
window.showCopyIndicator = function showCopyIndicator(message) {
  toastMessage = message;
};

require("../js/storage.js");
window.saveCurrentProject = function saveCurrentProjectStub() {
  saveCalled += 1;
  return true;
};
require("../js/step6.js");

window.markMVScenePromptDirty(0, true);

assert.strictEqual(dirtyBadge.dataset.dirty, "true");
assert.strictEqual(dirtyBadge.style.display, "inline-flex");
assert.ok(elements.get("saveScenePromptBtn_0").title.includes("저장되지 않은"));

assert.strictEqual(window.saveFocusedMVScenePrompt(), true);
assert.strictEqual(saveCalled, 1);
assert.strictEqual(window.currentScenes[0].prompt, "new dirty prompt");
assert.strictEqual(dirtyBadge.dataset.dirty, "false");
assert.strictEqual(dirtyBadge.style.display, "none");
assert.ok(toastMessage.includes("씬 1"));

window.markMVScenePromptDirty(0, true);
assert.ok(keydownHandler, "Ctrl+S handler should be bound");
keydownHandler({
  ctrlKey: true,
  metaKey: false,
  key: "s",
  preventDefault() {
    prevented = true;
  },
  stopImmediatePropagation() {
    stopped = true;
  },
});

assert.strictEqual(saveCalled, 2);
assert.strictEqual(prevented, true);
assert.strictEqual(stopped, true);
assert.strictEqual(dirtyBadge.dataset.dirty, "false");

originalConsole.log("MV scene dirty shortcut smoke test: PASS");
process.exit(0);
