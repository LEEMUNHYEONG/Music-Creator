const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const originalConsole = { ...console };
const store = new Map();
const elements = new Map();

console.log = function logStub() {};
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
    contains(name) {
      return values.has(name);
    },
  };
}

function addElement(id, value = "") {
  const el = {
    id,
    value,
    textContent: "",
    dataset: {},
    innerHTML: "",
    style: {},
    classList: makeClassList(),
    querySelectorAll() {
      return [];
    },
  };
  elements.set(id, el);
  return el;
}

function addTagContainer(id, values) {
  const tags = values.map((value) => ({
    value,
    classList: makeClassList(),
    getAttribute(name) {
      return name === "data-value" ? value : null;
    },
  }));
  const el = addElement(id);
  el.querySelectorAll = function querySelectorAll(selector) {
    if (selector === ".tag-btn") return tags;
    if (selector === ".tag-btn.active") {
      return tags.filter((tag) => tag.classList.contains("active"));
    }
    return [];
  };
  el.tags = tags;
  return el;
}

global.window = global;
global.escapeMVTextarea = function escapeMVTextareaStub(value) {
  return String(value || "");
};
global.localStorage = {
  getItem(key) {
    return store.has(key) ? store.get(key) : null;
  },
  setItem(key, value) {
    store.set(key, String(value));
  },
};
global.alert = function alertStub(message) {
  throw new Error(`Unexpected alert: ${message}`);
};
global.document = {
  getElementById(id) {
    return elements.get(id) || null;
  },
};

const step6Source = fs.readFileSync(path.resolve(__dirname, "../test-results/mv_modules.compat.js"), "utf8");
const start = step6Source.indexOf("window.updateMVImageCount = function () {");
const end = step6Source.indexOf("// --- Extracted generateSRTPreview ---", start);
assert.ok(start !== -1, "updateMVImageCount should exist in js/step6.js");
assert.ok(end !== -1, "generateSRTPreview marker should follow MV settings functions");
vm.runInThisContext(step6Source.slice(start, end), {
  filename: "js/step6.js.mv-settings-slice",
});

addElement("mvMinutes", "4");
addElement("mvSeconds", "10");
addElement("mvInterval", "5");
addElement("mvImageCount");
addElement("mvIntervalDisplay");
addElement("mvTotalDuration");
addElement("mvWorkflowSummary");
addElement("mvWorkflowSummaryTitle");
addElement("mvWorkflowSummaryText");
addElement("mvWorkflowSummaryBadges");
addElement("mvWorkflowSummaryActions");
addElement("mvSettingsPresetSelect");
addElement("mvSettingsPresetStatus");
addElement("mvSettingComboRecommendations");
addElement("mvSettingComboStatus");
addElement("mvEra", "modern");
addElement("mvCountry", "korea");
addElement("mvCharacterCount", "2");
addElement("mvCustomSettings", "consistent outfit");
addElement("mvLighting", "neon");
addElement("mvCameraWork", "slow-dolly");
addElement("mvMood", "dreamy");
addElement("mvCharacter1_gender", "female");
addElement("mvCharacter1_age", "20s");
addElement("mvCharacter1_race", "asian");
addElement("mvCharacter1_appearance", "black bob hair");
addElement("mvCharacter1_artStyle", "photorealistic");
addElement("mvCharacter1_sheet", "character sheet one");
addElement("mvCharacter2_gender", "male");
addElement("mvCharacter2_age", "30s");
addElement("mvCharacter2_race", "latino");
addElement("mvCharacter2_appearance", "silver jacket");
addElement("mvCharacter2_artStyle", "cinematic");
addElement("mvCharacter2_sheet", "character sheet two");
addElement("mvLocationCustom", "서울 골목");
addElement("mvActionCustom", "창밖 바라보기");
const tagContainer = addTagContainer("mvLocationTags", [
  "city",
  "forest",
  "studio",
  "urban-night",
  "street",
  "alley",
  "rain",
]);
const actionTagContainer = addTagContainer("mvActionTags", [
  "walking",
  "running",
  "looking-away",
  "close-up-face",
]);

