const assert = require("assert");

const elements = new Map();
const alerts = [];
const toasts = [];
let fetchMode = "success";
let fetchBody = null;
let saveCount = 0;
const originalConsole = {
  error: console.error,
  log: console.log,
  warn: console.warn,
};

console.warn = function warnStub() {};

function addElement(id, value = "") {
  elements.set(id, {
    id,
    value,
    textContent: value,
  });
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
global.fetch = async function fetchStub(url, options) {
  assert.ok(url.includes("gemini-"));
  fetchBody = JSON.parse(options.body);

  if (fetchMode === "failure") {
    return {
      ok: false,
      status: 500,
      statusText: "Server Error",
      async json() {
        return { error: { message: "forced failure" } };
      },
    };
  }

  return {
    ok: true,
    async json() {
      return {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    backgroundEn: "new generated background prompt",
                    backgroundKo: "새 배경 프롬프트",
                  }),
                },
              ],
            },
          },
        ],
      };
    },
  };
};

window.getGeminiApiKey = function getGeminiApiKeyStub() {
  return "AIza-test-key";
};
window.extractLyricsOnly = function extractLyricsOnlyStub(text) {
  return text.replace(/\[Verse\]/g, "").trim();
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
  ["mvCustomSettings", "wet asphalt"],
  ["mvLighting", "neon"],
  ["mvCameraWork", "tracking"],
  ["mvMood", "melancholic"],
  ["mvCharacter1_gender", "female"],
  ["mvCharacter1_age", "20s"],
  ["mvCharacter1_race", "asian"],
  ["mvCharacter1_appearance", "black coat"],
  ["finalLyrics", "[Verse] walking through rain"],
  ["finalizedStylePrompt", "cinematic ballad"],
  ["review_background_en", "old review en"],
  ["review_background_ko", "old review ko"],
  ["mvBackgroundDetailPromptEn", "old main en"],
  ["mvBackgroundDetailPromptKo", "old main ko"],
].forEach(([id, value]) => addElement(id, value));

require("../test-results/mv_modules.compat.js");

window.getMVLocationEnString = function getMVLocationEnStringStub() {
  return "rainy city street";
};

(async () => {
  await window.regenerateSingleStylePrompt("background");

  assert.ok(fetchBody.contents[0].parts[0].text.includes("rainy city street"));
  assert.strictEqual(
    elements.get("review_background_en").value,
    "new generated background prompt",
  );
  assert.strictEqual(elements.get("review_background_ko").value, "새 배경 프롬프트");
  assert.strictEqual(
    elements.get("mvBackgroundDetailPromptEn").value,
    "new generated background prompt",
  );
  assert.strictEqual(
    elements.get("mvBackgroundDetailPromptKo").value,
    "새 배경 프롬프트",
  );
  assert.strictEqual(saveCount, 1);
  assert.ok(toasts.some((message) => message.includes("재생성 완료")));
  assert.deepStrictEqual(alerts, []);

  elements.get("review_background_en").value = "keep review en";
  elements.get("review_background_ko").value = "keep review ko";
  elements.get("mvBackgroundDetailPromptEn").value = "keep main en";
  elements.get("mvBackgroundDetailPromptKo").value = "keep main ko";
  fetchMode = "failure";

  await window.regenerateSingleStylePrompt("background");

  assert.strictEqual(elements.get("review_background_en").value, "keep review en");
  assert.strictEqual(elements.get("review_background_ko").value, "keep review ko");
  assert.strictEqual(elements.get("mvBackgroundDetailPromptEn").value, "keep main en");
  assert.strictEqual(elements.get("mvBackgroundDetailPromptKo").value, "keep main ko");
  assert.strictEqual(saveCount, 1);
  assert.ok(alerts.some((message) => message.includes("forced failure")));

  originalConsole.log("MV regenerate single style prompt smoke test: PASS");
})().catch((error) => {
  originalConsole.error(error);
  process.exit(1);
});
