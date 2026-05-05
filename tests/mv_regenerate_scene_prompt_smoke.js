const assert = require("assert");

const elements = new Map();
const alerts = [];
const toasts = [];
let fetchMode = "success";
let syncCalls = [];
const originalConsole = {
  error: console.error,
  log: console.log,
};

console.error = function errorStub() {};

function makeClassList(initial = []) {
  const set = new Set(initial);
  return {
    contains(name) {
      return set.has(name);
    },
    remove(name) {
      set.delete(name);
    },
  };
}

function addElement(id, value = "") {
  elements.set(id, {
    id,
    value,
    textContent: value,
    dataset: { originalHTML: '<i class="fas fa-copy"></i> 복사' },
    disabled: true,
    innerHTML: '<i class="fas fa-check"></i> 복사됨',
    classList: makeClassList(["copied"]),
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
global.fetch = async function fetchStub(url) {
  assert.ok(url.includes("gemini-2.5-flash"));

  if (fetchMode === "failure") {
    return {
      ok: false,
      status: 500,
      statusText: "Server Error",
      async json() {
        return { error: { message: "forced scene failure" } };
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
              parts: [{ text: fetchMode === "empty" ? "   " : "new AI scene prompt" }],
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
    scene: "lonely street at night",
    prompt: "old scene prompt",
    promptKo: "기존 씬 프롬프트",
  },
];
window.getGeminiApiKey = function getGeminiApiKeyStub() {
  return "AIza-test-key";
};
window.showCopyIndicator = function showCopyIndicatorStub(message) {
  toasts.push(message);
};

[
  ["finalLyrics", "[Verse] lonely street at night"],
  ["finalizedStylePrompt", "cinematic ballad"],
  ["scene_0_en", "old scene prompt"],
  ["scene_0_ko", "기존 씬 프롬프트"],
  ["copyScenePromptBtn_0", ""],
].forEach(([id, value]) => addElement(id, value));

require("../js/step6.js");

window.syncScenePromptTranslation = async function syncScenePromptTranslationStub(
  sceneIndex,
  sourceLang,
) {
  syncCalls.push({ sceneIndex, sourceLang });
  const enEl = document.getElementById(`scene_${sceneIndex}_en`);
  const koEl = document.getElementById(`scene_${sceneIndex}_ko`);
  koEl.value = `번역: ${enEl.value}`;
  window.currentScenes[sceneIndex].prompt = enEl.value;
  window.currentScenes[sceneIndex].promptKo = koEl.value;
};

(async () => {
  await window.regenerateScenePrompt(0);

  assert.strictEqual(elements.get("scene_0_en").value, "new AI scene prompt");
  assert.strictEqual(elements.get("scene_0_ko").value, "번역: new AI scene prompt");
  assert.deepStrictEqual(syncCalls, [{ sceneIndex: 0, sourceLang: "en" }]);
  assert.strictEqual(window.currentScenes[0].prompt, "new AI scene prompt");
  assert.ok(toasts.some((message) => message.includes("씬 1")));
  assert.strictEqual(elements.get("copyScenePromptBtn_0").disabled, false);
  assert.strictEqual(
    elements.get("copyScenePromptBtn_0").classList.contains("copied"),
    false,
  );

  window.getGeminiApiKey = function noGeminiKeyStub() {
    return "";
  };
  syncCalls = [];
  await window.regenerateScenePrompt(0);

  assert.ok(elements.get("scene_0_en").value.includes("lonely street at night"));
  assert.ok(elements.get("scene_0_en").value.includes("photorealistic"));
  assert.deepStrictEqual(syncCalls, [{ sceneIndex: 0, sourceLang: "en" }]);

  const previousEn = elements.get("scene_0_en").value;
  const previousKo = elements.get("scene_0_ko").value;
  window.getGeminiApiKey = function geminiKeyAgainStub() {
    return "AIza-test-key";
  };
  fetchMode = "failure";
  syncCalls = [];
  const toastCountBeforeFailure = toasts.length;

  await window.regenerateScenePrompt(0);

  assert.strictEqual(elements.get("scene_0_en").value, previousEn);
  assert.strictEqual(elements.get("scene_0_ko").value, previousKo);
  assert.deepStrictEqual(syncCalls, []);
  assert.strictEqual(toasts.length, toastCountBeforeFailure);
  assert.ok(alerts.some((message) => message.includes("forced scene failure")));

  fetchMode = "empty";
  alerts.length = 0;
  await window.regenerateScenePrompt(0);

  assert.strictEqual(elements.get("scene_0_en").value, previousEn);
  assert.ok(alerts.some((message) => message.includes("비어있습니다")));

  originalConsole.log("MV regenerate scene prompt smoke test: PASS");
})().catch((error) => {
  originalConsole.error(error);
  process.exit(1);
});
