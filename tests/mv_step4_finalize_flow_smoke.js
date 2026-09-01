// js/step4.js (개선안 적용 · 지침서 검수 · 4→5단계 확정) 자동화 테스트
//
// Step4에는 (문자열 존재 여부만 확인하는 mv_step4_ai_fallback_smoke.js
// 외에는) 실제 동작 검증 테스트가 전혀 없었다. Gemini/OpenAI 호출을
// 목으로 대체해 다음을 검증한다:
//   - 지침서 준수 점검(getGuidelineComplianceIssues/renderGuidelineComplianceStatus)
//   - enforceGuidelinesOnFinalContent(): 지침서가 없으면 AI 호출 없이
//     로컬 점검만, 있으면 AI 검수 시도 후 성공/실패 각각의 결과 형태
//   - displayImprovements(): feedbacks 우선 단일 소스 전략, improvements
//     폴백, 문자열/객체 각 형태 처리
//   - confirmFinalizedContent(): 4→5단계 데이터 전달
//   - applyExtractedLyrics(): API 키 없으면 원문 그대로 반영, 있으면 AI
//     지시어 보강 시도 후 실패 시 원문 폴백
//   - updateSelectedCount/selectAllImprovements/deselectAllImprovements/
//     toggleEditFinalizedLyrics/toggleEditFinalizedStyle
//   - applySelectedImprovements(): Gemini 성공/실패 후 OpenAI 폴백,
//     이력 저장
//   - saveToRegenerationHistory(): 최대 10개 제한
//   - restoreFromHistory(): 확인 게이팅 + 복구 전 현재 내용을 이력에 저장

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
    dataset: {},
    disabled: false,
    readOnly: false,
    checked: false,
    _attrs: {},
    classList: {
      add(...c) {
        c.forEach((x) => classes.add(x));
      },
      remove(...c) {
        c.forEach((x) => classes.delete(x));
      },
      toggle(c, force) {
        if (force === undefined) {
          classes.has(c) ? classes.delete(c) : classes.add(c);
        } else if (force) {
          classes.add(c);
        } else {
          classes.delete(c);
        }
      },
      contains(c) {
        return classes.has(c);
      },
    },
    setAttribute(k, v) {
      this._attrs[k] = v;
    },
    getAttribute(k) {
      return this._attrs[k] === undefined ? null : this._attrs[k];
    },
    remove() {},
    appendChild() {},
    closest() {
      return null;
    },
    focus() {},
  };
}

const elementIds = [
  "finalLyricsStatus",
  "geminiSuggestionsSummary",
  "finalizedLyrics",
  "finalizedStyle",
  "sunoTitle",
  "songTitle",
  "finalTitleText",
  "finalLyrics",
  "finalStyle",
  "intermediateLyricsPreview",
  "intermediateStylePreview",
  "selectedImprovementCount",
  "applySelectedBtn",
  "editFinalizedLyricsBtn",
  "editFinalizedStyleBtn",
  "regenerationHistoryModal",
  "historyItemsContainer",
  "step4CompleteBanner",
  "step4BannerStyle",
];
const elements = new Map();
elementIds.forEach((id) => elements.set(id, createStubElement(id)));

let improvementCheckboxes = [];
function makeCheckbox(index, type, checked) {
  const cb = createStubElement();
  cb.setAttribute("data-index", String(index));
  cb.setAttribute("data-type", type);
  cb.checked = checked;
  const parent = createStubElement();
  cb.closest = (sel) => (sel === ".improvement-item" ? parent : null);
  cb._parent = parent;
  return cb;
}

global.window = global;
global.document = {
  getElementById(id) {
    return elements.has(id) ? elements.get(id) : null;
  },
  querySelectorAll(selector) {
    if (selector === ".improvement-checkbox") return improvementCheckboxes;
    if (selector === ".improvement-checkbox:checked")
      return improvementCheckboxes.filter((cb) => cb.checked);
    return [];
  },
  createElement() {
    return createStubElement();
  },
  head: { appendChild() {} },
  body: { appendChild() {} },
};

const localStore = {};
global.localStorage = {
  getItem: (k) => (k in localStore ? localStore[k] : null),
  setItem: (k, v) => {
    localStore[k] = String(v);
  },
  removeItem: (k) => {
    delete localStore[k];
  },
};

