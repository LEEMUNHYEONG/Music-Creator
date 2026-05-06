const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const originalConsole = { ...console };
const elements = new Map();
const store = new Map();
const tagGroups = new Map();
const sceneDescriptions = [
  { value: "수정된 첫 장면: 비 내리는 골목에서 보컬이 걷는다." },
  { value: "수정된 둘째 장면: 새벽 루프탑에서 후렴이 열린다." },
];
const completeScenePrompt1 =
  "rainy neon alley at blue hour, lonely vocalist with black bob hair wearing a long coat walking through reflective pavement, soft side light, slow dolly-in camera movement, cinematic motion, photorealistic detail, 16:9 aspect ratio, sharp focus, emotional music video frame";
const completeScenePrompt2 =
  "misty rooftop at sunrise, hopeful vocalist with black bob hair wearing a long coat looking toward the opening sky, warm rim light across the face, crane-up reveal from medium shot to wide city skyline, cinematic motion, photorealistic detail, 16:9 aspect ratio, sharp focus, emotional music video frame";
const calls = {
  indicators: [],
  alerts: [],
  confirms: [],
  loadProjectList: 0,
  renderedScenes: 0,
};

console.log = function logStub() {};
console.info = function infoStub() {};
console.error = function errorStub() {};
console.warn = function warnStub() {};

function makeClassList(initial = []) {
  const values = new Set(initial);
  return {
    add(name) {
      values.add(name);
    },
    remove(name) {
      values.delete(name);
    },
    toggle(name, force) {
      if (force === undefined) {
        if (values.has(name)) {
          values.delete(name);
          return false;
        }
        values.add(name);
        return true;
      }
      if (force) values.add(name);
      else values.delete(name);
      return !!force;
    },
    contains(name) {
      return values.has(name);
    },
  };
}

function parseElementsFromHtml(html) {
  const textareaRe = /<textarea\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/textarea>/g;
  let match;
  while ((match = textareaRe.exec(html))) {
    const [, id, textareaValue = ""] = match;
    if (!elements.has(id)) {
      addElement(id, textareaValue);
    } else {
      elements.get(id).value = textareaValue;
    }
  }

  const inputRe = /<input\b[^>]*\bid="([^"]+)"[^>]*>/g;
  while ((match = inputRe.exec(html))) {
    const [, id] = match;
    if (!elements.has(id)) addElement(id);
  }
}

function addElement(id, value = "") {
  const el = {
    id,
    value,
    textContent: value,
    innerText: value,
    style: {},
    dataset: {},
    disabled: false,
    scrollCount: 0,
    classList: makeClassList(id.includes("Section") ? ["hidden"] : []),
    scrollIntoView() {
      this.scrollCount += 1;
    },
    focus() {
      this.focused = true;
    },
    click() {
      this.clicked = true;
    },
    querySelectorAll() {
      return [];
    },
  };

  Object.defineProperty(el, "innerHTML", {
    get() {
      return this._innerHTML || "";
    },
    set(nextValue) {
      this._innerHTML = String(nextValue || "");
      parseElementsFromHtml(this._innerHTML);
    },
  });

  elements.set(id, el);
  return el;
}

function addTagGroup(selector, values, activeValues) {
  const active = new Set(activeValues);
  const group = values.map((value) => ({
    dataset: { value },
    getAttribute(name) {
      return name === "data-value" ? value : null;
    },
    classList: makeClassList(active.has(value) ? ["active"] : []),
  }));
  tagGroups.set(selector, group);
  return group;
}

