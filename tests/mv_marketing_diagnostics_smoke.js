const assert = require("assert");

const originalConsole = { ...console };
let loggedPayload = null;
let alertText = "";
let toastMessage = "";
let clipboardText = "";
let blobText = "";
let clickedDownload = "";
let appended = false;
let removed = false;
let revokedUrl = "";
const elements = new Map();

console.log = function logStub() {};
console.info = function infoStub(label, payload) {
  if (label === "MV marketing.mv diagnostics:") {
    loggedPayload = payload;
  }
};

global.window = global;
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: {
    clipboard: {
      writeText(text) {
        clipboardText = text;
        return Promise.resolve();
      },
    },
  },
});
global.alert = function alertStub(message) {
  alertText = message;
};

function makeElement(tag) {
  const element = {
    tagName: tag.toUpperCase(),
    style: {},
    className: "",
    textContent: "",
    href: "",
    download: "",
    onclick: null,
    attributes: {},
    classList: {
      values: new Set(),
      add(name) {
        this.values.add(name);
      },
      remove(name) {
        this.values.delete(name);
      },
      contains(name) {
        return this.values.has(name);
      },
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    click() {
      clickedDownload = this.download;
    },
  };
  Object.defineProperty(element, "id", {
    get() {
      return this._id || "";
    },
    set(value) {
      this._id = value;
      if (value) elements.set(value, this);
    },
  });
  Object.defineProperty(element, "innerHTML", {
    get() {
      return this._innerHTML || "";
    },
    set(value) {
      this._innerHTML = value;
      if (String(value).includes("marketingMVDiagnosticsText")) {
        const reportEl = makeElement("pre");
        reportEl.id = "marketingMVDiagnosticsText";
      }
    },
  });
  return element;
}

global.document = {
  getElementById(id) {
    return elements.get(id) || null;
  },
  querySelector(selector) {
    if (selector === ".app-version") {
      return { textContent: "v-test" };
    }
    return null;
  },
  createElement(tag) {
    return makeElement(tag);
  },
  body: {
    appendChild(element) {
      appended = true;
      if (element?.id) elements.set(element.id, element);
    },
    removeChild(element) {
      removed = true;
      if (element?.id) elements.delete(element.id);
    },
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
    return "blob:mv-rehearsal-report-test";
  },
  revokeObjectURL(url) {
    revokedUrl = url;
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
assert.strictEqual(diagnostics.sceneDiagnostics.issueSceneCount, 1);
assert.strictEqual(diagnostics.sceneDiagnostics.issueCounts.missingLocation, 1);
assert.strictEqual(diagnostics.sceneDiagnostics.issueCounts.missingCamera, 1);
assert.ok(
  diagnostics.sceneDiagnostics.topScenes[0].issues.includes("장소 없음"),
);

const sceneDiagnostics = window.buildMarketingMVSceneDiagnostics([
  {
    time: "00:00-00:08",
    scene: "옥상 정면",
    lyrics: "첫 가사",
    prompt: "first prompt",
    promptKo: "첫 프롬프트",
    location: "rooftop",
    cameraWork: "slow push-in",
    lighting: "moonlight",
  },
  {
    time: "00:08-00:04",
    scene: "옥상 정면",
    lyrics: "",
    prompt: "",
    promptKo: "",
    location: "rooftop",
    cameraWork: "slow push-in",
    lighting: "moonlight",
  },
]);
assert.strictEqual(sceneDiagnostics.issueSceneCount, 2);
assert.strictEqual(sceneDiagnostics.issueCounts.repeatedVisualPattern, 2);
assert.strictEqual(sceneDiagnostics.issueCounts.invalidTime, 1);
assert.ok(sceneDiagnostics.topScenes[1].issues.includes("시간 확인"));
assert.ok(sceneDiagnostics.topScenes[1].issues.includes("가사 없음"));

const formatted = window.formatMarketingMVDiagnostics(diagnostics);
assert.ok(formatted.includes("MV marketing.mv 진단 요약"));
assert.ok(formatted.includes("씬 수: 1 (canonical 1, legacy 2)"));
assert.ok(formatted.includes("확인 사항: canonical/legacy 씬 수 불일치"));
assert.ok(formatted.includes("우선 확인 씬"));
assert.ok(formatted.includes("확인 필요 씬: 1/1"));
assert.ok(formatted.includes("씬 1 00:00-00:08"));
assert.ok(formatted.includes("MV 실제 프로젝트 리허설 판정"));
assert.ok(formatted.includes("판정: 실패"));
assert.ok(formatted.includes("다음 조치: 실패 항목을 먼저 보정"));
assert.ok(formatted.includes("실패: canonical/legacy 씬 수 동기화"));

const readiness = window.buildMarketingMVRehearsalReadiness(diagnostics);
assert.strictEqual(readiness.status, "실패");
assert.ok(readiness.failures.includes("canonical/legacy 씬 수 동기화"));

const readyDiagnostics = {
  ...diagnostics,
  sceneCount: 2,
  canonicalSceneCount: 2,
  legacySceneCount: 2,
  settingsKeys: ["minutes", "mood"],
  promptSections: ["thumbnail", "background", "character"],
  firstScene: {
    time: "00:00-00:08",
    scene: "비 오는 골목",
    hasPrompt: true,
  },
  lastScene: {
    time: "00:08-00:16",
    scene: "옥상",
    hasPrompt: true,
  },
  issues: [],
};
const readyReadiness = window.buildMarketingMVRehearsalReadiness(readyDiagnostics);
assert.strictEqual(readyReadiness.status, "통과");
assert.ok(readyReadiness.summary.includes("리허설 진행 가능"));
assert.ok(readyReadiness.nextAction.includes("씬 2개 이상 수정"));

const afterDiagnostics = {
  ...diagnostics,
  context: "after",
  sceneCount: 2,
  canonicalSceneCount: 2,
  legacySceneCount: 2,
  firstScene: {
    time: "00:00-00:08",
    scene: "비 오는 골목 수정",
    hasPrompt: true,
  },
  lastScene: {
    time: "00:08-00:16",
    scene: "옥상",
    hasPrompt: false,
  },
  updatedAt: "2026-05-06T00:00:00.000Z",
};
const comparison = window.compareMarketingMVDiagnostics(
  diagnostics,
  afterDiagnostics,
);
assert.strictEqual(comparison.changed, true);
assert.strictEqual(comparison.sceneCount.changed, true);
assert.strictEqual(comparison.firstScene.changed, true);
assert.strictEqual(comparison.lastScene.changed, true);
assert.strictEqual(comparison.updatedAt.changed, true);
const comparisonText =
  window.formatMarketingMVDiagnosticsComparison(comparison);
assert.ok(comparisonText.includes("MV 저장 전/후 비교"));
assert.ok(comparisonText.includes("씬 수: 1 -> 2"));

const report = window.buildMarketingMVRehearsalReport(diagnostics, comparison);
assert.ok(report.includes("MV 실제 프로젝트 리허설 보고서"));
assert.ok(report.includes("앱 버전: v-test"));
assert.ok(report.includes("판정: 실패"));
assert.ok(report.includes("기록 방법:"));
assert.ok(report.includes("MV 저장 전/후 비교"));

const currentReport = window.buildCurrentMarketingMVRehearsalReport();
assert.strictEqual(currentReport.diagnostics.context, "manual");
assert.ok(currentReport.text.includes("MV 실제 프로젝트 리허설 보고서"));

const logged = window.logMarketingMVDiagnostics(
  window.currentProject.data.marketing,
  "manual-log",
);
assert.strictEqual(loggedPayload, logged);
assert.strictEqual(logged.context, "manual-log");
window.__lastMarketingMVSaveComparison = comparison;

const shown = window.showMarketingMVDiagnostics();
assert.strictEqual(shown.context, "manual");
assert.strictEqual(alertText, "");
assert.ok(elements.get("marketingMVDiagnosticsModal"));
assert.ok(
  elements.get("marketingMVDiagnosticsModal").classList.contains("show"),
);
assert.ok(
  elements
    .get("marketingMVDiagnosticsModal")
    .innerHTML.includes("첫 확인 씬으로 이동"),
);
assert.strictEqual(
  elements.get("marketingMVDiagnosticsText").textContent,
  window.__lastMarketingMVDiagnosticsText,
);
assert.strictEqual(window.__lastMarketingMVDiagnostics.context, "manual");
assert.ok(window.__lastMarketingMVDiagnosticsText.includes("MV 실제 프로젝트 리허설 판정"));
assert.ok(clipboardText.includes("MV 실제 프로젝트 리허설 보고서"));
assert.ok(toastMessage.includes("클립보드"));

const copied = window.copyCurrentMarketingMVDiagnosticsReport();
assert.ok(copied.includes("MV 실제 프로젝트 리허설 보고서"));
let focusedReview = false;
window.focusMVFirstReviewScene = function focusMVFirstReviewSceneStub() {
  focusedReview = true;
  return true;
};
assert.strictEqual(window.focusFirstMarketingMVDiagnosticsScene(), true);
assert.strictEqual(focusedReview, true);
assert.ok(
  !elements.get("marketingMVDiagnosticsModal").classList.contains("show"),
);

focusedReview = false;
delete window.focusMVFirstReviewScene;
let focusedIndex = null;
window.focusMVSceneCard = function focusMVSceneCardStub(index) {
  focusedIndex = index;
};
window.openMarketingMVDiagnosticsModal(window.__lastMarketingMVDiagnosticsText);
assert.strictEqual(window.focusFirstMarketingMVDiagnosticsScene(), true);
assert.strictEqual(focusedIndex, 0);

window.closeMarketingMVDiagnosticsModal();
assert.ok(
  !elements.get("marketingMVDiagnosticsModal").classList.contains("show"),
);

const downloaded = window.downloadMarketingMVRehearsalReport();
assert.ok(
  /^진단_테스트_프로젝트-mv-rehearsal-report-\d{4}-\d{2}-\d{2}\.txt$/.test(
    downloaded,
  ),
);
assert.strictEqual(clickedDownload, downloaded);
assert.strictEqual(appended, true);
assert.strictEqual(removed, true);
assert.strictEqual(revokedUrl, "blob:mv-rehearsal-report-test");
assert.ok(blobText.includes("MV 실제 프로젝트 리허설 보고서"));
assert.ok(blobText.includes("MV marketing.mv 진단 요약"));
assert.ok(toastMessage.includes("TXT"));

originalConsole.log("MV marketing diagnostics smoke test: PASS");
process.exit(0);
