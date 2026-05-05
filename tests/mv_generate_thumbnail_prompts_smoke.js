const assert = require("assert");

const elements = new Map();
const translations = [];
let fetchBody = null;
const originalConsole = {
  error: console.error,
  log: console.log,
  warn: console.warn,
};

console.log = function logStub() {};
console.warn = function warnStub() {};

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
  throw new Error(`Unexpected alert: ${message}`);
};

global.extractLyricsOnly = function extractLyricsOnlyStub(text) {
  return text.replace(/\[[^\]]+\]/g, "").trim();
};
global.translateEnglishToKoreanForScene = async function translateEnToKo(
  field,
  text,
) {
  translations.push({ field, text });
  return `번역(${field}): ${text}`;
};
global.fetch = async function fetchStub(url, options) {
  assert.ok(url.includes("gemini-2.5-flash"));
  fetchBody = JSON.parse(options.body);
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
                    thumbnailEn: "ai thumbnail en",
                    backgroundEn: "ai background en",
                    characterEn: "ai character en",
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

[
  ["finalLyrics", "[Verse] rain and neon memories"],
  ["finalizedStylePrompt", "cinematic ballad"],
  ["mvThumbnailPromptEn", ""],
  ["mvThumbnailPromptKo", ""],
  ["mvBackgroundDetailPromptEn", ""],
  ["mvBackgroundDetailPromptKo", ""],
  ["mvCharacterDetailPromptEn", ""],
  ["mvCharacterDetailPromptKo", ""],
].forEach(([id, value]) => addElement(id, value));

require("../js/step6.js");

(async () => {
  window.getGeminiApiKey = function getGeminiApiKeyStub() {
    return "AIza-test-key";
  };
  window.getMVLocationValues = function getMVLocationValuesStub() {
    return ["city"];
  };

  const aiPrompts = await window.generateMVThumbnailPrompts(
    "modern",
    "korea",
    "neon alley",
    [{ gender: "female", age: "20s", race: "asian", appearance: "black coat" }],
    "rain reflections",
    "neon",
    "tracking",
    "melancholic",
  );

  assert.ok(fetchBody.contents[0].parts[0].text.includes("rain and neon memories"));
  assert.deepStrictEqual(aiPrompts, {
    thumbnailEn: "ai thumbnail en",
    thumbnailKo: "번역(thumbnail): ai thumbnail en",
    backgroundEn: "ai background en",
    backgroundKo: "번역(background): ai background en",
    characterEn: "ai character en",
    characterKo: "번역(character): ai character en",
  });
  assert.deepStrictEqual(
    translations.map((item) => item.field),
    ["thumbnail", "background", "character"],
  );
  assert.strictEqual(elements.get("mvThumbnailPromptEn").value, "ai thumbnail en");
  assert.strictEqual(
    elements.get("mvThumbnailPromptKo").value,
    "번역(thumbnail): ai thumbnail en",
  );

  window.getGeminiApiKey = function noGeminiKeyStub() {
    return "";
  };
  translations.length = 0;
  const fallbackPrompts = await window.generateMVThumbnailPrompts(
    "modern",
    "korea",
    "neon alley",
    [],
    "rain reflections",
    "neon",
    "tracking",
    "melancholic",
  );

  assert.ok(fallbackPrompts.thumbnailEn.includes("representative thumbnail image"));
  assert.ok(fallbackPrompts.backgroundEn.includes("background-focused composition"));
  assert.ok(fallbackPrompts.characterEn.includes("character-focused composition"));
  assert.deepStrictEqual(
    translations.map((item) => item.field),
    ["thumbnail", "background", "character"],
  );
  assert.strictEqual(
    elements.get("mvBackgroundDetailPromptEn").value,
    fallbackPrompts.backgroundEn,
  );

  originalConsole.log("MV generate thumbnail prompts smoke test: PASS");
})().catch((error) => {
  originalConsole.error(error);
  process.exit(1);
});