global.window = global;
global.alert = function alertStub(message) {
  calls.alerts.push(message);
};
global.confirm = function confirmStub(message) {
  calls.confirms.push(message);
  return true;
};
global.localStorage = {
  getItem(key) {
    return store.has(key) ? store.get(key) : null;
  },
  setItem(key, value) {
    store.set(key, String(value));
  },
  removeItem(key) {
    store.delete(key);
  },
  key(index) {
    return Array.from(store.keys())[index] || null;
  },
  get length() {
    return store.size;
  },
};
global.requestAnimationFrame = function requestAnimationFrameStub(callback) {
  callback();
};
global.ResizeObserver = class ResizeObserverStub {
  observe() {}
  disconnect() {}
};
global.document = {
  readyState: "complete",
  addEventListener() {},
  createElement() {
    return addElement(`tmp_${Math.random().toString(36).slice(2)}`);
  },
  getElementById(id) {
    return elements.get(id) || null;
  },
  querySelector(selector) {
    if (selector === '.tab-btn[data-tab="marketing-mv"]') {
      return addElement("mvTabButton");
    }
    return null;
  },
  querySelectorAll(selector) {
    if (selector === ".scene-description") return sceneDescriptions;
    if (tagGroups.has(selector)) return tagGroups.get(selector);
    return [];
  },
};

[
  "globalSaveStatus",
  "saveStatusText",
  "songTitle",
  "finalTitleText",
  "marketingResult",
  "youtubeDesc",
  "tiktokDesc",
  "hashtagsContent",
  "thumbnailsGrid",
  "mvMinutes",
  "mvSeconds",
  "mvInterval",
  "mvImageCount",
  "mvIntervalDisplay",
  "mvTotalDuration",
  "mvEra",
  "mvCountry",
  "mvCharacterCount",
  "mvLighting",
  "mvCameraWork",
  "mvMood",
  "mvLocationCustom",
  "mvActionCustom",
  "mvCustomSettings",
  "mvThumbnailPromptEn",
  "mvThumbnailPromptKo",
  "review_thumbnail_en",
  "review_thumbnail_ko",
  "mvBackgroundDetailPromptEn",
  "mvBackgroundDetailPromptKo",
  "review_background_en",
  "review_background_ko",
  "mvCharacterDetailPromptEn",
  "mvCharacterDetailPromptKo",
  "review_character_en",
  "review_character_ko",
  "mvSceneOverviewSection",
  "mvResultsSection",
  "mvPromptsContainer",
  "mvSceneOverviewContainer",
  "mvPromptsReviewContainer",
  "mvTotalImages",
].forEach((id) => addElement(id));

["mvCharacter1_gender", "mvCharacter1_age", "mvCharacter1_race", "mvCharacter1_appearance", "mvCharacter1_artStyle", "mvCharacter1_sheet"].forEach((id) =>
  addElement(id),
);

for (let i = 0; i < 2; i += 1) {
  [
    `scene_time_start_${i}`,
    `scene_time_end_${i}`,
    `scene_lyrics_${i}`,
    `scene_location_${i}`,
    `scene_emotion_${i}`,
    `scene_mood_${i}`,
    `scene_lighting_${i}`,
    `scene_camera_work_${i}`,
    `scene_overview_${i}_en`,
    `scene_overview_${i}_ko`,
    `scene_editor_notice_${i}`,
    `scene_editor_summary_${i}`,
  ].forEach((id) => addElement(id));
}

document.getElementById("songTitle").value = "사용자 흐름 MV 테스트";
document.getElementById("finalTitleText").textContent = "사용자 흐름 MV 테스트";
document.getElementById("youtubeDesc").textContent = "최종 유튜브 설명";
document.getElementById("tiktokDesc").textContent = "최종 틱톡 설명";
document.getElementById("hashtagsContent").textContent = "#musicvideo #workflow";
document.getElementById("mvMinutes").value = "3";
document.getElementById("mvSeconds").value = "20";
document.getElementById("mvInterval").value = "8";
document.getElementById("mvEra").value = "modern";
document.getElementById("mvCountry").value = "korea";
document.getElementById("mvCharacterCount").value = "1";
document.getElementById("mvLighting").value = "soft blue-hour light";
document.getElementById("mvCameraWork").value = "slow dolly-in";
document.getElementById("mvMood").value = "hopeful";
document.getElementById("mvLocationCustom").value = "서울 골목, 새벽 루프탑";
document.getElementById("mvActionCustom").value = "천천히 걷기, 하늘 보기";
document.getElementById("mvCustomSettings").value = "주인공 의상과 색감을 모든 씬에서 유지";
document.getElementById("mvCharacter1_gender").value = "female";
document.getElementById("mvCharacter1_age").value = "20s";
document.getElementById("mvCharacter1_race").value = "asian";
document.getElementById("mvCharacter1_appearance").value = "black bob hair, long coat";
document.getElementById("mvCharacter1_artStyle").value = "photorealistic";
document.getElementById("mvCharacter1_sheet").value = "consistent heroine sheet";
document.getElementById("review_thumbnail_en").value = "final thumbnail prompt en";
document.getElementById("review_thumbnail_ko").value = "최종 썸네일 프롬프트";
document.getElementById("review_background_en").value = "final background prompt en";
document.getElementById("review_background_ko").value = "최종 배경 프롬프트";
document.getElementById("review_character_en").value = "final character prompt en";
document.getElementById("review_character_ko").value = "최종 인물 프롬프트";