window.getMVLocationValues = function getMVLocationValuesStub() {
  const selected = window.getMVTagValues("mvLocationTags");
  return selected.length > 0 ? selected : ["city", "studio"];
};

let saveCount = 0;
let toastMessage = "";
window.currentProject = { data: { marketing: {} } };
window.saveCurrentProject = function saveCurrentProjectStub() {
  saveCount += 1;
  return true;
};
window.showCopyIndicator = function showCopyIndicatorStub(message) {
  toastMessage = message;
};

window.updateMVImageCount();
assert.strictEqual(document.getElementById("mvImageCount").textContent, 50);
assert.strictEqual(document.getElementById("mvIntervalDisplay").textContent, 5);
assert.strictEqual(document.getElementById("mvTotalDuration").textContent, "4:10");
assert.strictEqual(document.getElementById("mvWorkflowSummary").dataset.state, "settings");
assert.strictEqual(document.getElementById("mvWorkflowSummary").dataset.primaryAction, "generate");
assert.ok(document.getElementById("mvWorkflowSummaryText").textContent.includes("MV 프롬프트"));
assert.ok(document.getElementById("mvWorkflowSummaryBadges").innerHTML.includes("50장 예상"));
assert.ok(document.getElementById("mvWorkflowSummaryActions").innerHTML.includes("프롬프트 생성"));

window.currentScenes = [{ prompt: "scene one" }, { prompt: "scene two" }];
addElement("mvResultsSection").style.display = "block";
addElement("mvSceneOverviewSection").classList.add("hidden");
window.updateMVWorkflowSummary();
assert.strictEqual(document.getElementById("mvWorkflowSummary").dataset.state, "ready");
assert.strictEqual(document.getElementById("mvWorkflowSummary").dataset.primaryAction, "copy-image");
assert.strictEqual(document.getElementById("mvWorkflowSummary").dataset.secondaryAction, "copy-table");
assert.ok(document.getElementById("mvWorkflowSummaryText").textContent.includes("복사"));
assert.ok(document.getElementById("mvWorkflowSummaryBadges").innerHTML.includes("2씬 생성"));
assert.ok(document.getElementById("mvWorkflowSummaryActions").innerHTML.includes("이미지 번들 복사"));

document.getElementById("mvResultsSection").style.display = "none";
document.getElementById("mvResultsSection").classList.add("hidden");
elements.get("mvSceneOverviewSection").classList = makeClassList();
document.getElementById("mvSceneOverviewSection").style.display = "block";
window.updateMVWorkflowSummary();
assert.strictEqual(document.getElementById("mvWorkflowSummary").dataset.state, "review");
assert.strictEqual(document.getElementById("mvWorkflowSummary").dataset.primaryAction, "confirm");
assert.ok(document.getElementById("mvWorkflowSummaryActions").innerHTML.includes("전체 저장"));

window.saveMVSettings();
const savedSettings = JSON.parse(localStorage.getItem("mvSettings"));
assert.deepStrictEqual(savedSettings.location, ["city", "studio"]);
assert.deepStrictEqual(savedSettings.locationTags, ["city", "studio"]);
assert.strictEqual(savedSettings.locationCustom, "서울 골목");
assert.strictEqual(savedSettings.actionCustom, "창밖 바라보기");
assert.strictEqual(savedSettings.characters.length, 2);
assert.strictEqual(savedSettings.characters[0].characterSheet, "character sheet one");
assert.strictEqual(window.currentProject.data.marketing.mvSettings.mood, "dreamy");
assert.strictEqual(saveCount, 1);

