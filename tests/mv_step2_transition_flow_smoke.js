// js/step2.js (수노 변환 · 단계 전환) 자동화 테스트
//
// Step2(1→2단계 전달, 커스텀 태그 추가, 2→3단계 전달)에는 지금까지
// 자동화 테스트가 전혀 없었다. AI/네트워크 호출이 없는 순수 DOM 전이
// 로직이라 모두 실제 동작 검증으로 커버한다.

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
    className: "",
    style: {},
    _attrs: {},
    focusCalled: false,
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
    setAttribute(k, v) {
      this._attrs[k] = v;
    },
    getAttribute(k) {
      return this._attrs[k] === undefined ? null : this._attrs[k];
    },
    focus() {
      this.focusCalled = true;
    },
    querySelector() {
      return null;
    },
    insertBefore(newEl) {
      this._children = this._children || [];
      this._children.unshift(newEl);
    },
    appendChild(newEl) {
      this._children = this._children || [];
      this._children.push(newEl);
    },
  };
}

const elementIds = [
  "originalLyrics",
  "manualStylePrompt",
  "sunoLyrics",
  "stylePrompt",
  "songTitle",
  "sunoTitle",
  "analysisTargetLyrics",
  "analysisTargetStyle",
];
const elements = new Map();
elementIds.forEach((id) => elements.set(id, createStubElement(id)));

global.window = global;
global.requestAnimationFrame = (cb) => cb();
global.document = {
  getElementById(id) {
    return elements.has(id) ? elements.get(id) : null;
  },
  createElement() {
    return createStubElement();
  },
};

const toastMessages = [];
window.showToast = (msg) => toastMessages.push(msg);

let nextConfirmResult = true;
window.showConfirmAsync = async () => nextConfirmResult;
let nextPromptResult = null;
window.showPromptAsync = async () => nextPromptResult;

const goToStepCalls = [];
window.goToStep = (...args) => goToStepCalls.push(args);
let saveCurrentProjectCalls = 0;
window.saveCurrentProject = () => {
  saveCurrentProjectCalls++;
};
let updateEditModeUICalls = 0;
window.updateEditModeUI = () => {
  updateEditModeUICalls++;
};
const setReadOnlyModeCalls = [];
window.setReadOnlyMode = (v) => setReadOnlyModeCalls.push(v);
let initializeTagButtonsCalls = 0;
window.initializeTagButtons = () => {
  initializeTagButtonsCalls++;
};
let generateStylePromptTranslationCalls = 0;
window.generateStylePromptTranslation = () => {
  generateStylePromptTranslationCalls++;
};

require("../js/step2.js");

assert.strictEqual(typeof window.convertToSuno, "function");
assert.strictEqual(typeof window.goToNextStep, "function");
assert.strictEqual(typeof window.goToStep2To3, "function");

