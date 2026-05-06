const assert = require("assert");

const originalConsole = { ...console };
const store = new Map();
let blobText = "";
let clickedDownload = "";
let revokedUrl = "";
let toastMessage = "";
let loadProjectId = "";
let loadProjectListCalled = false;

console.log = function logStub() {};
console.info = function infoStub() {};

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
};
global.document = {
  getElementById() {
    return null;
  },
  createElement(tag) {
    assert.strictEqual(tag, "a");
    return {
      href: "",
      download: "",
      click() {
        clickedDownload = this.download;
      },
    };
  },
  body: {
    appendChild() {},
    removeChild() {},
  },
};
global.Blob = class BlobStub {
  constructor(parts, options) {
    blobText = parts.join("");
    this.options = options;
  }
};
global.URL = {
  createObjectURL() {
    return "blob:single-project";
  },
  revokeObjectURL(url) {
    revokedUrl = url;
  },
};

window.showCopyIndicator = function showCopyIndicator(message) {
  toastMessage = message;
};
window.currentProject = {
  id: "proj_single_mv",
  title: "단일 프로젝트 테스트!",
  data: {
    songTitle: "단일 프로젝트 테스트",
    marketing: {
      mvSettings: { minutes: "3" },
      mvPrompts: { thumbnail: { en: "thumbnail", ko: "썸네일" } },
      mvScenes: [{ scene: "비 오는 골목", prompt: "rainy alley" }],
    },
  },
};

require("../js/storage.js");

window.loadProjectList = function loadProjectList(force) {
  loadProjectListCalled = force === true;
};
window.loadProject = function loadProject(id) {
  loadProjectId = id;
};
window.saveCurrentProject = function saveCurrentProjectStub() {
  return true;
};

const json = window.buildSingleProjectJSONExport();
const payload = JSON.parse(json);
assert.strictEqual(payload.type, "music-creator-single-project");
assert.strictEqual(payload.version, 1);
assert.strictEqual(payload.project.id, "proj_single_mv");
assert.ok(payload.project.data.marketing.mv);
assert.strictEqual(payload.project.data.marketing.mv.scenes[0].scene, "비 오는 골목");

const filename = window.downloadSingleProjectJSON(window.currentProject);
assert.strictEqual(filename, clickedDownload);
assert.ok(clickedDownload.startsWith("단일_프로젝트_테스트-"));
assert.ok(clickedDownload.endsWith(".json"));
assert.strictEqual(revokedUrl, "blob:single-project");
assert.strictEqual(JSON.parse(blobText).project.id, "proj_single_mv");

const exportedFilename = window.exportCurrentProjectJSON();
assert.strictEqual(exportedFilename, clickedDownload);
assert.ok(toastMessage.includes("단일 프로젝트 JSON"));

const importedPayload = {
  type: "music-creator-single-project",
  version: 1,
  project: {
    id: "proj_imported_mv",
    title: "가져온 MV 프로젝트",
    data: {
      marketing: {
        mvScenes: [{ scene: "옥상", prompt: "rooftop" }],
      },
    },
  },
};
const imported = window.importSingleProjectJSONFromText(
  JSON.stringify(importedPayload),
);
assert.strictEqual(imported.id, "proj_imported_mv");
assert.strictEqual(window.currentProjectId, "proj_imported_mv");
assert.strictEqual(loadProjectId, "proj_imported_mv");
assert.strictEqual(loadProjectListCalled, true);
assert.ok(imported.data.marketing.mv);
assert.strictEqual(imported.data.songTitle, "가져온 MV 프로젝트");

for (const key of ["musicCreatorProjects", "savedProjects"]) {
  const list = JSON.parse(localStorage.getItem(key));
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].id, "proj_imported_mv");
  assert.strictEqual(list[0].data.marketing.mv.scenes[0].scene, "옥상");
}

const replaced = window.importSingleProjectJSONFromText(
  JSON.stringify({
    project: {
      id: "proj_imported_mv",
      title: "교체된 MV 프로젝트",
      data: { marketing: { mvScenes: [{ scene: "교체 씬" }] } },
    },
  }),
  { load: false },
);
assert.strictEqual(replaced.title, "교체된 MV 프로젝트");
assert.strictEqual(JSON.parse(localStorage.getItem("musicCreatorProjects")).length, 1);
assert.strictEqual(
  JSON.parse(localStorage.getItem("musicCreatorProjects"))[0].data.marketing.mv.scenes[0].scene,
  "교체 씬",
);

originalConsole.log("MV single project JSON smoke test: PASS");
process.exit(0);
