// js/step1.js (AI 가사 생성 플로우) 자동화 테스트
//
// Step1(AI 가사 생성 → 옵션 선택 → 확정)에는 지금까지 자동화 테스트가
// 전혀 없었다. fetch(OpenAI API)를 목으로 대체해 다음을 검증한다:
//   - 태그 선택 수집(getSelectedTags), 지시어 커서 삽입(insertDirectiveToLyrics)
//   - generateAILyrics(): 재진입 방지, API 키 미설정 시 차단, 정상 생성 시
//     카드 렌더링, malformed JSON일 때 parseJSONManually 폴백, API 오류 처리
//   - parseJSONManually(): 이스케이프 문자 복원, 최대 4개 제한
//   - selectLyricsLength(): 컨테이너 내 상호 배타적 토글
//   - generateStylePromptFromLyrics(): 지시어 파싱 → 스타일 요소 추출,
//     섹션 마커 제외, 중복 방지, 품질 태그 자동 보강 조건
//   - confirmSelectedLyrics(): API 키 없을 때 수동 생성 스타일 프롬프트로
//     대체, 리터럴 \n 실제 줄바꿈 변환, 자동 저장 호출
//   - selectLyricsOption()/backToOptions(): 카드 강조 및 상태 전환

const assert = require("assert");

const originalConsole = { ...console };
console.log = function () {};
console.warn = function () {};
console.error = function () {};

