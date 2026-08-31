const assert = require("assert");

const elements = new Map();
let translationCalls = [];
const alerts = [];
const confirms = [];
const originalConsole = {
  error: console.error,
  log: console.log,
};

console.log = function logStub() {};

function makeClassList(initial = []) {
  const set = new Set(initial);
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
  };
}

function parseTextareasFromHtml(html) {
  const re = /<textarea\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/textarea>/g;
  let match;
  while ((match = re.exec(html))) {
    const [, id, value] = match;
    elements.set(id, {
      id,
      value,
      textContent: value,
      style: {},
      classList: makeClassList(),
    });
  }
}

function addElement(id, value = "") {
  const element = {
    id,
    value,
    textContent: value,
    style: {},
    scrollCount: 0,
    classList: makeClassList(id === "mvResultsSection" ? ["hidden"] : []),
    scrollIntoView() {
      this.scrollCount += 1;
    },
  };

  Object.defineProperty(element, "innerHTML", {
    get() {
      return this._innerHTML || "";
    },
    set(value) {
      this._innerHTML = value;
      parseTextareasFromHtml(value);
    },
  });

  elements.set(id, element);
  return element;
}

global.window = global;
global.document = {
  readyState: "loading",
  addEventListener() {},
  querySelectorAll(selector) {
    if (selector === ".scene-description") {
      return [
        { value: "수정된 첫 번째 장면" },
        { value: "수정된 두 번째 장면" },
      ];
    }
    return [];
  },
  querySelector() {
    return null;
  },
  getElementById(id) {
    return elements.get(id) || null;
  },
};
global.alert = function alertStub(message) {
  alerts.push(message);
};
global.confirm = function confirmStub(message) {
  confirms.push(message);
  return false;
};
// showAndConfirmMVPrompts 등은 window.confirm() 대신 비차단 커스텀 모달
// (window.showConfirmAsync)을 사용하므로 동일하게 스텁한다.
window.showConfirmAsync = function showConfirmAsyncStub(message) {
  confirms.push(message);
  return Promise.resolve(false);
};
global.requestAnimationFrame = function requestAnimationFrameStub(callback) {
  callback();
};
window.addEventListener = function addEventListenerStub() {};
window.scrollTo = function scrollToStub() {};
global.ResizeObserver = class ResizeObserverStub {
  observe() {}
  disconnect() {}
};
global.localStorage = {
  getItem() {
    return null;
  },
  setItem() {},
  removeItem() {},
};

[
  "mvSceneOverviewSection",
  "mvResultsSection",
  "mvTotalImages",
  "mvPromptsContainer",
  "mvEra",
  "mvCountry",
  "mvCharacterCount",
  "mvCustomSettings",
  "mvLighting",
  "mvCameraWork",
  "mvMood",
].forEach((id) => addElement(id));

elements.get("mvCharacterCount").value = "1";
addElement("mvCharacter1_gender", "female");
addElement("mvCharacter1_appearance", "black coat");

global.translateEnglishToKoreanForScene = async function translateEnToKo(
  field,
  text,
) {
  translationCalls.push({ field, text });
  return `자동 번역: ${text}`;
};

require("../test-results/mv_modules.compat.js");

window.getMVLocationValues = function getMVLocationValuesStub() {
  return ["city"];
};
window.getMVLocationEnString = function getMVLocationEnStringStub() {
  return "neon alley";
};
window.currentScenes = [
  {
    time: "00:00-00:10",
    scene: "첫 번째 장면",
    prompt: "existing scene one prompt",
    promptKo: "기존 한글 프롬프트",
  },
  {
    time: "00:10-00:20",
    scene: "두 번째 장면",
    prompt: "existing scene two prompt",
    promptKo: "",
  },
];
window.currentProject = { data: { marketing: {} } };

addElement("scene_overview_0_en", "overview scene one en");
addElement("scene_overview_0_ko", "개요 씬 1 한글");
addElement("scene_overview_1_en", "overview scene two en");
addElement("scene_overview_1_ko", "개요 씬 2 한글");
addElement("scene_time_start_0", "0:02");
addElement("scene_time_end_0", "0:12");
addElement("scene_lyrics_0", "수정된 첫 번째 가사 구간");
addElement("scene_location_0", "sunrise rooftop");
addElement("scene_emotion_0", "hopeful");
addElement("scene_mood_0", "warm horizon");
addElement("scene_lighting_0", "golden backlight");
addElement("scene_camera_work_0", "slow crane-up");
addElement("scene_time_start_1", "0:12");
addElement("scene_time_end_1", "0:22");
addElement("scene_lyrics_1", "수정된 두 번째 가사 구간");
addElement("scene_location_1", "rainy alley");
addElement("scene_emotion_1", "lonely");
addElement("scene_mood_1", "quiet negative space");
addElement("scene_lighting_1", "blue-hour side light");
addElement("scene_camera_work_1", "slow dolly-in");

