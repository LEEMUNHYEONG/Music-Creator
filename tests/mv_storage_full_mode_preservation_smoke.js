// 회귀 테스트: 용량 여유가 있을 때(full 모드) 비현재 프로젝트의 상세 데이터가
// 요약본으로 압축되지 않고 그대로 보존되는지 검증한다.
// (2026-08 발견: 삼항 오타로 full 패스에서도 비현재 프로젝트가 summary로 잘려
//  originalLyrics/analysis 등이 자동저장마다 파괴되던 버그의 재발 방지)
const assert = require("assert");

const originalConsole = { ...console };
const store = new Map();

console.log = function logStub() {};
console.info = function infoStub() {};
console.warn = function warnStub() {};

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
};
global.document = {
  getElementById() {
    return null;
  },
  querySelector() {
    return null;
  },
  createElement() {
    return { textContent: "", innerHTML: "" };
  },
};

require("../js/storage.js");

const currentProject = {
  id: "proj_current",
  title: "현재 프로젝트",
  savedAt: "2026-08-31T00:00:00.000Z",
  data: { songTitle: "현재 프로젝트", originalLyrics: "현재 가사" },
};
const otherProject = {
  id: "proj_other",
  title: "다른 프로젝트",
  savedAt: "2026-08-30T00:00:00.000Z",
  data: {
    songTitle: "다른 프로젝트",
    originalLyrics: "원본 가사는 보존되어야 한다".repeat(3),
    sunoLyrics: "수노 변환 가사",
    stylePrompt: "dreamy k-ballad",
    analysis: { feedbacks: [{ category: "구성", suggestion: "후렴 보강" }] },
    regenerationHistory: [{ type: "style", lyrics: "이전 버전" }],
  },
};

const result = window.saveProjectListToLocalStorage(
  "musicCreatorProjects",
  [currentProject, otherProject],
  currentProject,
);

assert.strictEqual(result.ok, true);
assert.strictEqual(result.compacted, false, "용량 여유 시 압축이 일어나면 안 된다");

const saved = JSON.parse(localStorage.getItem("musicCreatorProjects"));
const savedOther = saved.find((p) => p.id === "proj_other");
assert.ok(savedOther, "비현재 프로젝트가 저장 목록에 있어야 한다");
assert.strictEqual(
  savedOther.data.originalLyrics,
  otherProject.data.originalLyrics,
  "full 모드에서 비현재 프로젝트의 originalLyrics가 보존되어야 한다",
);
assert.strictEqual(savedOther.data.sunoLyrics, "수노 변환 가사");
assert.strictEqual(savedOther.data.stylePrompt, "dreamy k-ballad");
assert.ok(
  savedOther.data.analysis && savedOther.data.analysis.feedbacks.length === 1,
  "full 모드에서 analysis가 보존되어야 한다",
);
assert.ok(
  Array.isArray(savedOther.data.regenerationHistory),
  "full 모드에서 regenerationHistory가 보존되어야 한다",
);

originalConsole.log("MV storage full-mode preservation smoke test: PASS");
process.exit(0);
