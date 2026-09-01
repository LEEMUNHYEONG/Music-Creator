// js/ux.js 나머지 기능(showToast, alert() 오버라이드, showPrompt/
// showPromptAsync, 키보드 단축키, Suno 복사, 도움말 모달) 자동화 테스트
//
// showConfirm/showConfirmAsync는 tests/mv_custom_confirm_modal_smoke.js가
// 이미 커버하고 있으므로 이 파일은 그 나머지를 검증한다.

const assert = require("assert");

const originalConsole = { ...console };
console.log = function () {};

// ─── 최소 DOM 스텁 (querySelector/querySelectorAll/cloneNode/classList 지원) ───
function makeClassList(initial = []) {
  const set = new Set(initial);
  return {
    add: (...c) => c.forEach((x) => set.add(x)),
    remove: (...c) => c.forEach((x) => set.delete(x)),
    contains: (c) => set.has(c),
    _set: set,
  };
}

function collectAll(node, predicate, out) {
  if (predicate(node)) out.push(node);
  (node.children || []).forEach((c) => collectAll(c, predicate, out));
}

function makeElement(tag) {
  const style = { setProperty(prop, value) { this[prop] = value; } };
  const el = {
    tagName: (tag || "div").toUpperCase(),
    style,
    children: [],
    listeners: {},
    classList: makeClassList(),
    id: "",
    innerHTML: "",
    innerText: "",
    value: "",
    _cssMatches: new Set(), // 테스트에서 querySelector(".foo") 매칭용 클래스 마커
    onclick: null,
  };
  el.appendChild = (child) => {
    el.children.push(child);
    child.parentNode = el;
    return child;
  };
  el.replaceChild = (newChild, oldChild) => {
    const idx = el.children.indexOf(oldChild);
    if (idx !== -1) el.children[idx] = newChild;
    newChild.parentNode = el;
    if (newChild.id) registry.set(newChild.id, newChild);
    return oldChild;
  };
  el.removeChild = (child) => {
    const idx = el.children.indexOf(child);
    if (idx !== -1) el.children.splice(idx, 1);
    return child;
  };
  el.contains = (child) => el.children.includes(child);
  el.addEventListener = (type, fn) => {
    el.listeners[type] = el.listeners[type] || [];
    el.listeners[type].push(fn);
  };
  el.removeEventListener = (type, fn) => {
    if (!el.listeners[type]) return;
    el.listeners[type] = el.listeners[type].filter((f) => f !== fn);
  };
  el.dispatch = (type, evt) => {
    (el.listeners[type] || []).slice().forEach((fn) => fn(evt));
  };
  el.querySelector = (sel) => {
    const id = sel.replace("#", "");
    const search = (node) => {
      if (node.id === id) return node;
      for (const c of node.children || []) {
        const found = search(c);
        if (found) return found;
      }
      return null;
    };
    return search(el);
  };
  el.querySelectorAll = () => [];
  el.focus = () => {};
  el.select = () => {};
  el.cloneNode = () => {
    const clone = makeElement(tag);
    clone.id = el.id;
    clone.innerText = el.innerText;
    clone.value = el.value;
    return clone;
  };
  Object.defineProperty(el, "firstElementChild", {
    get: () => el.children[0] || null,
  });
  return el;
}

const body = makeElement("body");
const registry = new Map();
let docKeydownListeners = [];

global.window = global;
global.document = {
  body,
  getElementById(id) {
    return registry.get(id) || null;
  },
  createElement(tag) {
    return makeElement(tag);
  },
  querySelectorAll(selector) {
    // 이 테스트에서 실제로 쓰이는 셀렉터만 최소 지원
    if (selector === ".modal-overlay.show") {
      const out = [];
      collectAll(body, (n) => n.classList && n.classList.contains("modal-overlay") && n.classList.contains("show"), out);
      return out;
    }
    if (selector === ".help-tab-btn") return window.__helpTabBtns || [];
    if (selector === ".help-content") return window.__helpContents || [];
    return [];
  },
  querySelector(selector) {
    if (selector.startsWith(".help-tab-btn[onclick*=")) {
      const m = selector.match(/switchHelpTab\('([^']+)'\)/);
      const tab = m && m[1];
      return (window.__helpTabBtns || []).find((b) => b.__tab === tab) || null;
    }
    return null;
  },
  listeners: {},
  addEventListener(type, fn) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(fn);
    if (type === "keydown") docKeydownListeners.push(fn);
  },
  removeEventListener(type, fn) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter((f) => f !== fn);
    if (type === "keydown") docKeydownListeners = docKeydownListeners.filter((f) => f !== fn);
  },
  dispatch(type, evt) {
    (this.listeners[type] || []).slice().forEach((fn) => fn(evt));
  },
};

