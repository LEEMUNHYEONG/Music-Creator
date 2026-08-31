const assert = require("assert");

const elements = new Map();
const alerts = [];
const toasts = [];
let saveCount = 0;
let mode = "success";
let requestedArgs = null;

function addElement(id, value = "") {
  elements.set(id, { id, value, textContent: value });
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
  alerts.push(message);
};

window.showCopyIndicator = function showCopyIndicatorStub(message) {
  toasts.push(message);
};
window.saveCurrentProject = function saveCurrentProjectStub() {
  saveCount += 1;
  return true;
};

[
  ["mvEra", "modern"],
  ["mvCountry", "korea"],
  ["mvCharacterCount", "1"],
  ["mvCustomSettings", "rain reflections"],
  ["mvLighting", "neon"],
  ["mvCameraWork", "tracking"],
  ["mvMood", "melancholic"],
  ["mvCharacter1_gender", "female"],
  ["mvCharacter1_age", "20s"],
  ["mvCharacter1_race", "asian"],
  ["mvCharacter1_appearance", "black coat"],
  ["review_thumbnail_en", "old thumbnail en"],
  ["review_thumbnail_ko", "old thumbnail ko"],
  ["review_background_en", "old background en"],
  ["review_background_ko", "old background ko"],
  ["review_character_en", "old character en"],
  ["review_character_ko", "old character ko"],
].forEach(([id, value]) => addElement(id, value));

require("../test-results/mv_modules.compat.js");

window.getMVLocationEnString = function getMVLocationEnStringStub() {
  return "neon alley";
};

window.generateMVThumbnailPrompts = async function generateMVThumbnailPromptsStub(
  ...args
) {
  requestedArgs = args;
  if (mode === "empty") {
    return {
      thumbnailEn: "",
      thumbnailKo: "",
      backgroundEn: "",
      backgroundKo: "",
      characterEn: "",
      characterKo: "",
    };
  }

  return {
    thumbnailEn: "new thumbnail en",
    thumbnailKo: "new thumbnail ko",
    backgroundEn: "new background en",
    backgroundKo: "new background ko",
    characterEn: "new character en",
    characterKo: "new character ko",
  };
};
global.generateMVThumbnailPrompts = window.generateMVThumbnailPrompts;

(async () => {
  await window.regenerateStylePrompts();

  assert.strictEqual(requestedArgs[2], "neon alley");
  assert.deepStrictEqual(requestedArgs[3], [
    {
      gender: "female",
      age: "20s",
      race: "asian",
      appearance: "black coat",
    },
  ]);
  assert.strictEqual(elements.get("review_thumbnail_en").value, "new thumbnail en");
  assert.strictEqual(elements.get("review_thumbnail_ko").value, "new thumbnail ko");
  assert.strictEqual(elements.get("review_background_en").value, "new background en");
  assert.strictEqual(elements.get("review_background_ko").value, "new background ko");
  assert.strictEqual(elements.get("review_character_en").value, "new character en");
  assert.strictEqual(elements.get("review_character_ko").value, "new character ko");
  assert.strictEqual(saveCount, 1);
  assert.ok(toasts.some((message) => message.includes("스타일 프롬프트 재생성 중")));

  elements.get("review_thumbnail_en").value = "keep thumbnail en";
  elements.get("review_background_en").value = "keep background en";
  elements.get("review_character_en").value = "keep character en";
  mode = "empty";

  await window.regenerateStylePrompts();

  assert.strictEqual(elements.get("review_thumbnail_en").value, "keep thumbnail en");
  assert.strictEqual(elements.get("review_background_en").value, "keep background en");
  assert.strictEqual(elements.get("review_character_en").value, "keep character en");
  assert.strictEqual(saveCount, 1);
  assert.ok(alerts.some((message) => message.includes("비어있습니다")));

  console.log("MV regenerate style prompts smoke test: PASS");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
