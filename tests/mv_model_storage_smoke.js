const assert = require("assert");

const originalConsole = { ...console };
const store = new Map();
const elements = new Map();
let diagnosticsLog = null;

console.log = function logStub() {};
console.info = function infoStub(label, payload) {
  if (label === "MV marketing.mv diagnostics:") {
    diagnosticsLog = payload;
  }
};

function addElement(id, value = "") {
  const el = {
    id,
    value,
    textContent: value,
    innerText: value,
    innerHTML: value,
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() {
        return false;
      },
    },
    style: {},
    querySelectorAll() {
      return [];
    },
  };
  elements.set(id, el);
  return el;
}

function addTagContainer(id, values) {
  const tags = values.map((value) => ({
    getAttribute(name) {
      return name === "data-value" ? value : null;
    },
  }));
  const el = addElement(id);
  el.querySelectorAll = function querySelectorAll(selector) {
    return selector === ".tag-btn.active" ? tags : [];
  };
  return el;
}

global.window = global;
global.alert = function alertStub(message) {
  throw new Error(`Unexpected alert: ${message}`);
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
global.document = {
  getElementById(id) {
    return elements.get(id) || null;
  },
  querySelector() {
    return null;
  },
  querySelectorAll() {
    return [];
  },
  createElement() {
    return addElement(`tmp_${Math.random().toString(36).slice(2)}`);
  },
};

window.currentProjectId = "proj_mv_smoke";
window.currentProject = {
  id: "proj_mv_smoke",
  title: "기존 프로젝트",
  createdAt: "2026-05-06T00:00:00.000Z",
  data: {
    marketing: {
      mvSettings: { minutes: "2" },
      mvPrompts: { thumbnail: { en: "old thumb", ko: "기존 썸네일" } },
      mvScenes: [{ scene: "old scene", prompt: "old prompt" }],
      mv: {
        scenes: [{ scene: "stale canonical scene", prompt: "stale canonical prompt" }],
      },
    },
  },
};
window.currentStep = 6;
window.currentScenes = [
  {
    scene: "비 오는 골목",
    prompt: "rainy alley cinematic still",
    promptKo: "비 오는 골목의 시네마틱 장면",
  },
];
window.getSelectedTags = function getSelectedTags(id) {
  if (id === "mvLocationTags") return ["city", "rain"];
  if (id === "mvActionTags") return ["walking"];
  return [];
};
window.loadProjectList = function noop() {};
window.updateSaveStatusUI = function noop() {};

addElement("songTitle", "MV 테스트 곡");
addElement("finalTitleText", "MV 테스트 곡");
addElement("youtubeDesc", "유튜브 설명");
addElement("tiktokDesc", "틱톡 설명");
addElement("hashtagsContent", "#mv #test");
addElement("mvMinutes", "3");
addElement("mvSeconds", "12");
addElement("mvInterval", "6");
addElement("mvEra", "modern");
addElement("mvCountry", "korea");
addElement("mvMood", "dreamy");
addElement("mvLighting", "soft");
addElement("mvCameraWork", "slow-dolly");
addElement("mvCharacterCount", "1");
addElement("mvCustomSettings", "consistent character");
addElement("mvLocationCustom", "오래된 골목");
addElement("mvActionCustom", "천천히 걷기");
addTagContainer("mvLocationTags", ["city", "rain"]);
addElement("mvCharacter1_gender", "female");
addElement("mvCharacter1_age", "20s");
addElement("mvCharacter1_race", "asian");
addElement("mvCharacter1_appearance", "black bob hair");
addElement("mvCharacter1_artStyle", "photorealistic");
addElement("mvCharacter1_sheet", "character sheet text");
addElement("review_thumbnail_en", "thumbnail prompt en");
addElement("review_thumbnail_ko", "썸네일 프롬프트");
addElement("review_background_en", "background prompt en");
addElement("review_background_ko", "배경 프롬프트");
addElement("review_character_en", "character prompt en");
addElement("review_character_ko", "인물 프롬프트");

require("../js/storage.js");

const saved = window.saveCurrentProject();
assert.strictEqual(saved, true);

const projects = JSON.parse(localStorage.getItem("musicCreatorProjects"));
assert.strictEqual(projects.length, 1);

const marketing = projects[0].data.marketing;
assert.ok(marketing.mv, "marketing.mv should be created");
assert.strictEqual(marketing.mv.schemaVersion, 1);
assert.strictEqual(marketing.mv.settings.minutes, "3");
assert.deepStrictEqual(marketing.mv.settings.locationTags, ["city", "rain"]);
assert.strictEqual(marketing.mv.prompts.thumbnail.en, "thumbnail prompt en");
assert.strictEqual(marketing.mv.prompts.background.ko, "배경 프롬프트");
assert.strictEqual(marketing.mv.prompts.character.en, "character prompt en");
assert.strictEqual(marketing.mv.scenes.length, 1);
assert.strictEqual(marketing.mv.scenes[0].scene, "비 오는 골목");
assert.strictEqual(marketing.mv.scenes[0].id, "scene-1");
assert.strictEqual(marketing.mv.scenes[0].index, 0);
assert.strictEqual(marketing.mv.scenes[0].sceneNumber, 1);

assert.strictEqual(marketing.mvSettings.minutes, "3");
assert.strictEqual(marketing.mvPrompts.thumbnail.en, "thumbnail prompt en");
assert.strictEqual(marketing.mvScenes[0].prompt, "rainy alley cinematic still");
assert.strictEqual(marketing.mv.scenes[0].prompt, "rainy alley cinematic still");
assert.notStrictEqual(marketing.mv.scenes[0].prompt, "stale canonical prompt");
assert.ok(diagnosticsLog, "save should log MV diagnostics before persistence");
assert.strictEqual(diagnosticsLog.context, "pre-save");
assert.strictEqual(diagnosticsLog.sceneCount, 1);
assert.strictEqual(diagnosticsLog.canonicalSceneCount, 1);
assert.strictEqual(diagnosticsLog.legacySceneCount, 1);
assert.deepStrictEqual(diagnosticsLog.issues, []);

originalConsole.log("MV storage smoke test: PASS");
process.exit(0);