// overlay의 innerHTML 대입을 가로채 자식 엘리먼트를 만들어 붙여준다
// (showConfirm과 showPrompt 둘 다 동일한 구조라 하나로 공유).
function installOverlayInnerHtmlStub(overlay) {
  let _html = "";
  Object.defineProperty(overlay, "innerHTML", {
    get: () => _html,
    set: (html) => {
      _html = html;
      const isPrompt = html.includes("promptMessage");
      const box = makeElement("div");
      if (isPrompt) {
        const msg = makeElement("div");
        msg.id = "promptMessage";
        const input = makeElement("input");
        input.id = "promptInput";
        const cancelBtn = makeElement("button");
        cancelBtn.id = "promptCancelBtn";
        const okBtn = makeElement("button");
        okBtn.id = "promptOkBtn";
        box.appendChild(msg);
        box.appendChild(input);
        const btnRow = makeElement("div");
        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(okBtn);
        box.appendChild(btnRow);
        registry.set("promptMessage", msg);
        registry.set("promptInput", input);
        registry.set("promptCancelBtn", cancelBtn);
        registry.set("promptOkBtn", okBtn);
      } else {
        const msg = makeElement("div");
        msg.id = "confirmMessage";
        const noBtn = makeElement("button");
        noBtn.id = "confirmNoBtn";
        const yesBtn = makeElement("button");
        yesBtn.id = "confirmYesBtn";
        box.appendChild(msg);
        const btnRow = makeElement("div");
        btnRow.appendChild(noBtn);
        btnRow.appendChild(yesBtn);
        box.appendChild(btnRow);
        registry.set("confirmMessage", msg);
        registry.set("confirmNoBtn", noBtn);
        registry.set("confirmYesBtn", yesBtn);
      }
      overlay.children = [box];
    },
  });
}

const originalCreateElement = document.createElement.bind(document);
document.createElement = function (tag) {
  const el = originalCreateElement(tag);
  if (tag === "div") installOverlayInnerHtmlStub(el);
  return el;
};

document.body.appendChild = function (child) {
  if (child.id) registry.set(child.id, child);
  body.children.push(child);
  return child;
};

global.requestAnimationFrame = function (cb) {
  cb();
};

// Node 20+는 global.navigator를 setter 없는 접근자 프로퍼티로 미리 정의해두므로
// 단순 대입(global.navigator = ...)은 조용히 무시된다. defineProperty로 덮어쓴다.
Object.defineProperty(global, "navigator", {
  value: {
    clipboard: {
      writeText: null, // 테스트마다 재정의
    },
  },
  writable: true,
  configurable: true,
});

require("../js/ux.js");

