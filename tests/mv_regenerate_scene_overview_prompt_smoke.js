const assert = require("assert");

const elements = new Map();
const alerts = [];
const toasts = [];
let fetchMode = "success";
let saveCount = 0;
let syncCalls = [];
let lastPrompt = "";
const originalConsole = {
  error: console.error,
  log: console.log,
};

console.error = function errorStub() {};

function addElement(id, value = "") {
  elements.set(id, { id, value, textContent: value, dataset: {} });
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
global.fetch = async function fetchStub(url, options = {}) {
  assert.ok(url.includes("gemini-"));
  lastPrompt = JSON.parse(options.body).contents[0].parts[0].text;

  if (fetchMode === "failure") {
    return {
      ok: false,
      status: 500,
      statusText: "Server Error",
      async json() {
        return { error: { message: "forced overview failure" } };
      },
    };
  }

  return {
    ok: true,
    async json() {
      const payload =
        fetchMode === "missingKo"
          ? { promptEn: "new overview prompt en" }
          : fetchMode === "empty"
            ? {}
            : {
                promptEn: "new overview prompt en",
                promptKo: "새 개요 프롬프트",
              };
      return {
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify(payload) }],
            },
          },
        ],
      };
    },
  };
};

global.extractLyricsOnly = function extractLyricsOnlyStub(text) {
  return text.replace(/\[[^\]]+\]/g, "").trim();
};

window.currentScenes = [
  {
    time: "00:00-00:10",
    scene: "lonely street at night",
    lyrics: "edited lyric line",
    location: "sunrise rooftop",
    emotion: "hopeful",
    mood: "warm horizon",
    lighting: "golden backlight",
    cameraWork: "slow crane-up",
    prompt: "old overview en",
    promptKo: "기존 개요 한글",
  },
];
window.getGeminiApiKey = function getGeminiApiKeyStub() {
  return "AIza-test-key";
};
window.getMVLocationEnString = function getMVLocationEnStringStub() {
  return "neon alley";
};
window.showCopyIndicator = function showCopyIndicatorStub(message) {
  toasts.push(message);
};
window.saveCurrentProject = function saveCurrentProjectStub() {
  saveCount += 1;
  return true;
};

[
  ["finalLyrics", "[Verse] lonely street at night"],
  ["finalizedStylePrompt", "cinematic ballad"],
  ["mvMinutes", "3"],
  ["mvSeconds", "0"],
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
  ["scene_overview_0_en", "old overview en"],
  ["scene_overview_0_ko", "기존 개요 한글"],
  ["scene_location_0", "rainy alley"],
  ["scene_emotion_0", "lonely"],
  ["scene_mood_0", "quiet negative space"],
  ["scene_lighting_0", "blue-hour side light"],
  ["scene_camera_work_0", "slow dolly-in"],
  ["scene_lyrics_0", "edited lyric from editor"],
].forEach(([id, value]) => addElement(id, value));

require("../test-results/mv_modules.compat.js");

window.syncSceneOverviewPromptTranslation =
  async function syncSceneOverviewPromptTranslationStub(
    sceneIndex,
    sourceLang,
  ) {
    syncCalls.push({ sceneIndex, sourceLang });
    const enEl = document.getElementById(`scene_overview_${sceneIndex}_en`);
    const koEl = document.getElementById(`scene_overview_${sceneIndex}_ko`);
    koEl.value = `번역: ${enEl.value}`;
    window.currentScenes[sceneIndex].prompt = enEl.value;
    window.currentScenes[sceneIndex].promptKo = koEl.value;
    window.saveCurrentProject();
  };

(async () => {
  await window.regenerateSceneOverviewPrompt(0);

  assert.strictEqual(
    elements.get("scene_overview_0_en").value,
    "/* Scene 1 */ new overview prompt en",
  );
  assert.ok(lastPrompt.includes("씬별 편집 메타데이터"));
  assert.ok(lastPrompt.includes("씬 장소: rainy alley"));
  assert.ok(lastPrompt.includes("씬 감정: lonely"));
  assert.ok(lastPrompt.includes("씬 조명: blue-hour side light"));
  assert.ok(lastPrompt.includes("씬 카메라: slow dolly-in"));
  assert.ok(lastPrompt.includes("edited lyric from editor"));
  assert.strictEqual(window.currentScenes[0].location, "rainy alley");
  assert.strictEqual(window.currentScenes[0].emotion, "lonely");
  assert.strictEqual(
    elements.get("scene_overview_0_ko").value,
    "새 개요 프롬프트",
  );
  assert.strictEqual(
    window.currentScenes[0].prompt,
    "/* Scene 1 */ new overview prompt en",
  );
  assert.strictEqual(window.currentScenes[0].promptKo, "새 개요 프롬프트");
  assert.strictEqual(saveCount, 1);
  assert.deepStrictEqual(syncCalls, []);
  assert.ok(toasts.some((message) => message.includes("씬 1")));

  fetchMode = "missingKo";
  saveCount = 0;
  syncCalls = [];
  await window.regenerateSceneOverviewPrompt(0);

  assert.strictEqual(
    elements.get("scene_overview_0_en").value,
    "/* Scene 1 */ new overview prompt en",
  );
  assert.strictEqual(
    elements.get("scene_overview_0_ko").value,
    "번역: /* Scene 1 */ new overview prompt en",
  );
  assert.strictEqual(saveCount, 1);
  assert.deepStrictEqual(syncCalls, [{ sceneIndex: 0, sourceLang: "en" }]);

  window.getGeminiApiKey = function noGeminiKeyStub() {
    return "";
  };
  syncCalls = [];
  await window.regenerateSceneOverviewPrompt(0);

  assert.ok(
    elements
      .get("scene_overview_0_en")
      .value.includes("lonely street at night"),
  );
  assert.ok(
    elements.get("scene_overview_0_en").value.includes("photorealistic"),
  );
  assert.deepStrictEqual(syncCalls, [{ sceneIndex: 0, sourceLang: "en" }]);

  const previousEn = elements.get("scene_overview_0_en").value;
  const previousKo = elements.get("scene_overview_0_ko").value;
  window.getGeminiApiKey = function geminiKeyAgainStub() {
    return "AIza-test-key";
  };
  fetchMode = "failure";
  const toastCountBeforeFailure = toasts.length;

  await window.regenerateSceneOverviewPrompt(0);

  assert.strictEqual(elements.get("scene_overview_0_en").value, previousEn);
  assert.strictEqual(elements.get("scene_overview_0_ko").value, previousKo);
  assert.strictEqual(toasts.length, toastCountBeforeFailure);
  assert.ok(
    alerts.some((message) => message.includes("forced overview failure")),
  );

  fetchMode = "empty";
  alerts.length = 0;
  await window.regenerateSceneOverviewPrompt(0);

  assert.strictEqual(elements.get("scene_overview_0_en").value, previousEn);
  assert.ok(alerts.some((message) => message.includes("영어 프롬프트")));

  originalConsole.log("MV regenerate scene overview prompt smoke test: PASS");
})().catch((error) => {
  originalConsole.error(error);
  process.exit(1);
});