// escapeHtml은 app.js가 소유한 전역 함수 (step4.js에서 bare identifier로 참조)
global.escapeHtml = function (str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const toastMessages = [];
window.showToast = (msg) => toastMessages.push(msg);
const copyIndicatorMessages = [];
window.showCopyIndicator = (msg) => copyIndicatorMessages.push(msg);

let nextConfirmResult = true;
window.showConfirmAsync = async () => nextConfirmResult;

let nextGeminiKey = "";
let nextOpenAIKey = "";
window.getGeminiApiKey = () => nextGeminiKey;
window.getOpenAIApiKey = () => nextOpenAIKey;
window.getOpenAIModel = () => "gpt-4o-mini";

const geminiCalls = [];
let nextGeminiImpl = null; // async (prompt, opts, key) => text  또는 throw
window.callGeminiWithAutoRoute = async (prompt, opts, key) => {
  geminiCalls.push({ prompt, opts, key });
  if (!nextGeminiImpl) throw new Error("Gemini mock not configured");
  return nextGeminiImpl(prompt, opts, key);
};
global.callGeminiWithAutoRoute = window.callGeminiWithAutoRoute; // bare identifier 폴백 대비

const geminiFailureCalls = [];
window.handleGeminiApiFailure = (err) => geminiFailureCalls.push(err);
const apiUsageLogs = [];
window.logApiUsage = (provider) => apiUsageLogs.push(provider);

let nextFetchImpl = null;
global.fetch = async (...args) => nextFetchImpl(...args);
function chatCompletionResponse(contentObjOrString, ok = true, status = 200) {
  const content =
    typeof contentObjOrString === "string" ? contentObjOrString : JSON.stringify(contentObjOrString);
  return {
    ok,
    status,
    async json() {
      return ok ? { choices: [{ message: { content } }] } : { error: { message: content } };
    },
  };
}

const goToStepCalls = [];
window.goToStep = (...args) => goToStepCalls.push(args);
let updateEditModeUICalls = 0;
window.updateEditModeUI = () => updateEditModeUICalls++;
const setReadOnlyModeCalls = [];
window.setReadOnlyMode = (v) => setReadOnlyModeCalls.push(v);
const requestFinalEvaluationRefreshCalls = [];
window.requestFinalEvaluationRefresh = (...args) => requestFinalEvaluationRefreshCalls.push(args);

require("../js/step4.js");

assert.strictEqual(typeof window.getGuidelineComplianceIssues, "function");
assert.strictEqual(typeof window.enforceGuidelinesOnFinalContent, "function");
assert.strictEqual(typeof window.confirmFinalizedContent, "function");
assert.strictEqual(typeof window.applyExtractedLyrics, "function");
assert.strictEqual(typeof window.applySelectedImprovements, "function");

(async () => {
  // ═══════════════════════════════════════════════════════════════
  // 1. getGuidelineComplianceIssues: 영어 비율/지시어/스타일 누락 감지
  // ═══════════════════════════════════════════════════════════════
  const koreanOnly = window.getGuidelineComplianceIssues("[Intro]\n한글 가사 본문입니다", "warm style");
  assert.strictEqual(koreanOnly.issues.length, 0, "한글 위주 + 지시어 + 스타일 있으면 이슈 없음");

  const noDirective = window.getGuidelineComplianceIssues("가사만 있고 지시어 없음", "style");
  assert.ok(noDirective.issues.includes("Suno 지시어 없음"));

  const noStyle = window.getGuidelineComplianceIssues("[Intro]\n가사", "");
  assert.ok(noStyle.issues.includes("스타일 프롬프트 없음"));

  const heavyEnglish = window.getGuidelineComplianceIssues(
    "[Intro]\nThis is mostly English lyrics with very little Korean content here today",
    "style",
  );
  assert.ok(
    heavyEnglish.issues.some((i) => i.includes("영어 표현 비율 높음")),
    "영어 비율이 높으면 이슈로 감지되어야 함",
  );

  // ═══════════════════════════════════════════════════════════════
  // 2. renderGuidelineComplianceStatus: 이슈 유무에 따른 렌더링 분기
  // ═══════════════════════════════════════════════════════════════
  window.renderGuidelineComplianceStatus("[Intro]\n한글 가사", "style", "테스트 라벨");
  const statusEl = elements.get("finalLyricsStatus");
  assert.ok(statusEl.innerHTML.includes("지침서 기본 점검 통과"));
  assert.ok(statusEl.innerHTML.includes("테스트 라벨"));

  window.renderGuidelineComplianceStatus("가사만", "", "라벨2");
  assert.ok(statusEl.innerHTML.includes("지침서 확인 필요"));

  // ═══════════════════════════════════════════════════════════════
  // 3. enforceGuidelinesOnFinalContent: 지침서 없으면 AI 호출 안 함
  // ═══════════════════════════════════════════════════════════════
  localStore.musicCreatorGuidelines = "";
  localStore.musicCreator_guidelines = "";
  geminiCalls.length = 0;
  let fetchCallCount = 0;
  nextFetchImpl = async () => {
    fetchCallCount++;
    throw new Error("호출되면 안 됨");
  };
  const noGuidelinesResult = await window.enforceGuidelinesOnFinalContent("가사", "스타일");
  assert.strictEqual(noGuidelinesResult.compliance, "no-guidelines");
  assert.strictEqual(geminiCalls.length, 0);
  assert.strictEqual(fetchCallCount, 0);

  // ═══════════════════════════════════════════════════════════════
  // 4. enforceGuidelinesOnFinalContent: Gemini 성공
  // ═══════════════════════════════════════════════════════════════
  localStore.musicCreatorGuidelines = "금지어: 슬픔. 한글 위주로 작성.";
  nextGeminiKey = "AIzaTestKey";
  nextGeminiImpl = async () =>
    JSON.stringify({
      lyrics: "[Intro]\n보정된 가사",
      style: "보정된 스타일",
      compliance: "corrected",
      issues: ["금지어 제거"],
    });
  const enforced = await window.enforceGuidelinesOnFinalContent("원본 가사", "원본 스타일");
  assert.strictEqual(enforced.lyrics, "[Intro]\n보정된 가사");
  assert.strictEqual(enforced.compliance, "corrected");
  assert.deepStrictEqual(enforced.issues, ["금지어 제거"]);
  assert.ok(apiUsageLogs.includes("gemini"));

  // ═══════════════════════════════════════════════════════════════
  // 5. enforceGuidelinesOnFinalContent: Gemini 실패 + OpenAI 키도 없음
  //    → 로컬 점검 결과만 반환 (예외를 던지지 않고 폴백)
  // ═══════════════════════════════════════════════════════════════
  nextGeminiKey = "";
  nextOpenAIKey = "";
  const localOnly = await window.enforceGuidelinesOnFinalContent("가사만 있음", "");
  assert.strictEqual(localOnly.compliance, "local-check-only");
  assert.ok(localOnly.issues.some((i) => i.includes("AI 검수 실패")));
  assert.ok(localOnly.issues.some((i) => i === "스타일 프롬프트 없음"), "로컬 점검 이슈도 함께 포함되어야 함");

  // ═══════════════════════════════════════════════════════════════
  // 6. displayImprovements: feedbacks 우선, 빈 데이터 처리
  // ═══════════════════════════════════════════════════════════════
  window.displayImprovements({ improvements: [], feedbacks: [] });
  assert.ok(elements.get("geminiSuggestionsSummary").innerHTML.includes("분석된 개선안이 없습니다"));

  window.displayImprovements({
    improvements: ["이 텍스트는 무시되어야 함"],
    feedbacks: [{ category: "구성", suggestion: "후렴 강화" }],
  });
  const feedbackHtml = elements.get("geminiSuggestionsSummary").innerHTML;
  assert.ok(feedbackHtml.includes("후렴 강화"), "suggestion이 있는 feedbacks가 우선 사용되어야 함");
  assert.ok(!feedbackHtml.includes("무시되어야 함"), "feedbacks가 있으면 improvements는 표시하지 않아야 함(단일 소스 전략)");

  window.displayImprovements({
    improvements: [{ text: "객체형 개선안" }, "문자열형 개선안", ""],
    feedbacks: [{ category: "구성", suggestion: "" }], // suggestion 없는 feedback은 무시
  });
  const improvementHtml = elements.get("geminiSuggestionsSummary").innerHTML;
  assert.ok(improvementHtml.includes("객체형 개선안"));
  assert.ok(improvementHtml.includes("문자열형 개선안"));

  // ═══════════════════════════════════════════════════════════════
  // 7. confirmFinalizedContent: 빈 가사 차단 + 정상 4→5단계 전달
  // ═══════════════════════════════════════════════════════════════
  elements.get("finalizedLyrics").value = "";
  toastMessages.length = 0;
  window.editMode = false;
  window.confirmFinalizedContent();
  assert.strictEqual(window.editMode, true, "클릭 즉시 수정 모드로 전환");
  assert.ok(toastMessages.some((m) => m.includes("확정된 가사를 먼저 입력해주세요")));
  assert.strictEqual(goToStepCalls.length, 0);

  elements.get("finalizedLyrics").value = "[Intro]\n확정된 최종 가사";
  elements.get("finalizedStyle").value = "확정된 스타일";
  elements.get("sunoTitle").value = "최종 제목";
  goToStepCalls.length = 0;
  window.confirmFinalizedContent();
  assert.strictEqual(elements.get("finalTitleText").textContent, "최종 제목");
  assert.strictEqual(elements.get("finalLyrics").textContent, "[Intro]\n확정된 최종 가사");
  assert.strictEqual(elements.get("finalStyle").textContent, "확정된 스타일");
  assert.strictEqual(elements.get("intermediateLyricsPreview").textContent, "[Intro]\n확정된 최종 가사");
  assert.strictEqual(window.currentSunoTitle, "최종 제목");
  assert.strictEqual(window.currentFinalLyrics, "[Intro]\n확정된 최종 가사");
  assert.deepStrictEqual(goToStepCalls[goToStepCalls.length - 1], [5, true, false]);

  // ═══════════════════════════════════════════════════════════════
  // 8. applyExtractedLyrics: 반영할 가사 없음
  // ═══════════════════════════════════════════════════════════════
  window.extractedLyricsForApply = null;
  toastMessages.length = 0;
  await window.applyExtractedLyrics(null);
  assert.ok(toastMessages.some((m) => m.includes("반영할 가사가 없습니다")));

  // ═══════════════════════════════════════════════════════════════
  // 9. applyExtractedLyrics: API 키 없으면 원문 그대로 반영
  // ═══════════════════════════════════════════════════════════════
  window.extractedLyricsForApply = "추출된 순수 가사";
  nextGeminiKey = "";
  nextOpenAIKey = "";
  window.currentProject = { data: {} };
  copyIndicatorMessages.length = 0;
  fetchCallCount = 0;
  await window.applyExtractedLyrics(null);
  assert.strictEqual(elements.get("finalLyrics").textContent, "추출된 순수 가사");
  assert.strictEqual(elements.get("finalizedLyrics").value, "추출된 순수 가사");
  assert.strictEqual(window.currentProject.data.finalLyrics, "추출된 순수 가사");
  assert.strictEqual(fetchCallCount, 0, "API 키가 없으면 AI를 호출하지 않아야 함");
  assert.ok(copyIndicatorMessages.some((m) => m.includes("최종 가사에 반영되었습니다")));
  assert.strictEqual(requestFinalEvaluationRefreshCalls.length, 1);

  // ═══════════════════════════════════════════════════════════════
  // 10. applyExtractedLyrics: API 키 있으면 AI 지시어 보강 시도(성공)
  // ═══════════════════════════════════════════════════════════════
  nextGeminiKey = "AIzaTestKey";
  nextGeminiImpl = async (prompt) => {
    // callExtractedLyricsInstructionAI 호출과 enforceGuidelinesOnFinalContent 호출을 구분
    if (prompt.includes("음원에서 추출된 순수 가사")) {
      return "```text\n[Verse 1]\nAI가 지시어를 추가한 가사\n```";
    }
    // enforceGuidelinesOnFinalContent 쪽 (지침서가 비어 있으면 애초에 호출 안 됨)
    return JSON.stringify({ lyrics: "지침서 보정된 가사", style: "보정 스타일", compliance: "pass", issues: [] });
  };
  const btn = createStubElement();
  btn.innerHTML = "원래 버튼 텍스트";
  copyIndicatorMessages.length = 0;
  await window.applyExtractedLyrics(btn);
  assert.strictEqual(btn.disabled, false, "완료 후 버튼이 다시 활성화되어야 함");
  assert.strictEqual(btn.innerHTML, "원래 버튼 텍스트", "완료 후 버튼 텍스트가 원복되어야 함");
  assert.strictEqual(
    elements.get("finalLyrics").textContent,
    "지침서 보정된 가사",
    "지침서가 설정되어 있으면 지시어 생성 후 지침서 검수까지 이어져야 함",
  );
  assert.ok(copyIndicatorMessages.some((m) => m.includes("지침서를 반영하여")));

  // ═══════════════════════════════════════════════════════════════
  // 11. applyExtractedLyrics: AI 실패 시 원문 폴백 + 오류 토스트
  // ═══════════════════════════════════════════════════════════════
  nextGeminiImpl = async () => {
    throw new Error("Gemini 오류");
  };
  nextOpenAIKey = ""; // OpenAI 폴백도 불가능하게
  toastMessages.length = 0;
  await window.applyExtractedLyrics(null);
  assert.strictEqual(elements.get("finalLyrics").textContent, "추출된 순수 가사", "AI 실패 시 원문으로 폴백");
  assert.ok(toastMessages.some((m) => m.includes("AI 지시어 생성에 실패")));

  // ═══════════════════════════════════════════════════════════════
  // 12. updateSelectedCount / selectAllImprovements / deselectAllImprovements
  // ═══════════════════════════════════════════════════════════════
  improvementCheckboxes = [makeCheckbox(0, "improvement", false), makeCheckbox(1, "improvement", true)];
  window.updateSelectedCount();
  assert.strictEqual(elements.get("selectedImprovementCount").textContent, 1);
  assert.strictEqual(elements.get("applySelectedBtn").disabled, false);
  assert.strictEqual(improvementCheckboxes[1]._parent.classList.contains("selected"), true);

  window.selectAllImprovements();
  assert.strictEqual(elements.get("selectedImprovementCount").textContent, 2);
  window.deselectAllImprovements();
  assert.strictEqual(elements.get("selectedImprovementCount").textContent, 0);
  assert.strictEqual(elements.get("applySelectedBtn").disabled, true);

  // ═══════════════════════════════════════════════════════════════
  // 13. toggleEditFinalizedLyrics / toggleEditFinalizedStyle
  // ═══════════════════════════════════════════════════════════════
  elements.get("finalizedLyrics").readOnly = true;
  window.toggleEditFinalizedLyrics();
  assert.strictEqual(elements.get("finalizedLyrics").readOnly, false, "수정 모드로 전환되어야 함");
  assert.ok(elements.get("editFinalizedLyricsBtn").innerHTML.includes("저장"));
  window.toggleEditFinalizedLyrics();
  assert.strictEqual(elements.get("finalizedLyrics").readOnly, true, "다시 읽기 전용으로 전환되어야 함");
  assert.ok(elements.get("editFinalizedLyricsBtn").innerHTML.includes("수정하기"));

  // ═══════════════════════════════════════════════════════════════
  // 14. applyAllImprovements: 개선안 없음 vs 전체 선택 후 적용
  // ═══════════════════════════════════════════════════════════════
  improvementCheckboxes = [];
  toastMessages.length = 0;
  await window.applyAllImprovements();
  assert.ok(toastMessages.some((m) => m.includes("적용할 개선안이 없습니다")));

  // ═══════════════════════════════════════════════════════════════
  // 15. applySelectedImprovements: 선택 없음 차단
  // ═══════════════════════════════════════════════════════════════
  improvementCheckboxes = [];
  toastMessages.length = 0;
  const noSelectionResult = await window.applySelectedImprovements();
  assert.ok(toastMessages.some((m) => m.includes("적용할 개선안을 선택해주세요")));

  // ═══════════════════════════════════════════════════════════════
  // 16. applySelectedImprovements: Gemini 성공 → 이력 저장 + 필드 갱신
  // ═══════════════════════════════════════════════════════════════
  window.currentProject = {
    data: {
      analysis: {
        improvements: ["단순 개선안"],
        feedbacks: [{ category: "구성", suggestion: "후렴 보강" }],
      },
    },
  };
  improvementCheckboxes = [makeCheckbox(0, "feedback", true)];
  elements.get("finalizedLyrics").value = "현재 가사";
  elements.get("finalizedStyle").value = "현재 스타일";
  nextGeminiKey = "AIzaTestKey";
  nextGeminiImpl = async () =>
    JSON.stringify({ lyrics: "Gemini로 개선된 가사", style: "Gemini로 개선된 스타일" });
  const successResult = await window.applySelectedImprovements();
  assert.strictEqual(successResult, true);
  assert.strictEqual(elements.get("finalizedLyrics").value, "Gemini로 개선된 가사");
  assert.strictEqual(elements.get("finalizedStyle").value, "Gemini로 개선된 스타일");
  assert.strictEqual(
    window.currentProject.data.regenerationHistory[0].lyrics,
    "현재 가사",
    "적용 직전 상태가 이력에 저장되어야 함",
  );
  assert.strictEqual(elements.get("applySelectedBtn").disabled, false, "완료 후 버튼이 복구되어야 함");

  // ═══════════════════════════════════════════════════════════════
  // 17. applySelectedImprovements: Gemini 실패 → OpenAI 폴백 성공
  // ═══════════════════════════════════════════════════════════════
  improvementCheckboxes = [makeCheckbox(0, "improvement", true)];
  nextGeminiImpl = async () => {
    throw new Error("Gemini 다운");
  };
  nextOpenAIKey = "sk-test-key";
  nextFetchImpl = async () =>
    chatCompletionResponse({ lyrics: "OpenAI로 개선된 가사", style: "OpenAI로 개선된 스타일" });
  const fallbackResult = await window.applySelectedImprovements();
  assert.strictEqual(fallbackResult, true);
  assert.strictEqual(elements.get("finalizedLyrics").value, "OpenAI로 개선된 가사");
  assert.ok(geminiFailureCalls.length > 0, "Gemini 실패가 handleGeminiApiFailure로 전달되어야 함");

  // ═══════════════════════════════════════════════════════════════
  // 18. applySelectedImprovements: Gemini/OpenAI 둘 다 실패 → false 반환
  // ═══════════════════════════════════════════════════════════════
  improvementCheckboxes = [makeCheckbox(0, "improvement", true)];
  nextOpenAIKey = "";
  toastMessages.length = 0;
  const bothFailResult = await window.applySelectedImprovements();
  assert.strictEqual(bothFailResult, false);
  assert.ok(toastMessages.some((m) => m.includes("개선안 적용 중 오류가 발생했습니다")));

  // ═══════════════════════════════════════════════════════════════
  // 19. regenerateFinalizedContent: 확인 취소 시 아무 것도 안 함
  // ═══════════════════════════════════════════════════════════════
  nextConfirmResult = false;
  let applySelectedCalled = false;
  const originalApplySelected = window.applySelectedImprovements;
  window.applySelectedImprovements = async () => {
    applySelectedCalled = true;
    return true;
  };
  await window.regenerateFinalizedContent();
  assert.strictEqual(applySelectedCalled, false);
  window.applySelectedImprovements = originalApplySelected;

  // ═══════════════════════════════════════════════════════════════
  // 20. saveToRegenerationHistory: 최대 10개 제한
  // ═══════════════════════════════════════════════════════════════
  window.currentProject = { data: {} };
  for (let i = 0; i < 12; i++) {
    window.saveToRegenerationHistory(`가사${i}`, `스타일${i}`, "테스트");
  }
  assert.strictEqual(window.currentProject.data.regenerationHistory.length, 10, "이력은 최대 10개까지만 유지");
  assert.strictEqual(
    window.currentProject.data.regenerationHistory[0].lyrics,
    "가사11",
    "가장 최근 항목이 맨 앞에 와야 함(unshift)",
  );

  // ═══════════════════════════════════════════════════════════════
  // 21. restoreFromHistory: 확인 게이팅 + 복구 전 현재 내용 저장
  // ═══════════════════════════════════════════════════════════════
  window.currentProject.data.regenerationHistory = [
    { timestamp: new Date(0).toISOString(), lyrics: "이력 가사", style: "이력 스타일", type: "테스트" },
  ];
  elements.get("finalizedLyrics").value = "복구 전 현재 가사";
  elements.get("finalizedStyle").value = "복구 전 현재 스타일";

  nextConfirmResult = false;
  await window.restoreFromHistory(0);
  assert.strictEqual(elements.get("finalizedLyrics").value, "복구 전 현재 가사", "확인 취소 시 복구되지 않아야 함");

  nextConfirmResult = true;
  copyIndicatorMessages.length = 0;
  await window.restoreFromHistory(0);
  assert.strictEqual(elements.get("finalizedLyrics").value, "이력 가사");
  assert.strictEqual(elements.get("finalizedStyle").value, "이력 스타일");
  assert.ok(
    window.currentProject.data.regenerationHistory.some((h) => h.lyrics === "복구 전 현재 가사"),
    "복구 직전 상태가 이력에 추가 저장되어야 함",
  );
  assert.ok(copyIndicatorMessages.some((m) => m.includes("복구되었습니다")));

  originalConsole.log("MV step4 finalize flow smoke test: PASS");
  process.exit(0);
})().catch((err) => {
  originalConsole.error(err);
  process.exit(1);
});
