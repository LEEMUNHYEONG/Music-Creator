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

window.translateEnglishToKoreanForScene = async function translateEnToKo(
  fieldName,
  text,
) {
  enToKoInput = { fieldName, text };
  return `한글 번역: ${text}`;
};
window.translateKoreanToEnglishForScene = async function translateKoToEn(
  ...args
) {
  const text = args.length === 1 ? args[0] : args[1];
  koToEnInput = text;
  return `English translation: ${text}`;
};
window.saveCurrentProject = function saveCurrentProjectStub() {
  saveCount += 1;
  return true;
};

addTextarea("mvThumbnailPromptEn", "cinematic thumbnail prompt");
addTextarea("mvThumbnailPromptKo", "");

require("../test-results/mv_modules.compat.js");

(async () => {
  await window.syncMVPromptTranslation("thumbnail", "en");

  assert.deepStrictEqual(enToKoInput, {
    fieldName: "prompt",
    text: "cinematic thumbnail prompt",
  });
  assert.strictEqual(
    elements.get("mvThumbnailPromptKo").value,
    "한글 번역: cinematic thumbnail prompt",
  );
  assert.strictEqual(saveCount, 1);

  elements.get("mvThumbnailPromptKo").value = "시네마틱 썸네일 프롬프트";
  await window.syncMVPromptTranslation("thumbnail", "ko");

  assert.strictEqual(koToEnInput, "시네마틱 썸네일 프롬프트");
  assert.strictEqual(
    elements.get("mvThumbnailPromptEn").value,
    "English translation: 시네마틱 썸네일 프롬프트",
  );
  assert.strictEqual(saveCount, 2);

  console.log("MV sync prompt translation smoke test: PASS");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