document.getElementById("scene_time_start_0").value = "0:00";
document.getElementById("scene_time_end_0").value = "0:08";
document.getElementById("scene_lyrics_0").value = "blue rain keeps falling";
document.getElementById("scene_location_0").value = "rainy neon alley";
document.getElementById("scene_emotion_0").value = "lonely";
document.getElementById("scene_mood_0").value = "quiet negative space";
document.getElementById("scene_lighting_0").value = "blue-hour side light";
document.getElementById("scene_camera_work_0").value = "slow dolly-in";
document.getElementById("scene_overview_0_en").value = completeScenePrompt1;
document.getElementById("scene_overview_0_ko").value = "수정된 씬 1 프롬프트";
document.getElementById("scene_time_start_1").value = "0:08";
document.getElementById("scene_time_end_1").value = "0:18";
document.getElementById("scene_lyrics_1").value = "morning opens above us";
document.getElementById("scene_location_1").value = "misty rooftop";
document.getElementById("scene_emotion_1").value = "hopeful";
document.getElementById("scene_mood_1").value = "wide sunrise release";
document.getElementById("scene_lighting_1").value = "warm rim light";
document.getElementById("scene_camera_work_1").value = "crane-up reveal";
document.getElementById("scene_overview_1_en").value = completeScenePrompt2;
document.getElementById("scene_overview_1_ko").value = "수정된 씬 2 프롬프트";

addTagGroup("#mvLocationTags .tag-btn", ["city", "rain", "rooftop"], ["city", "rain"]);
addTagGroup("#mvActionTags .tag-btn", ["walking", "looking-up"], ["walking"]);

window.currentProjectId = "proj_mv_user_flow";
window.currentStep = 6;
window.currentProject = {
  id: window.currentProjectId,
  title: "사용자 흐름 MV 테스트",
  createdAt: "2026-05-06T00:00:00.000Z",
  data: { marketing: {} },
};
window.currentScenes = [
  {
    time: "0:00-0:08",
    scene: "초기 첫 장면",
    lyrics: "blue rain",
    location: "old alley",
    emotion: "lonely",
    mood: "quiet",
    lighting: "blue",
    cameraWork: "dolly",
    prompt: "initial scene 1 prompt",
    promptKo: "초기 씬 1",
  },
  {
    time: "0:08-0:18",
    scene: "초기 둘째 장면",
    lyrics: "morning",
    location: "old rooftop",
    emotion: "hopeful",
    mood: "wide",
    lighting: "warm",
    cameraWork: "crane",
    prompt: "initial scene 2 prompt",
    promptKo: "초기 씬 2",
  },
];

window.loadProjectList = function loadProjectListStub() {
  calls.loadProjectList += 1;
};
window.showCopyIndicator = function showCopyIndicatorStub(message) {
  calls.indicators.push(message);
};
window.translateEnglishToKoreanForScene = async function translateStub(_field, text) {
  return `자동 번역: ${text}`;
};
window.getMVLocationValues = function getMVLocationValuesStub() {
  return ["city", "rain"];
};
window.getMVLocationEnString = function getMVLocationEnStringStub() {
  return "city, rain";
};
window.getSelectedTags = function getSelectedTagsStub(id) {
  if (id === "mvLocationTags") return ["city", "rain"];
  if (id === "mvActionTags") return ["walking"];
  return [];
};

require("../js/storage.js");
require("../js/step6.js");

