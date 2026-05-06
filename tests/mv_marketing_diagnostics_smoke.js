const assert = require("assert");

const originalConsole = { ...console };
let loggedPayload = null;
let alertText = "";
let toastMessage = "";

console.log = function logStub() {};
console.info = function infoStub(label, payload) {
  if (label === "MV marketing.mv diagnostics:") {
    loggedPayload = payload;
  }
};

global.window = global;
global.alert = function alertStub(message) {
  alertText = message;
};
global.document = {
  getElementById() {
    return null;
  },
};

window.showCopyIndicator = function showCopyIndicator(message) {
  toastMessage = message;
};
window.currentProject = {
  title: "진단 테스트 프로젝트",
  data: {
    marketing: {
      mvSettings: { minutes: "3", mood: "dreamy" },
      mvPrompts: {
        thumbnail: { en: "thumbnail prompt", ko: "" },
        character: { en: "", ko: "인물 프롬프트" },
      },
      mvScenes: [
        {
          time: "00:00-00:08",
          scene: "비 오는 골목",
          prompt: "rainy alley prompt",
          promptKo: "",
        },
        {
          time: "00:08-00:16",
          scene: "옥상",
          prompt: "",
          promptKo: "",
        },
      ],
      mv: {
        scenes: [
          {
            time: "00:00-00:08",
            scene: "비 오는 골목",
            prompt: "rainy alley prompt",
            promptKo: "",
          },
        ],
      },
    },
  },
};

require("../js/storage.js");

const diagnostics = window.buildMarketingMVDiagnostics(
  window.currentProject.data.marketing,
  "unit",
);

assert.strictEqual(diagnostics.projectTitle, "진단 테스트 프로젝트");
assert.strictEqual(diagnostics.context, "unit");
assert.strictEqual(diagnostics.sceneCount, 1);
assert.strictEqual(diagnostics.canonicalSceneCount, 1);
assert.strictEqual(diagnostics.legacySceneCount, 2);
assert.ok(diagnostics.settingsKeys.includes("minutes"));
assert.ok(diagnostics.promptSections.includes("thumbnail"));
assert.ok(
  diagnostics.issues.some((issue) =>
    issue.includes("canonical/legacy 씬 수 불일치"),
  ),
);

const formatted = window.formatMarketingMVDiagnostics(diagnostics);
assert.ok(formatted.includes("MV marketing.mv 진단 요약"));
assert.ok(formatted.includes("씬 수: 1 (canonical 1, legacy 2)"));
assert.ok(formatted.includes("확인 사항: canonical/legacy 씬 수 불일치"));

const logged = window.logMarketingMVDiagnostics(
  window.currentProject.data.marketing,
  "manual-log",
);
assert.strictEqual(loggedPayload, logged);
assert.strictEqual(logged.context, "manual-log");

const shown = window.showMarketingMVDiagnostics();
assert.strictEqual(shown.context, "manual");
assert.ok(alertText.includes("MV marketing.mv 진단 요약"));
assert.ok(toastMessage.includes("진단"));

originalConsole.log("MV marketing diagnostics smoke test: PASS");
process.exit(0);