// ─── DOM 스텁 ─────────────────────────────────────────────────
function createStubElement(id) {
  const classes = new Set();
  const listeners = {};
  return {
    id: id || "",
    value: "",
    textContent: "",
    innerHTML: "",
    style: {},
    dataset: {},
    disabled: false,
    offsetParent: {}, // 기본적으로 "화면에 보이는" 상태
    selectionStart: 0,
    _attrs: {},
    classList: {
      add(...c) {
        c.forEach((x) => classes.add(x));
      },
      remove(...c) {
        c.forEach((x) => classes.delete(x));
      },
      toggle(c) {
        classes.has(c) ? classes.delete(c) : classes.add(c);
        return classes.has(c);
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
    addEventListener(type, cb) {
      listeners[type] = cb;
    },
    _trigger(type, evt) {
      if (listeners[type]) listeners[type](evt);
    },
    focus() {},
    setSelectionRange() {},
    appendChild() {},
    querySelectorAll() {
      return [];
    },
    closest() {
      return null;
    },
  };
}

function makeTagButton(value, opts = {}) {
  const btn = createStubElement();
  btn.dataset.value = value;
  btn._attrs["data-value"] = value;
  btn.textContent = value;
  btn.classList.add("tag-btn", "active");
  if (opts.custom) btn.classList.add("custom-tag-btn");
  return btn;
}

function makeTagContainer(values, opts = {}) {
  const container = createStubElement();
  const buttons = values.map((v) => makeTagButton(v, opts));
  container.querySelectorAll = (selector) => {
    if (selector === ".tag-btn.active") return buttons;
    return [];
  };
  return container;
}

const elementIds = [
  "editedLyrics",
  "originalLyrics",
  "additionalKeywords",
  "referenceLyrics",
  "referenceSongTitle",
  "referenceArtist",
  "aiGeneratedResults",
  "aiLyricsLoading",
  "aiLyricsOptions",
  "selectedLyricsEdit",
  "lyricsOptionsGrid",
  "editedTitle",
  "songTitle",
  "songTitleText",
  "finalTitleText",
  "currentSongTitle",
  "manualStylePrompt",
  "eraTags",
  "themeTags",
  "perspectiveTags",
  "timeTags",
  "specialTags",
  "regionTags",
  "genreTags",
  "moodTags",
];
const elements = new Map();
elementIds.forEach((id) => elements.set(id, createStubElement(id)));

let activeLengthBtn = null;
const cardStore = { cards: [] };

global.window = global;
global.document = {
  readyState: "complete", // 항상 즉시 initSync가 실행되도록 (title-sync IIFE)
  getElementById(id) {
    return elements.has(id) ? elements.get(id) : null;
  },
  querySelector(selector) {
    if (selector === ".length-btn.active") return activeLengthBtn;
    if (selector === 'button[onclick="confirmSelectedLyrics()"]') {
      return elements.get("confirmBtn") || null;
    }
    return null;
  },
  createElement() {
    const el = createStubElement();
    cardStore.cards.push(el);
    return el;
  },
  addEventListener() {},
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

const toastMessages = [];
window.showToast = (msg) => toastMessages.push(msg);
const copyIndicatorMessages = [];
window.showCopyIndicator = (msg) => copyIndicatorMessages.push(msg);

let saveCurrentProjectCalls = 0;
window.saveCurrentProject = () => {
  saveCurrentProjectCalls++;
};
const switchLyricsModeCalls = [];
window.switchLyricsMode = (mode) => switchLyricsModeCalls.push(mode);

let nextOpenAIKey = "sk-test-key";
window.getOpenAIApiKey = () => nextOpenAIKey;
window.getOpenAIModel = () => "gpt-4o-mini";

let nextFetchImpl = null;
global.fetch = async (...args) => nextFetchImpl(...args);

require("../js/step1.js");

assert.strictEqual(typeof window.generateAILyrics, "function");
assert.strictEqual(typeof window.confirmSelectedLyrics, "function");

function chatCompletionResponse(contentObjOrString) {
  const content =
    typeof contentObjOrString === "string"
      ? contentObjOrString
      : JSON.stringify(contentObjOrString);
  return {
    ok: true,
    status: 200,
    async json() {
      return { choices: [{ message: { content } }] };
    },
  };
}

(async () => {
  // ═══════════════════════════════════════════════════════════════
  // 1. getSelectedTags: '+' 등 플레이스홀더 제외
  // ═══════════════════════════════════════════════════════════════
  const testContainer = createStubElement();
  testContainer.querySelectorAll = () => [
    (() => {
      const b = makeTagButton("발라드");
      return b;
    })(),
    (() => {
      const b = createStubElement();
      b.dataset.value = "";
      b.textContent = "+";
      return b;
    })(),
    (() => {
      const b = createStubElement();
      b.dataset.value = "";
      b.textContent = "기타(추가)";
      return b;
    })(),
  ];
  const getElByIdOrig = document.getElementById;
  document.getElementById = (id) => (id === "customContainer" ? testContainer : getElByIdOrig(id));
  assert.deepStrictEqual(window.getSelectedTags("customContainer"), ["발라드"]);
  document.getElementById = getElByIdOrig;

  // ═══════════════════════════════════════════════════════════════
  // 2. insertDirectiveToLyrics: 커서 위치에 지시어 삽입
  // ═══════════════════════════════════════════════════════════════
  const edited = elements.get("editedLyrics");
  const original = elements.get("originalLyrics");
  edited.offsetParent = null; // 화면에 보이지 않음(수정 모드가 아님)
  original.offsetParent = {}; // 화면에 보임
  original.value = "가사 앞부분가사 뒷부분";
  original.selectionStart = 6; // "가사 앞부분" 뒤
  window.insertDirectiveToLyrics("[Chorus]");
  assert.strictEqual(original.value, "가사 앞부분[Chorus]\n가사 뒷부분");

  edited.offsetParent = {}; // editedLyrics가 화면에 보이면 그쪽을 우선
  edited.value = "abc";
  edited.selectionStart = 3;
  window.insertDirectiveToLyrics("[Verse]");
  assert.strictEqual(edited.value, "abc[Verse]\n");

  // ═══════════════════════════════════════════════════════════════
  // 3. selectLyricsLength: 같은 컨테이너 내 상호 배타 토글
  // ═══════════════════════════════════════════════════════════════
  const lengthContainer = createStubElement();
  const btnA = createStubElement();
  btnA.classList.add("length-btn", "active");
  const btnB = createStubElement();
  btnB.classList.add("length-btn");
  lengthContainer.querySelectorAll = (sel) => (sel === ".length-btn" ? [btnA, btnB] : []);
  btnA.closest = () => lengthContainer;
  btnB.closest = () => lengthContainer;

  window.selectLyricsLength("normal", btnB, { preventDefault() {}, stopPropagation() {} });
  assert.strictEqual(btnB.classList.contains("active"), true, "클릭한 버튼은 활성화");
  assert.strictEqual(btnA.classList.contains("active"), false, "같은 컨테이너의 다른 버튼은 해제");

  // ═══════════════════════════════════════════════════════════════
  // 4. parseJSONManually: 정상/이스케이프/최대 4개 제한/매치 없음
  // ═══════════════════════════════════════════════════════════════
  assert.deepStrictEqual(window.parseJSONManually("not json at all"), []);

  const manualJson = `{"lyrics": [
    {"title": "제목1", "content": "줄1\\n줄2 \\"인용\\""},
    {"title": "제목2", "content": "본문2"},
    {"title": "제목3", "content": "본문3"},
    {"title": "제목4", "content": "본문4"},
    {"title": "제목5(잘려야함)", "content": "본문5"}
  ]}`;
  const parsed = window.parseJSONManually(manualJson);
  assert.strictEqual(parsed.length, 4, "최대 4개까지만 파싱해야 함");
  assert.strictEqual(parsed[0].title, "제목1");
  assert.strictEqual(parsed[0].content, '줄1\n줄2 "인용"');

  // ═══════════════════════════════════════════════════════════════
  // 5. generateStylePromptFromLyrics: 지시어 파싱 + 태그 결합
  // ═══════════════════════════════════════════════════════════════
  document.getElementById = (id) => {
    if (id === "genreTags") return makeTagContainer(["K-Pop"]);
    if (id === "moodTags") return makeTagContainer(["잔잔한"]);
    return getElByIdOrig(id);
  };
  const lyricsWithDirectives = `[Intro]
[Tempo: 72 BPM]
[Vocal: soft]
[Instruments: acoustic guitar]
[Mood: nostalgic]
[Verse 1]
가사 내용`;
  const stylePrompt = window.generateStylePromptFromLyrics(lyricsWithDirectives, "제목");
  assert.ok(stylePrompt.includes("K-Pop"), "태그 UI에서 선택한 장르 포함");
  assert.ok(stylePrompt.includes("잔잔한"), "태그 UI에서 선택한 분위기 포함");
  assert.ok(stylePrompt.includes("72 BPM"), "Tempo 지시어 값 포함");
  assert.ok(stylePrompt.includes("soft"), "Vocal 지시어 값 포함");
  assert.ok(stylePrompt.includes("acoustic guitar"), "Instruments 지시어 값 포함");
  assert.ok(!stylePrompt.includes("Intro"), "섹션 마커([Intro] 등)는 제외되어야 함");
  assert.ok(!stylePrompt.includes("Verse 1"), "섹션 마커는 제외되어야 함");
  // 요소 수(K-Pop, 잔잔한, 72 BPM, soft, acoustic guitar, nostalgic = 6개) >= 5개이므로
  // 품질 태그(emotional, studio quality)는 추가로 붙지 않아야 함
  assert.ok(!stylePrompt.includes("studio quality"), "요소가 충분하면 품질 태그를 추가로 붙이지 않음");

  const minimalPrompt = window.generateStylePromptFromLyrics("[Tempo: 90 BPM]", "");
  assert.ok(
    minimalPrompt.includes("emotional") && minimalPrompt.includes("studio quality"),
    "요소가 적으면(5개 미만) 기본 품질 태그가 보강되어야 함",
  );

  document.getElementById = getElByIdOrig;

  // ═══════════════════════════════════════════════════════════════
  // 6. generateAILyrics: API 키 미설정 시 차단
  // ═══════════════════════════════════════════════════════════════
  nextOpenAIKey = "";
  toastMessages.length = 0;
  let fetchCallCount = 0;
  nextFetchImpl = async () => {
    fetchCallCount++;
    throw new Error("호출되면 안 됨");
  };
  elements.get("aiGeneratedResults").style.display = "";
  await window.generateAILyrics();
  assert.strictEqual(fetchCallCount, 0, "API 키가 없으면 fetch를 호출하면 안 됨");
  assert.ok(toastMessages.some((m) => m.includes("ChatGPT API 키를 먼저 설정")));
  assert.strictEqual(elements.get("aiGeneratedResults").style.display, "none");

  // ═══════════════════════════════════════════════════════════════
  // 7. generateAILyrics: 재진입 방지
  // ═══════════════════════════════════════════════════════════════
  nextOpenAIKey = "sk-test-key";
  window.__isGeneratingAILyrics = true;
  toastMessages.length = 0;
  fetchCallCount = 0;
  await window.generateAILyrics();
  assert.strictEqual(fetchCallCount, 0, "이미 생성 중이면 fetch를 다시 호출하면 안 됨");
  assert.ok(toastMessages.some((m) => m.includes("이미 AI 가사를 생성하고 있습니다")));
  window.__isGeneratingAILyrics = false;

  // ═══════════════════════════════════════════════════════════════
  // 8. generateAILyrics: 정상 생성 → 카드 렌더링
  // ═══════════════════════════════════════════════════════════════
  document.getElementById = (id) => {
    if (id === "genreTags") return makeTagContainer(["발라드"]);
    return getElByIdOrig(id);
  };
  elements.get("lyricsOptionsGrid").appendChild = function (child) {
    this._children = this._children || [];
    this._children.push(child);
  };
  nextFetchImpl = async (url, opts) => {
    const body = JSON.parse(opts.body);
    assert.ok(body.messages[1].content.includes("발라드"), "선택한 장르 태그가 프롬프트에 포함되어야 함");
    return chatCompletionResponse({
      lyrics: [
        { title: "노래1", content: "[Intro]\n가사1" },
        { title: "노래2", content: "[Intro]\n가사2" },
      ],
    });
  };
  toastMessages.length = 0;
  await window.generateAILyrics();
  assert.strictEqual(window.generatedLyricsOptions.length, 2);
  assert.strictEqual(elements.get("lyricsOptionsGrid")._children.length, 2, "옵션 개수만큼 카드가 렌더링되어야 함");
  assert.strictEqual(elements.get("aiLyricsLoading").style.display, "none");
  assert.strictEqual(window.__isGeneratingAILyrics, false, "완료 후 재진입 플래그가 해제되어야 함");
  document.getElementById = getElByIdOrig;

  // ═══════════════════════════════════════════════════════════════
  // 9. generateAILyrics: malformed JSON → parseJSONManually 폴백
  // ═══════════════════════════════════════════════════════════════
  nextFetchImpl = async () =>
    chatCompletionResponse(
      `이것은 유효한 JSON이 아닙니다 {"lyrics": [{"title": "폴백곡", "content": "폴백 내용"}]} 뒤에 잡음`,
    );
  await window.generateAILyrics();
  assert.strictEqual(window.generatedLyricsOptions.length, 1);
  assert.strictEqual(window.generatedLyricsOptions[0].title, "폴백곡");

  // ═══════════════════════════════════════════════════════════════
  // 10. generateAILyrics: API 오류 응답 처리
  // ═══════════════════════════════════════════════════════════════
  nextFetchImpl = async () => ({
    ok: false,
    status: 429,
    async json() {
      return { error: { message: "요청 한도를 초과했습니다." } };
    },
  });
  toastMessages.length = 0;
  await window.generateAILyrics();
  assert.ok(toastMessages.some((m) => m.includes("요청 한도를 초과했습니다")));
  assert.strictEqual(window.__isGeneratingAILyrics, false, "오류 발생 후에도 재진입 플래그는 해제되어야 함");

  // ═══════════════════════════════════════════════════════════════
  // 11. selectLyricsOption / backToOptions
  // ═══════════════════════════════════════════════════════════════
  window.generatedLyricsOptions = [
    { title: "옵션A", content: "내용A\\n다음줄" },
    { title: "옵션B", content: "내용B" },
  ];
  const card0 = createStubElement();
  const card1 = createStubElement();
  elements.get("lyricsOptionsGrid").querySelectorAll = (sel) =>
    sel === ".lyrics-option-card" ? [card0, card1] : [];

  window.selectLyricsOption(0);
  assert.strictEqual(elements.get("editedTitle").value, "옵션A");
  assert.strictEqual(elements.get("editedLyrics").value, "내용A\n다음줄", "리터럴 \\n이 실제 줄바꿈으로 변환되어야 함");
  assert.strictEqual(elements.get("selectedLyricsEdit").style.display, "block");
  assert.strictEqual(card0.style.borderColor, "var(--accent)");
  assert.strictEqual(card1.style.borderColor, "var(--border)");
  assert.strictEqual(window.selectedLyricsIndex, 0);

  toastMessages.length = 0;
  window.selectLyricsOption(99);
  assert.ok(toastMessages.some((m) => m.includes("선택할 가사를 찾을 수 없습니다")));

  window.backToOptions();
  assert.strictEqual(elements.get("selectedLyricsEdit").style.display, "none");
  assert.strictEqual(window.selectedLyricsIndex, null);

  // ═══════════════════════════════════════════════════════════════
  // 12. confirmSelectedLyrics: 빈 가사 차단
  // ═══════════════════════════════════════════════════════════════
  elements.get("editedLyrics").value = "   ";
  toastMessages.length = 0;
  await window.confirmSelectedLyrics();
  assert.ok(toastMessages.some((m) => m.includes("가사를 입력해주세요")));

  // ═══════════════════════════════════════════════════════════════
  // 13. confirmSelectedLyrics: API 키 없으면 수동 스타일 프롬프트로 확정
  // ═══════════════════════════════════════════════════════════════
  nextOpenAIKey = "";
  elements.get("editedTitle").value = "최종 제목";
  elements.get("editedLyrics").value = "[Tempo: 100 BPM]\n최종 가사 본문";
  fetchCallCount = 0;
  nextFetchImpl = async () => {
    fetchCallCount++;
    throw new Error("호출되면 안 됨");
  };
  saveCurrentProjectCalls = 0;
  switchLyricsModeCalls.length = 0;
  copyIndicatorMessages.length = 0;
  await window.confirmSelectedLyrics();
  assert.strictEqual(fetchCallCount, 0, "API 키가 없으면 AI 지시어 변환을 시도하지 않아야 함");
  assert.strictEqual(elements.get("songTitle").value, "최종 제목");
  assert.strictEqual(elements.get("originalLyrics").value, "[Tempo: 100 BPM]\n최종 가사 본문");
  assert.ok(
    elements.get("manualStylePrompt").value.includes("100 BPM"),
    "수동 생성된 스타일 프롬프트가 반영되어야 함",
  );
  assert.deepStrictEqual(switchLyricsModeCalls, ["manual"]);
  assert.strictEqual(saveCurrentProjectCalls, 1, "확정 시 자동 저장이 호출되어야 함");
  assert.ok(copyIndicatorMessages.some((m) => m.includes("가사가 확정되었습니다")));

  // ═══════════════════════════════════════════════════════════════
  // 14. confirmSelectedLyrics: API 키가 있으면 AI 결과로 가사/스타일 대체
  // ═══════════════════════════════════════════════════════════════
  nextOpenAIKey = "sk-test-key";
  elements.get("editedLyrics").value = "원본 가사";
  nextFetchImpl = async () =>
    chatCompletionResponse({
      style_prompt: "warm acoustic ballad, emotional",
      lyrics: "[Intro]\\nAI가 다듬은 가사",
    });
  await window.confirmSelectedLyrics();
  assert.strictEqual(
    elements.get("originalLyrics").value,
    "[Intro]\nAI가 다듬은 가사",
    "AI가 반환한 가사(리터럴 \\n 변환)로 교체되어야 함",
  );
  assert.strictEqual(elements.get("manualStylePrompt").value, "warm acoustic ballad, emotional");

  originalConsole.log("MV step1 lyrics flow smoke test: PASS");
  process.exit(0);
})().catch((err) => {
  originalConsole.error(err);
  process.exit(1);
});
