const assert = require("assert");

const elements = new Map();
let saveCount = 0;
let enToKoInput = null;
let koToEnInput = null;

function addTextarea(id, value = "") {
  elements.set(id, { id, value, dataset: {} });
}

global.window = global;
global.document = {
  readyState: "loading",
  addEventListener() {},
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
    prompt: "old english overview",
    promptKo: "기존 한글 개요",
  },
];

window.translateEnglishToKoreanForScene = async function translateEnToKo(
  fieldName,
  text,
) {
  enToKoInput = { fieldName, text };
  return `한글 개요 번역: ${text}`;
};
window.translateKoreanToEnglishForScene = async function translateKoToEn(
  ...args
) {
  const text = args.length === 1 ? args[0] : args[1];
  koToEnInput = text;
  return `English overview translation: ${text}`;
};
window.saveCurrentProject = function saveCurrentProjectStub() {
  saveCount += 1;
  return true;
};

addTextarea("scene_overview_0_en", "new English overview 한글혼합");
addTextarea("scene_overview_0_ko", "");

require("../js/step6.js");

(async () => {
  await window.syncSceneOverviewPromptTranslation(0, "en");

  assert.deepStrictEqual(enToKoInput, {
    fieldName: "prompt",
    text: "new English overview",
  });
  assert.strictEqual(elements.get("scene_overview_0_en").value, "new English overview");
  assert.strictEqual(
    elements.get("scene_overview_0_ko").value,
    "한글 개요 번역: new English overview",
  );
  assert.strictEqual(window.currentScenes[0].prompt, "new English overview");
  assert.strictEqual(
    window.currentScenes[0].promptKo,
    "한글 개요 번역: new English overview",
  );
  assert.strictEqual(saveCount, 1);

  elements.get("scene_overview_0_ko").value = "새 한글 개요 english words";
  await window.syncSceneOverviewPromptTranslation(0, "ko");

  assert.strictEqual(koToEnInput, "새 한글 개요");
  assert.strictEqual(elements.get("scene_overview_0_ko").value, "새 한글 개요");
  assert.strictEqual(
    elements.get("scene_overview_0_en").value,
    "English overview translation:",
  );
  assert.strictEqual(window.currentScenes[0].prompt, "English overview translation:");
  assert.strictEqual(window.currentScenes[0].promptKo, "새 한글 개요");
  assert.strictEqual(saveCount, 2);

  console.log("MV sync scene overview translation smoke test: PASS");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
