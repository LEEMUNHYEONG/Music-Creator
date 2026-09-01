// js/step3.js (3→4단계 데이터 전달 + 개선안 표시) 자동화 테스트
//
// Step3에는 지금까지 자동화 테스트가 전혀 없었다. 네트워크 호출이
// 없는 순수 DOM 전이 로직이라 전부 실제 동작으로 검증한다.

const assert = require("assert");

const originalConsole = { ...console };
console.log = function () {};
console.warn = function () {};
console.error = function () {};

// ─── DOM 스텁 ─────────────────────────────────────────────────
function createStubElement(id) {
  const classes = new Set();
  return {
    id: id || "",
    value: "",
    textContent: "",
    innerHTML: "",
    style: {},
    classList: {
      add(...c) {
        c.forEach((x) => classes.add(x));
      },
      remove(...c) {
        c.forEach((x) => classes.delete(x));
      },
      contains(c) {
        return classes.has(c);
      },
    },
  };
}

const elementIds = [
  "sunoLyrics",
  "stylePrompt",
  "sunoTitle",
  "finalizedLyrics",
  "finalizedStyle",
  "improvementCard",
  "improvementLoading",
  "geminiSuggestionsSummary",
];
const elements = new Map();
elementIds.forEach((id) => elements.set(id, createStubElement(id)));
elements.get("improvementCard").classList.add("hidden");

global.window = global;
global.document = {
  getElementById(id) {
    return elements.has(id) ? elements.get(id) : null;
  },
};

const toastMessages = [];
window.showToast = (msg) => toastMessages.push(msg);

let nextConfirmResult = true;
const confirmPrompts = [];
window.showConfirmAsync = async (msg) => {
  confirmPrompts.push(msg);
  return nextConfirmResult;
};

const goToStepCalls = [];
window.goToStep = (...args) => goToStepCalls.push(args);
let updateEditModeUICalls = 0;
window.updateEditModeUI = () => updateEditModeUICalls++;
const setReadOnlyModeCalls = [];
window.setReadOnlyMode = (v) => setReadOnlyModeCalls.push(v);

// step3.js는 displayImprovements를 bare identifier로 참조한다
// (js/step4.js에서 window.displayImprovements = displayImprovements로 노출되는
// 것과 별개로, 선언 자체는 전역 함수 선언이라 여기서도 동일하게 목을 전역에 둔다).
const displayImprovementsCalls = [];
global.displayImprovements = (data) => displayImprovementsCalls.push(data);

require("../js/step3.js");

assert.strictEqual(typeof window.goToStep4AndApplyImprovements, "function");

(async () => {
  // ═══════════════════════════════════════════════════════════════
  // 1. 빈 4단계 필드는 조건 없이 최신 값으로 채워짐
  // ═══════════════════════════════════════════════════════════════
  elements.get("sunoLyrics").value = "3단계에서 넘어온 가사";
  elements.get("stylePrompt").value = "3단계에서 넘어온 스타일";
  elements.get("sunoTitle").value = "3단계 제목";
  elements.get("finalizedLyrics").value = "";
  elements.get("finalizedStyle").value = "";
  window.editMode = false;
  window.currentProject = null;
  window.__lastAnalysisData = null;
  goToStepCalls.length = 0;
  confirmPrompts.length = 0;

  await window.goToStep4AndApplyImprovements();

  assert.strictEqual(window.editMode, true, "클릭 즉시 수정 모드로 전환");
  assert.strictEqual(elements.get("finalizedLyrics").value, "3단계에서 넘어온 가사");
  assert.strictEqual(elements.get("finalizedStyle").value, "3단계에서 넘어온 스타일");
  assert.strictEqual(confirmPrompts.length, 0, "필드가 비어있으면 확인 없이 바로 채워야 함");
  assert.strictEqual(window.currentSunoTitle, "3단계 제목");
  assert.deepStrictEqual(goToStepCalls[goToStepCalls.length - 1], [4, true, false]);
  assert.strictEqual(elements.get("improvementLoading").style.display, "none");
  assert.strictEqual(elements.get("improvementCard").classList.contains("hidden"), false);
  assert.strictEqual(elements.get("improvementCard").style.display, "block");

  // ═══════════════════════════════════════════════════════════════
  // 2. 값이 같으면 확인 없이 유지 (덮어쓰기 스킵)
  // ═══════════════════════════════════════════════════════════════
  confirmPrompts.length = 0;
  await window.goToStep4AndApplyImprovements();
  assert.strictEqual(confirmPrompts.length, 0, "현재 값과 동일하면 확인창을 띄우지 않아야 함");
  assert.strictEqual(elements.get("finalizedLyrics").value, "3단계에서 넘어온 가사");

  // ═══════════════════════════════════════════════════════════════
  // 3. 값이 다르면 확인 후 취소 시 유지, 승인 시 최신화
  // ═══════════════════════════════════════════════════════════════
  elements.get("sunoLyrics").value = "수정된 새 가사";
  nextConfirmResult = false;
  confirmPrompts.length = 0;
  await window.goToStep4AndApplyImprovements();
  assert.strictEqual(confirmPrompts.length, 1, "값이 다르면 확인창을 띄워야 함");
  assert.strictEqual(elements.get("finalizedLyrics").value, "3단계에서 넘어온 가사", "취소 시 기존 값 유지");

  nextConfirmResult = true;
  await window.goToStep4AndApplyImprovements();
  assert.strictEqual(elements.get("finalizedLyrics").value, "수정된 새 가사", "승인 시 최신 값으로 교체");

  // ═══════════════════════════════════════════════════════════════
  // 4. 개선안 표시: currentProject.data.analysis 우선
  // ═══════════════════════════════════════════════════════════════
  window.currentProject = { data: { analysis: { feedbacks: [{ suggestion: "프로젝트 분석" }] } } };
  window.__lastAnalysisData = { feedbacks: [{ suggestion: "백업 분석" }] };
  displayImprovementsCalls.length = 0;
  await window.goToStep4AndApplyImprovements();
  assert.strictEqual(displayImprovementsCalls.length, 1);
  assert.strictEqual(
    displayImprovementsCalls[0].feedbacks[0].suggestion,
    "프로젝트 분석",
    "currentProject.data.analysis가 있으면 우선 사용해야 함",
  );

  // ═══════════════════════════════════════════════════════════════
  // 5. 개선안 표시: currentProject 분석 없으면 백업(__lastAnalysisData) 사용
  // ═══════════════════════════════════════════════════════════════
  window.currentProject = null;
  displayImprovementsCalls.length = 0;
  await window.goToStep4AndApplyImprovements();
  assert.strictEqual(displayImprovementsCalls.length, 1);
  assert.strictEqual(displayImprovementsCalls[0].feedbacks[0].suggestion, "백업 분석");

  // ═══════════════════════════════════════════════════════════════
  // 6. 개선안 표시: 분석 데이터가 전혀 없으면 안내 문구
  // ═══════════════════════════════════════════════════════════════
  window.__lastAnalysisData = null;
  displayImprovementsCalls.length = 0;
  await window.goToStep4AndApplyImprovements();
  assert.strictEqual(displayImprovementsCalls.length, 0, "분석 데이터가 없으면 displayImprovements를 호출하지 않아야 함");
  assert.ok(
    elements.get("geminiSuggestionsSummary").innerHTML.includes("3단계에서 AI 분석을 먼저 실행"),
    "분석 데이터가 없으면 안내 문구가 표시되어야 함",
  );

  originalConsole.log("MV step3 transition flow smoke test: PASS");
  process.exit(0);
})().catch((err) => {
  originalConsole.error(err);
  process.exit(1);
});
