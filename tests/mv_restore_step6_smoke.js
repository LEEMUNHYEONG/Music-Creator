const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const originalConsole = { ...console };
const elements = new Map();
const tags = new Map();
const calls = {
  updateCharacterInputs: 0,
  renderMvPrompts: 0,
  renderSceneOverview: 0,
  updateMVImageCount: 0,
};

console.log = function logStub() {};
console.error = function errorStub() {};

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

function addElement(id, value = "") {
  const el = {
    id,
    value,
    textContent: "",
    innerHTML: "",
    style: {},
    classList: makeClassList(["hidden"]),
  };
  elements.set(id, el);
  return el;
}

function addTagGroup(selector, values) {
  const group = values.map((value) => ({
    dataset: { value },
    classList: makeClassList(),
  }));
  tags.set(selector, group);
  return group;
}

function ensureCharacterFields() {
  for (let i = 1; i <= 2; i += 1) {
    [
      `mvCharacter${i}_gender`,
      `mvCharacter${i}_age`,
      `mvCharacter${i}_race`,
      `mvCharacter${i}_appearance`,
      `mvCharacter${i}_artStyle`,
      `mvCharacter${i}_sheet`,
      `mvCharacter${i}_sheetArea`,
      `mvCharacter${i}_sheetToggle`,
      `mvCharacter${i}_sheetCopy`,
    ].forEach((id) => {
      if (!elements.has(id)) addElement(id);
    });
  }
}

global.window = global;
global.document = {
  getElementById(id) {
    return elements.get(id) || null;
  },
  querySelectorAll(selector) {
    return tags.get(selector) || [];
  },
};

window.editMode = false;
window.isInitialLoading = false;
window.updateCharacterInputs = function updateCharacterInputsStub() {
  calls.updateCharacterInputs += 1;
  ensureCharacterFields();
};
window.renderMvPrompts = function renderMvPromptsStub() {
  calls.renderMvPrompts += 1;
};
window.renderSceneOverview = function renderSceneOverviewStub(scenes) {
  calls.renderSceneOverview += 1;
  calls.lastRenderedScenes = scenes;
};
window.updateMVImageCount = function updateMVImageCountStub() {
  calls.updateMVImageCount += 1;
};
window.getMarketingMVData = function getMarketingMVDataStub(marketing) {
  return marketing.mv;
};

[
  "marketingResult",
  "youtubeDesc",
  "tiktokDesc",
  "hashtagsContent",
  "thumbnailsGrid",
  "mvMinutes",
  "mvSeconds",
  "mvInterval",
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
  "mvResultsSection",
  "mvSceneOverviewSection",
].forEach((id) => addElement(id));

const locationTags = addTagGroup("#mvLocationTags .tag-btn", ["city", "rain", "desert"]);
const actionTags = addTagGroup("#mvActionTags .tag-btn", ["walking", "running"]);
const scenes = [
  { scene: "비 오는 도시", prompt: "rainy city", promptKo: "비 오는 도시" },
];

window.currentProject = {
  data: {
    marketing: {
      youtubeDesc: "YouTube restored",
      tiktokDesc: "TikTok restored",
      hashtags: "#mv #restored",
      thumbnails: ["thumb idea"],
      mv: {
        settings: {
          minutes: "3",
          seconds: "15",
          interval: "5",
          era: "modern",
          country: "korea",
          characterCount: "2",
          lighting: "soft neon",
          cameraWork: "slow dolly",
          mood: "dreamy",
          locationCustom: "서울 골목",
          actionCustom: "천천히 걷기",
          customSettings: "consistent visual identity",
          locationTags: ["city", "rain"],
          actionTags: ["walking"],
          characters: [
            {
              gender: "female",
              age: "20s",
              race: "asian",
              appearance: "black bob hair",
              artStyle: "photorealistic",
              characterSheet: "main character sheet",
            },
            {
              gender: "male",
              age: "30s",
              race: "latino",
              appearance: "silver jacket",
              artStyle: "anime",
            },
          ],
        },
        prompts: {
          thumbnail: { en: "thumbnail en", ko: "thumbnail ko" },
          background: { en: "background en", ko: "background ko" },
          character: { en: "character en", ko: "character ko" },
        },
        scenes,
      },
    },
  },
};

const appSource = fs.readFileSync(path.resolve(__dirname, "../app.js"), "utf8");
const start = appSource.indexOf("function restoreMarketingMVStepData(projectData) {");
const end = appSource.indexOf("window.saveAndClose = function ()", start);
assert.ok(start !== -1, "restoreStepData should exist in app.js");
assert.ok(end !== -1, "restoreStepData block should end before saveAndClose");
vm.runInThisContext(appSource.slice(start, end), {
  filename: "app.js.restore-step-data-slice",
});

window.restoreStepData(6);

