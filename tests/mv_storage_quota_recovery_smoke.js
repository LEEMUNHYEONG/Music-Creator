const assert = require("assert");
const fs = require("fs");
const path = require("path");

const originalConsole = { ...console };
const store = new Map();
const elements = new Map();
const quotaLimit = 3600;
let toastMessage = "";
let status = "";

console.log = function logStub() {};
console.info = function infoStub() {};
console.warn = function warnStub() {};

function addElement(id, value = "") {
  const el = {
    id,
    value,
    textContent: value,
    innerText: value,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    style: {},
    querySelectorAll() { return []; },
  };
  elements.set(id, el);
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
    const text = String(value);
    if (
      (key === "musicCreatorProjects" || key === "savedProjects") &&
      text.length > quotaLimit
    ) {
      const error = new Error("quota exceeded");
      error.name = "QuotaExceededError";
      throw error;
    }
    store.set(key, text);
  },
  removeItem(key) {
    store.delete(key);
  },
};
global.document = {
  getElementById(id) {
    return elements.get(id) || null;
  },
  querySelector() {
    return null;
  },
  createElement() {
    return { textContent: "", innerHTML: "" };
  },
};

window.showCopyIndicator = function showCopyIndicator(message) {
  toastMessage = message;
};
window.updateSaveStatusUI = function updateSaveStatusUI(nextStatus) {
  status = nextStatus;
};
window.loadProjectList = function loadProjectListStub() {};

const oldProjects = Array.from({ length: 30 }, (_, index) => ({
  id: `old_${index}`,
  title: `오래된 프로젝트 ${index}`,
  savedAt: `2026-04-${String((index % 25) + 1).padStart(2, "0")}T00:00:00.000Z`,
  data: {
    songTitle: `오래된 프로젝트 ${index}`,
    originalLyrics: "가".repeat(600),
    finalLyrics: "나".repeat(600),
    marketing: {
      mvScenes: Array.from({ length: 8 }, (_, sceneIndex) => ({
        scene: `old scene ${sceneIndex}`,
        prompt: "cinematic prompt ".repeat(20),
      })),
    },
  },
}));
store.set("musicCreatorProjects", JSON.stringify(oldProjects));
store.set("savedProjects", JSON.stringify(oldProjects.slice(0, 10)));

window.currentProjectId = "proj_quota_current";
window.currentProject = {
  id: "proj_quota_current",
  title: "현재 보존 프로젝트",
  createdAt: "2026-05-07T00:00:00.000Z",
  data: { marketing: { mvSettings: { minutes: "3" } } },
};
window.currentStep = 5;
window.currentScenes = [
  { scene: "현재 씬", prompt: "current prompt", promptKo: "현재 프롬프트" },
];

addElement("songTitle", "현재 보존 프로젝트");
addElement("finalLyrics", "현재 최종 가사");
addElement("finalStyle", "current style");

require("../js/storage.js");

const storageSource = fs.readFileSync(path.resolve(__dirname, "../js/storage.js"), "utf8");
const indexSource = fs.readFileSync(path.resolve(__dirname, "../index.html"), "utf8");
assert.ok(storageSource.includes(".collection(\"projects\").doc(docId)"));
assert.ok(indexSource.includes(".collection('projects').doc(String(p.id))"));

const saved = window.saveCurrentProject();
assert.strictEqual(saved, true);
assert.ok(toastMessage.includes("용량 보호"));

const projects = JSON.parse(localStorage.getItem("musicCreatorProjects"));
assert.ok(projects.length < oldProjects.length);
assert.strictEqual(projects[0].id, "proj_quota_current");
assert.strictEqual(projects[0].data.songTitle, "현재 보존 프로젝트");
assert.ok(projects[0].data.marketing.mv.scenes[0].scene, "현재 씬");
assert.ok(localStorage.getItem("musicCreatorProjects").length <= quotaLimit);
assert.notStrictEqual(status, "error");

originalConsole.log("MV storage quota recovery smoke test: PASS");
process.exit(0);