(async () => {
  window.saveSceneOverview();

  assert.strictEqual(window.currentScenes[0].scene, "수정된 첫 번째 장면");
  assert.strictEqual(window.currentScenes[1].scene, "수정된 두 번째 장면");
  assert.strictEqual(window.currentScenes[0].prompt, "overview scene one en");
  assert.strictEqual(window.currentScenes[0].promptKo, "개요 씬 1 한글");
  assert.strictEqual(window.currentScenes[0].time, "0:02-0:12");
  assert.strictEqual(window.currentScenes[0].startSeconds, 2);
  assert.strictEqual(window.currentScenes[0].endSeconds, 12);
  assert.strictEqual(window.currentScenes[0].durationSeconds, 10);
  assert.strictEqual(window.currentScenes[0].lyrics, "수정된 첫 번째 가사 구간");
  assert.strictEqual(window.currentScenes[0].location, "sunrise rooftop");
  assert.strictEqual(window.currentScenes[0].emotion, "hopeful");
  assert.strictEqual(window.currentScenes[0].mood, "warm horizon");
  assert.strictEqual(window.currentScenes[0].lighting, "golden backlight");
  assert.strictEqual(window.currentScenes[0].cameraWork, "slow crane-up");
  assert.strictEqual(window.currentScenes[1].prompt, "overview scene two en");
  assert.strictEqual(window.currentScenes[1].promptKo, "개요 씬 2 한글");
  assert.strictEqual(window.currentScenes[1].time, "0:12-0:22");
  assert.strictEqual(window.currentScenes[1].lyrics, "수정된 두 번째 가사 구간");
  assert.strictEqual(window.currentScenes[1].location, "rainy alley");
  assert.strictEqual(window.currentScenes[1].emotion, "lonely");
  assert.strictEqual(window.currentScenes[1].mood, "quiet negative space");
  assert.strictEqual(window.currentScenes[1].lighting, "blue-hour side light");
  assert.strictEqual(window.currentScenes[1].cameraWork, "slow dolly-in");
  assert.ok(alerts.some((message) => message.includes("씬 개요가 저장")));

  await window.confirmSceneOverviewAndGenerate(true);
  await new Promise((resolve) => setImmediate(resolve));

  const results = elements.get("mvResultsSection");
  const overview = elements.get("mvSceneOverviewSection");
  const container = elements.get("mvPromptsContainer");

  assert.strictEqual(results.style.display, "block");
  assert.strictEqual(results.classList.contains("hidden"), false);
  assert.strictEqual(results.scrollCount, 0);
  assert.strictEqual(overview.style.display, "none");
  assert.strictEqual(overview.classList.contains("hidden"), true);
  assert.strictEqual(elements.get("mvTotalImages").textContent, 2);

  assert.ok(container.innerHTML.includes("regenerateScenePrompt(0)"));
  assert.ok(container.innerHTML.includes("saveScenePrompt(1)"));
  assert.ok(container.innerHTML.includes("mv-scene-timeline-preview"));
  assert.ok(container.innerHTML.includes("씬 타임라인"));
  assert.strictEqual(elements.get("scene_0_en").value, "overview scene one en");
  assert.strictEqual(elements.get("scene_0_ko").value, "개요 씬 1 한글");
  assert.strictEqual(elements.get("scene_1_en").value, "overview scene two en");
  assert.strictEqual(
    elements.get("scene_1_ko").value,
    "개요 씬 2 한글",
  );
  assert.deepStrictEqual(translationCalls, []);
  assert.strictEqual(
    window.currentProject.data.marketing.mvScenes,
    window.currentScenes,
  );

  const originalConfirmSceneOverviewAndGenerate =
    window.confirmSceneOverviewAndGenerate;
  let confirmGenerateCalls = 0;
  window.confirmSceneOverviewAndGenerate = async function confirmGenerateStub() {
    confirmGenerateCalls += 1;
  };
  window.currentScenes = [
    {
      time: "0:30-0:20",
      scene: "확인 필요 장면",
      prompt: "watermark abandoned abandoned abandoned abandoned abandoned",
      promptKo: "한글 프롬프트",
    },
  ];
  elements.set("scene_time_start_0", { value: "0:30" });
  elements.set("scene_time_end_0", { value: "0:20" });
  elements.set("scene_lyrics_0", { value: "" });
  elements.set("scene_location_0", { value: "" });
  elements.set("scene_emotion_0", { value: "" });
  elements.set("scene_mood_0", { value: "" });
  elements.set("scene_lighting_0", { value: "" });
  elements.set("scene_camera_work_0", { value: "" });
  elements.set("scene_overview_0_en", {
    value: "watermark abandoned abandoned abandoned abandoned abandoned",
  });
  elements.set("scene_overview_0_ko", { value: "한글 프롬프트" });
  await window.saveAndConfirmMVPrompts();
  assert.ok(confirms.some((message) => message.includes("확인 필요 항목")));
  assert.ok(confirms.some((message) => message.includes("장소 없음")));
  assert.ok(confirms.some((message) => message.includes("카메라 없음")));
  assert.ok(confirms.some((message) => message.includes("프롬프트 길이 확인")));
  assert.ok(confirms.some((message) => message.includes("금지어")));
  assert.ok(confirms.some((message) => message.includes("중복 표현")));
  assert.ok(
    confirms.some((message) =>
      message.includes("취소하면 첫 확인 필요 씬으로 이동"),
    ),
  );
  assert.strictEqual(confirmGenerateCalls, 0);
  window.confirmSceneOverviewAndGenerate = originalConfirmSceneOverviewAndGenerate;

  originalConsole.log("MV confirm scene overview smoke test: PASS");
})().catch((error) => {
  originalConsole.error(error);
  process.exit(1);
});
