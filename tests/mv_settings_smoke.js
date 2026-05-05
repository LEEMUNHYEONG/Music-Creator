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
    return selector === ".tag-btn" ? tags : [];
  };
  el.tags = tags;
  return el;
}

global.window = global;
global.localStorage = {
  getItem(key) {
    return store.has(key) ? store.get(key) : null;
  },
  setItem(key, value) {
    store.set(key, String(value));
  },
};
global.document = {
  getElementById(id) {
    return elements.get(id) || null;
  },
};

const step6Source = fs.readFileSync(path.resolve(__dirname, "../js/step6.js"), "utf8");
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
const tagContainer = addTagContainer("mvLocationTags", ["city", "forest", "studio"]);

window.getMVLocationValues = function getMVLocationValuesStub() {
  return ["city", "studio"];
};

let saveCount = 0;
window.currentProject = { data: { marketing: {} } };
window.saveCurrentProject = function saveCurrentProjectStub() {
  saveCount += 1;
  return true;
};

window.updateMVImageCount();
assert.strictEqual(document.getElementById("mvImageCount").textContent, 50);
assert.strictEqual(document.getElementById("mvIntervalDisplay").textContent, 5);
assert.strictEqual(document.getElementById("mvTotalDuration").textContent, "4:10");

window.saveMVSettings();
const savedSettings = JSON.parse(localStorage.getItem("mvSettings"));
assert.deepStrictEqual(savedSettings.location, ["city", "studio"]);
assert.strictEqual(savedSettings.characters.length, 2);
assert.strictEqual(savedSettings.characters[0].characterSheet, "character sheet one");
assert.strictEqual(window.currentProject.data.marketing.mvSettings.mood, "dreamy");
assert.strictEqual(saveCount, 1);

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
assert.strictEqual(document.getElementById("mvCharacter1_artStyle").value, "anime");
assert.strictEqual(document.getElementById("mvCharacter1_sheet").value, "loaded sheet");
assert.strictEqual(window.updateCharacterInputsCalled, true);
assert.strictEqual(tagContainer.tags[0].classList.contains("active"), false);
assert.strictEqual(tagContainer.tags[1].classList.contains("active"), true);
assert.strictEqual(tagContainer.tags[2].classList.contains("active"), false);

originalConsole.log("MV settings smoke test: PASS");
process.exit(0);