const originalRenderSceneOverview = window.renderSceneOverview;
window.renderSceneOverview = function renderSceneOverviewSpy(scenes) {
  calls.renderedScenes += 1;
  return originalRenderSceneOverview(scenes);
};

(async () => {
  await window.saveAndConfirmMVPrompts();

  assert.strictEqual(calls.confirms.length, 0, "complete scenes should not need a review confirm");
  assert.ok(calls.indicators.some((message) => message.includes("저장")));
  assert.strictEqual(document.getElementById("marketingResult").style.display, "block");
  assert.strictEqual(document.getElementById("mvResultsSection").style.display, "block");
  assert.strictEqual(document.getElementById("mvSceneOverviewSection").style.display, "none");
  assert.strictEqual(document.getElementById("mvTotalImages").textContent, 2);
  assert.strictEqual(window.currentScenes[0].scene, sceneDescriptions[0].value);
  assert.strictEqual(window.currentScenes[0].time, "0:00-0:08");
  assert.strictEqual(window.currentScenes[0].startSeconds, 0);
  assert.strictEqual(window.currentScenes[0].endSeconds, 8);
  assert.strictEqual(window.currentScenes[0].location, "rainy neon alley");
  assert.strictEqual(window.currentScenes[0].prompt, completeScenePrompt1);

  const savedProjects = JSON.parse(localStorage.getItem("musicCreatorProjects"));
  assert.strictEqual(savedProjects.length, 1);
  const savedMarketing = savedProjects[0].data.marketing;
  assert.ok(savedMarketing.mv, "save flow should write normalized marketing.mv");
  assert.strictEqual(savedMarketing.mv.settings.mood, "hopeful");
  assert.strictEqual(savedMarketing.mv.settings.characterCount, "1");
  assert.deepStrictEqual(savedMarketing.mv.settings.locationTags, ["city", "rain"]);
  assert.strictEqual(savedMarketing.mv.prompts.thumbnail.en, "final thumbnail prompt en");
  assert.strictEqual(savedMarketing.mv.prompts.background.ko, "최종 배경 프롬프트");
  assert.strictEqual(savedMarketing.mv.scenes.length, 2);
  assert.strictEqual(savedMarketing.mv.scenes[0].scene, sceneDescriptions[0].value);
  assert.strictEqual(savedMarketing.mv.scenes[0].id, "scene-1");
  assert.strictEqual(savedMarketing.mvScenes[1].promptKo, "수정된 씬 2 프롬프트");
  assert.strictEqual(calls.loadProjectList >= 1, true);

  const appSource = fs.readFileSync(path.resolve(__dirname, "../app.js"), "utf8");
  const start = appSource.indexOf("function setMVRestoreValue(id, val) {");
  const end = appSource.indexOf("window.saveAndClose = function ()", start);
  assert.ok(start !== -1, "restoreStepData should exist in app.js");
  assert.ok(end !== -1, "restoreStepData slice should end before saveAndClose");
  vm.runInThisContext(appSource.slice(start, end), {
    filename: "app.js.restore-step-data-slice",
  });

  window.currentProject = JSON.parse(JSON.stringify(savedProjects[0]));
  window.currentProjectId = savedProjects[0].id;
  document.getElementById("mvMinutes").value = "";
  document.getElementById("mvMood").value = "";
  document.getElementById("review_thumbnail_en").value = "";
  window.currentScenes = [];
  window.restoreStepData(6);

  assert.strictEqual(document.getElementById("mvMinutes").value, "3");
  assert.strictEqual(document.getElementById("mvMood").value, "hopeful");
  assert.strictEqual(
    document.getElementById("mvThumbnailPromptEn").value,
    "final thumbnail prompt en",
  );
  assert.strictEqual(window.currentScenes.length, 2);
  assert.strictEqual(window.currentScenes[1].scene, sceneDescriptions[1].value);
  assert.strictEqual(document.getElementById("mvResultsSection").style.display, "block");
  assert.strictEqual(document.getElementById("mvSceneOverviewSection").style.display, "none");
  assert.ok(calls.renderedScenes >= 1);

  originalConsole.log("MV user flow integration smoke test: PASS");
  process.exit(0);
})().catch((error) => {
  originalConsole.error(error);
  process.exit(1);
});
