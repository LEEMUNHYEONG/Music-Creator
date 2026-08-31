// 회귀 테스트: js/ux.js의 커스텀 확인 모달(showConfirm/showConfirmAsync)이
// - 정적 마크업 없이도 스스로 DOM을 생성하고
// - 확인/취소/배경클릭 각 경로에서 정확한 boolean을 resolve하며
// - 닫힐 때마다 document의 keydown 리스너를 반드시 해제하는지
//   (2026-09 발견: 버튼 클릭으로 닫을 때 리스너가 전혀 해제되지 않아
//    호출할 때마다 영구히 누적되던 버그의 재발 방지)
// 검증한다.
const assert = require("assert");

const originalConsole = { ...console };
console.log = function logStub() {};

// --- 최소 DOM 스텁 (querySelector/cloneNode/classList 지원) ---
function makeClassList() {
  const set = new Set();
  return {
    add: (c) => set.add(c),
    remove: (c) => set.delete(c),
    contains: (c) => set.has(c),
  };
}

function makeElement(tag) {
  const el = {
    tagName: tag.toUpperCase(),
    style: {},
    children: [],
    listeners: {},
    classList: makeClassList(),
    id: "",
    innerHTML: "",
    innerText: "",
    _isElement: true,
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
    // 실제 DOM의 getElementById는 라이브 트리 조회이므로, id가 같은
    // 교체 노드가 들어오면 registry 조회 결과도 새 노드를 가리켜야 한다.
    if (newChild.id) registry.set(newChild.id, newChild);
    return oldChild;
  };
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
  el.cloneNode = () => {
    const clone = makeElement(tag);
    clone.id = el.id;
    clone.innerText = el.innerText;
    return clone;
  };
  Object.defineProperty(el, "firstElementChild", {
    get: () => el.children[0] || null,
  });
  return el;
}

// document.body를 부모로 하는 매우 단순한 트리 (overlay가 여기 매달림)
const body = makeElement("body");
const registry = new Map();

global.window = global;
global.document = {
  body,
  _byId: registry,
  getElementById(id) {
    return registry.get(id) || null;
  },
  createElement(tag) {
    return makeElement(tag);
  },
  listeners: {},
  addEventListener(type, fn) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(fn);
  },
  removeEventListener(type, fn) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter((f) => f !== fn);
  },
  dispatch(type, evt) {
    (this.listeners[type] || []).slice().forEach((fn) => fn(evt));
  },
};

// overlay의 innerHTML 대입을 가로채 실제 confirmMessage/confirmYesBtn/confirmNoBtn
// 자식 엘리먼트를 만들어 붙여준다 (실제 HTML 파서 없이 동작 재현).
function installOverlayInnerHtmlStub(overlay) {
  let _html = "";
  Object.defineProperty(overlay, "innerHTML", {
    get: () => _html,
    set: (html) => {
      _html = html;
      const msg = makeElement("div");
      msg.id = "confirmMessage";
      const noBtn = makeElement("button");
      noBtn.id = "confirmNoBtn";
      const yesBtn = makeElement("button");
      yesBtn.id = "confirmYesBtn";
      const box = makeElement("div");
      box.appendChild(msg);
      const btnRow = makeElement("div");
      btnRow.appendChild(noBtn);
      btnRow.appendChild(yesBtn);
      box.appendChild(btnRow);
      overlay.children = [box];
      registry.set("confirmMessage", msg);
      registry.set("confirmNoBtn", noBtn);
      registry.set("confirmYesBtn", yesBtn);
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

require("../js/ux.js");

(async () => {
  // 1) 확인 버튼 → true, keydown 리스너 해제
  let p1 = window.showConfirmAsync("테스트1");
  let overlay = document.getElementById("customConfirmModal");
  assert.ok(overlay, "오버레이가 생성되어야 한다");
  assert.strictEqual((document.listeners.keydown || []).length, 1, "keydown 리스너 1개 등록");
  document.getElementById("confirmYesBtn").onclick();
  const r1 = await p1;
  assert.strictEqual(r1, true);
  assert.strictEqual(
    (document.listeners.keydown || []).length,
    0,
    "확인 버튼으로 닫으면 keydown 리스너가 해제되어야 한다",
  );

  // 2) 취소 버튼 → false, 리스너 해제
  let p2 = window.showConfirmAsync("테스트2");
  document.getElementById("confirmNoBtn").onclick();
  const r2 = await p2;
  assert.strictEqual(r2, false);
  assert.strictEqual((document.listeners.keydown || []).length, 0);

  // 3) 여러 번 열고 버튼으로 닫아도 리스너가 누적되지 않아야 한다 (핵심 회귀 방지)
  for (let i = 0; i < 5; i++) {
    const p = window.showConfirmAsync(`반복 ${i}`);
    document.getElementById("confirmYesBtn").onclick();
    await p;
  }
  assert.strictEqual(
    (document.listeners.keydown || []).length,
    0,
    "5회 반복 후에도 keydown 리스너가 누적되면 안 된다",
  );

  // 4) Escape 키 → false, 리스너 해제
  let p3 = window.showConfirmAsync("테스트3");
  document.dispatch("keydown", { key: "Escape" });
  const r3 = await p3;
  assert.strictEqual(r3, false);
  assert.strictEqual((document.listeners.keydown || []).length, 0);

  originalConsole.log("MV custom confirm modal smoke test: PASS");
  process.exit(0);
})().catch((err) => {
  originalConsole.error(err);
  process.exit(1);
});