(async () => {
  // ═══════════════════════════════════════════════════════════════
  // 1. showToast: 컨테이너 자동 생성 + 토스트 추가 + 타입별 테두리색
  // ═══════════════════════════════════════════════════════════════
  window.showToast("일반 메시지", "info");
  const toastContainer = document.getElementById("toast-container");
  assert.ok(toastContainer, "toast-container가 자동 생성되어야 함");
  assert.strictEqual(toastContainer.children.length, 1);
  assert.strictEqual(toastContainer.children[0].innerText, "일반 메시지");

  window.showToast("성공 메시지", "success");
  const successToast = toastContainer.children[toastContainer.children.length - 1];
  assert.ok(successToast.style.cssText.includes("var(--success)"), "success 타입은 성공 테두리색을 사용해야 함");

  window.showToast("에러 메시지", "error");
  const errorToast = toastContainer.children[toastContainer.children.length - 1];
  assert.ok(errorToast.style.cssText.includes("var(--error)"), "error 타입은 에러 테두리색을 사용해야 함");

  // ═══════════════════════════════════════════════════════════════
  // 2. window.alert() 오버라이드: 메시지 내용에 따른 타입 분류
  // ═══════════════════════════════════════════════════════════════
  const capturedToasts = [];
  const originalShowToast = window.showToast;
  window.showToast = (msg, type) => capturedToasts.push({ msg, type });

  window.alert("❌ 저장 중 오류가 발생했습니다");
  window.alert("✅ 저장되었습니다");
  window.alert("일반 안내 메시지");
  window.alert("저장이 완료되었지만 서버 오류가 발생했습니다"); // 성공+오류 키워드 혼재 → 오류 우선
  window.alert("줄1\\n줄2"); // 이스케이프된 개행 → 실제 개행 변환
  window.alert(""); // 빈 메시지는 무시

  assert.strictEqual(capturedToasts[0].type, "error");
  assert.strictEqual(capturedToasts[1].type, "success");
  assert.strictEqual(capturedToasts[2].type, "info");
  assert.strictEqual(capturedToasts[3].type, "error", "성공/오류 키워드가 함께 있으면 오류로 분류되어야 함");
  assert.strictEqual(capturedToasts[4].msg, "줄1\n줄2");
  assert.strictEqual(capturedToasts.length, 5, "빈 메시지는 showToast를 호출하지 않아야 함");

  window.showToast = originalShowToast;

  // ═══════════════════════════════════════════════════════════════
  // 3. showPromptAsync: 확인/취소/Enter/Escape 경로 + 리스너 누수 방지
  // ═══════════════════════════════════════════════════════════════
  let p1 = window.showPromptAsync("이름을 입력하세요", "기본값");
  const promptOverlay = document.getElementById("customPromptModal");
  assert.ok(promptOverlay, "프롬프트 오버레이가 생성되어야 함");
  assert.strictEqual(document.getElementById("promptInput").value, "기본값");
  assert.strictEqual(docKeydownListeners.length, 1, "keydown 리스너 1개 등록");

  document.getElementById("promptInput").value = "사용자입력";
  document.getElementById("promptOkBtn").onclick();
  const r1 = await p1;
  assert.strictEqual(r1, "사용자입력", "확인 시 입력값을 그대로 resolve해야 함");
  assert.strictEqual(docKeydownListeners.length, 0, "확인 후 keydown 리스너가 해제되어야 함");

  let p2 = window.showPromptAsync("취소 테스트");
  document.getElementById("promptCancelBtn").onclick();
  const r2 = await p2;
  assert.strictEqual(r2, null, "취소 시 null을 resolve해야 함(네이티브 prompt와 동일)");
  assert.strictEqual(docKeydownListeners.length, 0);

  let p3 = window.showPromptAsync("엔터 테스트");
  document.getElementById("promptInput").value = "엔터로 제출";
  document.getElementById("promptInput").dispatch("keydown", { key: "Enter", preventDefault() {} });
  const r3 = await p3;
  assert.strictEqual(r3, "엔터로 제출");

  let p4 = window.showPromptAsync("ESC 테스트");
  document.dispatch("keydown", { key: "Escape" });
  const r4 = await p4;
  assert.strictEqual(r4, null);
  assert.strictEqual(docKeydownListeners.length, 0);

  // 5회 반복해도 keydown 리스너가 누적되지 않아야 함 (showConfirm과 동일한 회귀 방지)
  for (let i = 0; i < 5; i++) {
    const p = window.showPromptAsync(`반복 ${i}`);
    document.getElementById("promptOkBtn").onclick();
    await p;
  }
  assert.strictEqual(docKeydownListeners.length, 0, "여러 번 열고 닫아도 리스너가 누적되면 안 됨");

  // ═══════════════════════════════════════════════════════════════
  // 4. copyForSuno: 클립보드 성공/실패
  // ═══════════════════════════════════════════════════════════════
  registry.set("lyricsEl", (() => { const e = makeElement("textarea"); e.value = "가사 내용"; return e; })());
  registry.set("styleEl", (() => { const e = makeElement("textarea"); e.value = "스타일 내용"; return e; })());

  const toastLog = [];
  window.showToast = (msg, type) => toastLog.push({ msg, type });

  let writtenText = null;
  navigator.clipboard.writeText = (text) => {
    writtenText = text;
    return Promise.resolve();
  };
  window.copyForSuno("lyricsEl", "styleEl");
  await Promise.resolve();
  assert.ok(writtenText.includes("가사 내용") && writtenText.includes("스타일 내용"));
  assert.ok(toastLog.some((t) => t.type === "success"));

  toastLog.length = 0;
  navigator.clipboard.writeText = () => Promise.reject(new Error("클립보드 접근 거부"));
  window.copyForSuno("lyricsEl", "styleEl");
  await Promise.resolve();
  await Promise.resolve();
  assert.ok(toastLog.some((t) => t.type === "error" && t.msg.includes("복사 실패")));

  window.showToast = originalShowToast;

  // ═══════════════════════════════════════════════════════════════
  // 5. 도움말 모달: 열기/닫기/탭 전환
  // ═══════════════════════════════════════════════════════════════
  const helpModal = makeElement("div");
  registry.set("helpModal", helpModal);
  const introBtn = makeElement("button");
  introBtn.__tab = "intro";
  const faqBtn = makeElement("button");
  faqBtn.__tab = "faq";
  window.__helpTabBtns = [introBtn, faqBtn];
  const introContent = makeElement("div");
  registry.set("helpTab-intro", introContent);
  const faqContent = makeElement("div");
  registry.set("helpTab-faq", faqContent);
  window.__helpContents = [introContent, faqContent];

  window.openHelpModal();
  assert.strictEqual(helpModal.style.display, "flex");
  assert.ok(helpModal.classList.contains("show"));
  assert.ok(introBtn.classList.contains("active"), "기본 탭(intro)이 활성화되어야 함");
  assert.strictEqual(introContent.style.display, "block");
  assert.strictEqual(faqContent.style.display, "none");

  window.switchHelpTab("faq");
  assert.ok(!introBtn.classList.contains("active"));
  assert.ok(faqBtn.classList.contains("active"));
  assert.strictEqual(faqContent.style.display, "block");
  assert.strictEqual(introContent.style.display, "none");

  window.closeHelpModal();
  assert.strictEqual(helpModal.style.display, "none");
  assert.ok(!helpModal.classList.contains("show"));

  // ═══════════════════════════════════════════════════════════════
  // 6. initShortcuts: Ctrl+S 저장, Escape로 열린 모달 닫기, Ctrl+숫자 단계 이동
  // ═══════════════════════════════════════════════════════════════
  window.showToast = (msg, type) => toastLog.push({ msg, type });
  toastLog.length = 0;

  let saveCalls = 0;
  window.saveCurrentProject = () => saveCalls++;
  let goToStepCalls = [];
  window.goToStep = (...args) => goToStepCalls.push(args);

  window.initShortcuts();
  assert.strictEqual(docKeydownListeners.length, 1, "initShortcuts는 keydown 리스너를 1개 등록해야 함");

  let preventDefaultCalled = false;
  document.dispatch("keydown", {
    ctrlKey: true,
    key: "s",
    preventDefault: () => (preventDefaultCalled = true),
  });
  assert.strictEqual(saveCalls, 1, "Ctrl+S로 저장이 호출되어야 함");
  assert.ok(preventDefaultCalled, "브라우저 기본 저장 다이얼로그를 막아야 함");
  assert.ok(toastLog.some((t) => t.msg.includes("저장되었습니다")));

  const overlay1 = makeElement("div");
  overlay1.classList.add("modal-overlay", "show");
  body.appendChild(overlay1);
  document.dispatch("keydown", { key: "Escape" });
  assert.ok(!overlay1.classList.contains("show"), "Escape 키로 열려있는 모달 오버레이가 닫혀야 함");

  document.dispatch("keydown", {
    ctrlKey: true,
    key: "3",
    preventDefault: () => {},
  });
  assert.deepStrictEqual(goToStepCalls[goToStepCalls.length - 1], [3, true, true]);

  originalConsole.log("MV ux helpers smoke test: PASS");
  process.exit(0);
})().catch((err) => {
  originalConsole.error(err);
  process.exit(1);
});
