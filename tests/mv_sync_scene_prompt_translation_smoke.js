const assert = require("assert");

const elements = new Map();
let saveCount = 0;
let enToKoInput = null;
let koToEnInput = null;

function addTextarea(id, value = "") {
  elements.set(id, { id, value });
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
    prompt: "old english scene prompt",
    promptKo: "기존 한글 씬 프롬프트",
  },
];

window.translateEnglishToKoreanForScene = async function translateEnToKo(
  fieldName,
  text,
) {
  enToKoInput = { fieldName, text };
  return `한글 씬 번역: ${text}`;
};
window.translateKoreanToEnglishForScene = async function translateKoToEn(
  ...args
) {
  const text = args.length === 1 ? args[0] : args[1];
  koToEnInput = text;
  return `English scene translation: ${text}`;
};
window.saveCurrentProject = function saveCurrentProjectStub() {
  saveCount += 1;
  return true;
};

addTextarea("scene_0_en", "new English scene prompt");
addTextarea("scene_0_ko", "");

require("../js/step6.js");

(async () => {
  await window.syncScenePromptTranslation(0, "en");

  assert.deepStrictEqual(enToKoInput, {
    fieldName: "prompt",
    text: "new English scene prompt",
  });
  assert.strictEqual(
    elements.get("scene_0_ko").value,
    "한글 씬 번역: new English scene prompt",
  );
  assert.strictEqual(window.currentScenes[0].prompt, "new English scene prompt");
  assert.strictEqual(
    window.currentScenes[0].promptKo,
    "한글 씬 번역: new English scene prompt",
  );
  assert.strictEqual(saveCount, 1);

  elements.get("scene_0_ko").value = "새 한글 씬 프롬프트";
  await window.syncScenePromptTranslation(0, "ko");

  assert.strictEqual(koToEnInput, "새 한글 씬 프롬프트");
  assert.strictEqual(
    elements.get("scene_0_en").value,
    "English scene translation: 새 한글 씬 프롬프트",
  );
  assert.strictEqual(
    window.currentScenes[0].prompt,
    "English scene translation: 새 한글 씬 프롬프트",
  );
  assert.strictEqual(window.currentScenes[0].promptKo, "새 한글 씬 프롬프트");
  assert.strictEqual(saveCount, 2);

  console.log("MV sync scene prompt translation smoke test: PASS");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