assert.strictEqual(window.isRestoringStepData, false);
assert.strictEqual(document.getElementById("marketingResult").style.display, "block");
assert.strictEqual(document.getElementById("marketingResult").classList.contains("hidden"), false);
assert.strictEqual(document.getElementById("youtubeDesc").textContent, "YouTube restored");
assert.strictEqual(document.getElementById("tiktokDesc").textContent, "TikTok restored");
assert.strictEqual(document.getElementById("hashtagsContent").textContent, "#mv #restored");
assert.ok(document.getElementById("thumbnailsGrid").innerHTML.includes("thumb idea"));

assert.strictEqual(document.getElementById("mvMinutes").value, "3");
assert.strictEqual(document.getElementById("mvSeconds").value, "15");
assert.strictEqual(document.getElementById("mvInterval").value, "5");
assert.strictEqual(document.getElementById("mvEra").value, "modern");
assert.strictEqual(document.getElementById("mvCountry").value, "korea");
assert.strictEqual(document.getElementById("mvCharacterCount").value, "2");
assert.strictEqual(document.getElementById("mvLighting").value, "soft neon");
assert.strictEqual(document.getElementById("mvCameraWork").value, "slow dolly");
assert.strictEqual(document.getElementById("mvMood").value, "dreamy");
assert.strictEqual(document.getElementById("mvLocationCustom").value, "서울 골목");
assert.strictEqual(document.getElementById("mvActionCustom").value, "천천히 걷기");
assert.strictEqual(document.getElementById("mvCustomSettings").value, "consistent visual identity");

assert.strictEqual(locationTags[0].classList.contains("active"), true);
assert.strictEqual(locationTags[1].classList.contains("active"), true);
assert.strictEqual(locationTags[2].classList.contains("active"), false);
assert.strictEqual(actionTags[0].classList.contains("active"), true);
assert.strictEqual(actionTags[1].classList.contains("active"), false);

assert.strictEqual(calls.updateCharacterInputs, 1);
assert.strictEqual(document.getElementById("mvCharacter1_gender").value, "female");
assert.strictEqual(document.getElementById("mvCharacter1_sheet").value, "main character sheet");
assert.strictEqual(document.getElementById("mvCharacter1_sheetArea").style.display, "block");
assert.strictEqual(document.getElementById("mvCharacter1_sheetToggle").style.display, "inline-flex");
assert.strictEqual(document.getElementById("mvCharacter1_sheetCopy").style.display, "inline-flex");
assert.strictEqual(document.getElementById("mvCharacter2_gender").value, "male");
assert.strictEqual(document.getElementById("mvCharacter2_artStyle").value, "anime");

assert.strictEqual(document.getElementById("mvThumbnailPromptEn").value, "thumbnail en");
assert.strictEqual(document.getElementById("mvThumbnailPromptKo").value, "thumbnail ko");
assert.strictEqual(document.getElementById("review_thumbnail_en").value, "thumbnail en");
assert.strictEqual(document.getElementById("review_thumbnail_ko").value, "thumbnail ko");
assert.strictEqual(document.getElementById("mvBackgroundDetailPromptEn").value, "background en");
assert.strictEqual(document.getElementById("mvBackgroundDetailPromptKo").value, "background ko");
assert.strictEqual(document.getElementById("mvCharacterDetailPromptEn").value, "character en");
assert.strictEqual(document.getElementById("mvCharacterDetailPromptKo").value, "character ko");

assert.strictEqual(calls.renderMvPrompts, 1);
assert.strictEqual(calls.renderSceneOverview, 1);
assert.strictEqual(calls.updateMVImageCount, 1);
assert.notStrictEqual(window.currentScenes, scenes);
assert.deepStrictEqual(window.currentScenes, scenes);
assert.strictEqual(calls.lastRenderedScenes, window.currentScenes);
assert.strictEqual(document.getElementById("mvResultsSection").style.display, "block");
assert.strictEqual(document.getElementById("mvResultsSection").classList.contains("hidden"), false);
assert.strictEqual(document.getElementById("mvSceneOverviewSection").style.display, "none");
assert.strictEqual(document.getElementById("mvSceneOverviewSection").classList.contains("hidden"), true);

window.editMode = true;
const callsBeforeSkip = { ...calls };
window.restoreStepData(6);
assert.strictEqual(window.isRestoringStepData, false);
assert.strictEqual(calls.renderMvPrompts, callsBeforeSkip.renderMvPrompts);
assert.strictEqual(calls.renderSceneOverview, callsBeforeSkip.renderSceneOverview);
assert.strictEqual(calls.updateMVImageCount, callsBeforeSkip.updateMVImageCount);

window.editMode = false;
window.currentProject = null;
window.restoreStepData(6);
assert.strictEqual(window.isRestoringStepData, false);

originalConsole.log("MV step 6 restore smoke test: PASS");
process.exit(0);
