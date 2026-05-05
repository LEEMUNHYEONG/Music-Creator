const assert = require("assert");

const originalConsole = { ...console };
const elements = new Map();
let toastMessage = "";
let saveCalled = 0;

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
global.alert = function alertStub(message) {
  throw new Error(`Unexpected alert: ${message}`);
};

window.currentScenes = [
  {
    scene: "도시 골목",
    prompt: "old english prompt",
    promptKo: "기존 한글 프롬프트",
  },
];
window.currentProject = {
  data: {
    marketing: {
      mvSettings: { minutes: "3" },
      mvPrompts: { thumbnail: { en: "thumb", ko: "썸네일" } },
      mvScenes: [],
    },
  },
};
window.showCopyIndicator = function showCopyIndicator(message) {
  toastMessage = message;
};

addElement("scene_0_en", "new english prompt");
addElement("scene_0_ko", "새 한글 프롬프트");

require("../js/storage.js");
window.saveCurrentProject = function saveCurrentProjectStub() {
  saveCalled += 1;
  window.currentProject.data.marketing.mvScenes = JSON.parse(
    JSON.stringify(window.currentScenes),
  );
  if (typeof window.syncMarketingMVModel === "function") {
    window.syncMarketingMVModel(window.currentProject.data.marketing);
  }
  return true;
};
require("../js/step6.js");

window.saveScenePrompt(0);

assert.strictEqual(window.currentScenes[0].prompt, "new english prompt");
assert.strictEqual(window.currentScenes[0].promptKo, "새 한글 프롬프트");
assert.strictEqual(saveCalled, 1);
assert.strictEqual(
  window.currentProject.data.marketing.mv.scenes[0].prompt,
  "new english prompt",
);
assert.strictEqual(
  window.currentProject.data.marketing.mvScenes[0].promptKo,
  "새 한글 프롬프트",
);
assert.ok(toastMessage.includes("씬 1"));

originalConsole.log("MV save scene prompt smoke test: PASS");
process.exit(0);