global.prompt = function promptStub() {
  return "드리미 도시 프리셋";
};
global.confirm = function confirmStub() {
  return true;
};
window.saveCurrentMVSettingsPreset();
const presets = JSON.parse(localStorage.getItem("mvSettingsPresets"));
assert.strictEqual(presets.length, 1);
assert.strictEqual(presets[0].name, "드리미 도시 프리셋");
assert.strictEqual(presets[0].settings.mood, "dreamy");
assert.strictEqual(window.currentProject.data.marketing.mvSettingPresets.length, 1);
assert.ok(document.getElementById("mvSettingsPresetSelect").innerHTML.includes("드리미 도시 프리셋"));
assert.ok(toastMessage.includes("프리셋"));

document.getElementById("mvSettingsPresetSelect").value = presets[0].id;
document.getElementById("mvMood").value = "intense";
document.getElementById("mvMinutes").value = "1";
window.applySelectedMVSettingsPreset();
assert.strictEqual(document.getElementById("mvMood").value, "dreamy");
assert.strictEqual(document.getElementById("mvMinutes").value, "4");
assert.ok(toastMessage.includes("적용"));

window.deleteSelectedMVSettingsPreset();
assert.strictEqual(JSON.parse(localStorage.getItem("mvSettingsPresets")).length, 0);

window.renderMVSettingComboRecommendations();
assert.ok(
  document.getElementById("mvSettingComboRecommendations").innerHTML.includes(
    "빗속 도시 감성",
  ),
);
window.applyMVSettingCombo("rainy-city");
assert.strictEqual(document.getElementById("mvLighting").value, "neon");
assert.strictEqual(document.getElementById("mvCameraWork").value, "dolly");
assert.strictEqual(document.getElementById("mvMood").value, "melancholic");
assert.ok(document.getElementById("mvSettingComboStatus").textContent.includes("빗속 도시"));
assert.ok(toastMessage.includes("MV 조합"));
assert.deepStrictEqual(
  window.getMVTagValues("mvLocationTags"),
  ["urban-night", "street", "alley", "rain"],
);
assert.deepStrictEqual(
  window.getMVTagValues("mvActionTags"),
  ["walking", "looking-away", "close-up-face"],
);

window.currentProject = null;
window.updateCharacterInputs = function updateCharacterInputsStub() {
  window.updateCharacterInputsCalled = true;
};
store.set(
  "mvSettings",
  JSON.stringify({
    minutes: "2",
    seconds: "45",
    interval: "9",
    era: "retro",
    country: "japan",
    location: ["forest"],
    actionTags: ["running"],
    locationCustom: "오래된 극장",
    actionCustom: "계단 오르기",
    characterCount: "1",
    customSettings: "soft grain",
    lighting: "natural",
    cameraWork: "handheld",
    mood: "lonely",
    characters: [
      {
        gender: "female",
        age: "30s",
        race: "asian",
        appearance: "long coat",
        artStyle: "anime",
        characterSheet: "loaded sheet",
      },
    ],
  }),
);

window.loadMVSettings();
assert.strictEqual(document.getElementById("mvMinutes").value, "2");
assert.strictEqual(document.getElementById("mvTotalDuration").textContent, "2:45");
assert.strictEqual(document.getElementById("mvCustomSettings").value, "soft grain");
assert.strictEqual(document.getElementById("mvLocationCustom").value, "오래된 극장");
assert.strictEqual(document.getElementById("mvActionCustom").value, "계단 오르기");
assert.strictEqual(document.getElementById("mvCharacter1_artStyle").value, "anime");
assert.strictEqual(document.getElementById("mvCharacter1_sheet").value, "loaded sheet");
assert.strictEqual(window.updateCharacterInputsCalled, true);
assert.strictEqual(tagContainer.tags[0].classList.contains("active"), false);
assert.strictEqual(tagContainer.tags[1].classList.contains("active"), true);
assert.strictEqual(tagContainer.tags[2].classList.contains("active"), false);
assert.strictEqual(actionTagContainer.tags[0].classList.contains("active"), false);
assert.strictEqual(actionTagContainer.tags[1].classList.contains("active"), true);

originalConsole.log("MV settings smoke test: PASS");
process.exit(0);