(async () => {
  // ═══════════════════════════════════════════════════════════════
  // 1. convertToSuno: 가사 없으면 차단, 있으면 필드 복사
  // ═══════════════════════════════════════════════════════════════
  elements.get("originalLyrics").value = "";
  toastMessages.length = 0;
  window.convertToSuno();
  assert.ok(toastMessages.some((m) => m.includes("가사를 먼저 입력해주세요")));

  elements.get("originalLyrics").value = "원본 가사 내용";
  elements.get("manualStylePrompt").value = "warm ballad";
  elements.get("sunoLyrics").value = "";
  elements.get("stylePrompt").value = "";
  toastMessages.length = 0;
  window.convertToSuno();
  assert.strictEqual(elements.get("sunoLyrics").value, "원본 가사 내용");
  assert.strictEqual(elements.get("stylePrompt").value, "warm ballad");
  assert.ok(toastMessages.some((m) => m.includes("구현 중")));

  // ═══════════════════════════════════════════════════════════════
  // 2. showCustomTagInput: 입력 취소 시 버튼 추가 안 함
  // ═══════════════════════════════════════════════════════════════
  const container = createStubElement("genreTags");
  document.getElementById = (id) => (id === "genreTags" ? container : elements.get(id) || null);

  nextPromptResult = "";
  initializeTagButtonsCalls = 0;
  await window.showCustomTagInput("genreTags");
  assert.strictEqual(container._children, undefined, "빈 입력이면 태그가 추가되지 않아야 함");

  // ═══════════════════════════════════════════════════════════════
  // 3. showCustomTagInput: 정상 입력 시 커스텀 버튼 앞에 삽입
  // ═══════════════════════════════════════════════════════════════
  const customBtn = createStubElement();
  customBtn.className = "custom-tag-btn";
  container.querySelector = (sel) => (sel === ".custom-tag-btn" ? customBtn : null);

  nextPromptResult = " 신남 ";
  await window.showCustomTagInput("genreTags");
  assert.strictEqual(container._children.length, 1);
  assert.strictEqual(container._children[0].textContent, "신남", "trim된 값이 버튼 텍스트로 사용되어야 함");
  assert.strictEqual(container._children[0].getAttribute("data-value"), "신남");
  assert.strictEqual(initializeTagButtonsCalls, 1, "태그 버튼 이벤트가 재초기화되어야 함");

  // 컨테이너를 찾을 수 없으면 오류 토스트
  toastMessages.length = 0;
  await window.showCustomTagInput("nonexistentContainer");
  assert.ok(toastMessages.some((m) => m.includes("태그 컨테이너를 찾을 수 없습니다")));

  // 원상복구
  document.getElementById = (id) => (elements.has(id) ? elements.get(id) : null);

  // ═══════════════════════════════════════════════════════════════
  // 4. goToNextStep: 가사 없으면 차단
  // ═══════════════════════════════════════════════════════════════
  elements.get("originalLyrics").value = "";
  window.editMode = false;
  updateEditModeUICalls = 0;
  setReadOnlyModeCalls.length = 0;
  toastMessages.length = 0;
  goToStepCalls.length = 0;
  await window.goToNextStep();
  assert.strictEqual(window.editMode, true, "버튼 클릭 시 즉시 수정 모드로 전환되어야 함");
  assert.ok(toastMessages.some((m) => m.includes("가사를 먼저 입력하거나 생성해주세요")));
  assert.strictEqual(goToStepCalls.length, 0, "가사가 없으면 단계 이동을 하면 안 됨");

  // ═══════════════════════════════════════════════════════════════
  // 5. goToNextStep: 제목 없을 때 확인 취소 → 포커스만 하고 이동 안 함
  // ═══════════════════════════════════════════════════════════════
  elements.get("originalLyrics").value = "가사 본문";
  elements.get("songTitle").value = "";
  nextConfirmResult = false;
  goToStepCalls.length = 0;
  elements.get("songTitle").focusCalled = false;
  await window.goToNextStep();
  assert.strictEqual(goToStepCalls.length, 0, "제목 확인을 취소하면 이동하지 않아야 함");
  assert.strictEqual(elements.get("songTitle").focusCalled, true, "취소 시 제목 입력란에 포커스되어야 함");

  // ═══════════════════════════════════════════════════════════════
  // 6. goToNextStep: 정상 진행 — 데이터가 2단계 필드로 복사되고 저장/이동
  // ═══════════════════════════════════════════════════════════════
  elements.get("songTitle").value = "최종 제목";
  elements.get("manualStylePrompt").value = "cinematic style";
  elements.get("sunoTitle").value = "";
  elements.get("sunoLyrics").value = "";
  elements.get("stylePrompt").value = "";
  nextConfirmResult = true;
  saveCurrentProjectCalls = 0;
  goToStepCalls.length = 0;
  generateStylePromptTranslationCalls = 0;
  await window.goToNextStep();

  assert.strictEqual(elements.get("sunoTitle").value, "최종 제목");
  assert.strictEqual(elements.get("sunoLyrics").value, "가사 본문");
  assert.strictEqual(elements.get("stylePrompt").value, "cinematic style");
  assert.strictEqual(window.currentSunoTitle, "최종 제목");
  assert.strictEqual(saveCurrentProjectCalls, 1, "이동 전 자동 저장이 호출되어야 함");
  assert.deepStrictEqual(goToStepCalls[goToStepCalls.length - 1], [2, true, false]);

  // 스타일 프롬프트 번역은 setTimeout(500ms) 뒤에 실행되므로 대기 후 확인
  await new Promise((r) => setTimeout(r, 600));
  assert.strictEqual(
    generateStylePromptTranslationCalls,
    1,
    "스타일 프롬프트가 있으면 한글 해석이 자동 실행되어야 함",
  );

  // ═══════════════════════════════════════════════════════════════
  // 7. goToStep2To3: 수노 가사 없으면 차단
  // ═══════════════════════════════════════════════════════════════
  elements.get("sunoLyrics").value = "";
  goToStepCalls.length = 0;
  toastMessages.length = 0;
  window.editMode = false;
  window.goToStep2To3();
  assert.strictEqual(window.editMode, true);
  assert.ok(toastMessages.some((m) => m.includes("수노 가사를 먼저 생성해주세요")));
  assert.strictEqual(goToStepCalls.length, 0);

  // ═══════════════════════════════════════════════════════════════
  // 8. goToStep2To3: 정상 진행 — 3단계 분석 대상 필드로 복사
  // ═══════════════════════════════════════════════════════════════
  elements.get("sunoTitle").value = "곡 제목";
  elements.get("sunoLyrics").value = "완성된 수노 가사";
  elements.get("stylePrompt").value = "epic orchestral";
  elements.get("analysisTargetLyrics").textContent = "";
  elements.get("analysisTargetStyle").textContent = "";
  goToStepCalls.length = 0;
  window.goToStep2To3();

  assert.strictEqual(elements.get("analysisTargetLyrics").textContent, "완성된 수노 가사");
  assert.strictEqual(elements.get("analysisTargetStyle").textContent, "epic orchestral");
  assert.strictEqual(window.currentSunoTitle, "곡 제목");
  assert.deepStrictEqual(goToStepCalls[goToStepCalls.length - 1], [3, true, false]);

  originalConsole.log("MV step2 transition flow smoke test: PASS");
  process.exit(0);
})().catch((err) => {
  originalConsole.error(err);
  process.exit(1);
});
