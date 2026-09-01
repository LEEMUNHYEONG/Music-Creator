// js/step5.js (태그 선택 상태 복원) 자동화 테스트
//
// setTagSelections()에는 지금까지 자동화 테스트가 전혀 없었다.

const assert = require("assert");

function makeTagButton({ value, text, custom }) {
  const classes = new Set(["tag-btn"]);
  if (custom) classes.add("custom-tag-btn");
  return {
    _value: value,
    textContent: text !== undefined ? text : value,
    getAttribute(k) {
      return k === "data-value" ? this._value : null;
    },
    classList: {
      add(c) {
        classes.add(c);
      },
      remove(c) {
        classes.delete(c);
      },
      contains(c) {
        return classes.has(c);
      },
    },
  };
}

function makeContainer(buttons) {
  return {
    querySelectorAll(sel) {
      return sel === ".tag-btn" ? buttons : [];
    },
  };
}

global.window = global;
let containers = new Map();
global.document = {
  getElementById(id) {
    return containers.has(id) ? containers.get(id) : null;
  },
};

require("../js/step5.js");
assert.strictEqual(typeof window.setTagSelections, "function");

// ═══════════════════════════════════════════════════════════════
// 1. 컨테이너를 찾을 수 없으면 조용히 무시(예외 없음)
// ═══════════════════════════════════════════════════════════════
assert.doesNotThrow(() => window.setTagSelections("nonexistent", ["a"]));

// ═══════════════════════════════════════════════════════════════
// 2. 기존 활성 태그 초기화 + 전달값과 일치하는 태그만 재활성화
//    (커스텀 태그 버튼은 초기화/재활성화 로직 모두에서 건드리지 않음)
// ═══════════════════════════════════════════════════════════════
const btnRock = makeTagButton({ value: "락" });
btnRock.classList.add("active"); // 이전에 선택돼 있던 상태
const btnBallad = makeTagButton({ value: "발라드" });
const btnJazz = makeTagButton({ value: "재즈" });
const btnCustom = makeTagButton({ value: "", text: "+ 직접 입력", custom: true });
btnCustom.classList.add("active"); // 커스텀 버튼은 활성 상태여도 건드리면 안 됨

containers.set("genreTags", makeContainer([btnRock, btnBallad, btnJazz, btnCustom]));

window.setTagSelections("genreTags", ["발라드", "재즈"]);

assert.strictEqual(btnRock.classList.contains("active"), false, "이전 선택은 해제되어야 함");
assert.strictEqual(btnBallad.classList.contains("active"), true, "전달된 값은 활성화되어야 함");
assert.strictEqual(btnJazz.classList.contains("active"), true);
assert.strictEqual(btnCustom.classList.contains("active"), true, "커스텀 태그 버튼은 건드리지 않아야 함");

// ═══════════════════════════════════════════════════════════════
// 3. data-value가 없으면 textContent(trim)로 매칭
// ═══════════════════════════════════════════════════════════════
const btnNoDataValue = makeTagButton({ value: null, text: "  신남  " });
containers.set("moodTags", makeContainer([btnNoDataValue]));
window.setTagSelections("moodTags", ["신남"]);
assert.strictEqual(btnNoDataValue.classList.contains("active"), true, "textContent trim 매칭도 지원해야 함");

// ═══════════════════════════════════════════════════════════════
// 4. 값이 없거나(null/undefined) 빈 배열이면 초기화만 하고 재활성화는 스킵
// ═══════════════════════════════════════════════════════════════
const btnA = makeTagButton({ value: "A" });
btnA.classList.add("active");
containers.set("timeTags", makeContainer([btnA]));

window.setTagSelections("timeTags", null);
assert.strictEqual(btnA.classList.contains("active"), false, "null 전달 시 기존 선택은 초기화되어야 함");

btnA.classList.add("active");
window.setTagSelections("timeTags", []);
assert.strictEqual(btnA.classList.contains("active"), false, "빈 배열 전달 시에도 초기화되어야 함");

btnA.classList.add("active");
window.setTagSelections("timeTags", "문자열은-배열아님");
assert.strictEqual(btnA.classList.contains("active"), false, "배열이 아닌 값은 무시하고 초기화만 수행해야 함");

console.log("MV step5 tag selection smoke test: PASS");
process.exit(0);
