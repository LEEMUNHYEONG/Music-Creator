const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const originalConsole = { ...console };
const elements = new Map();
let clipboardText = "";
let toastMessage = "";
let alertMessage = "";
let fallbackCopyCalled = false;

console.log = function logStub() {};
console.error = function errorStub() {};

function addElement(id, value = "") {
  const el = {
    id,
    value,
    textContent: value,
    innerText: value,
    style: { display: "none" },
    select() {
      this.selected = true;
    },
  };
  elements.set(id, el);
  return el;
}

global.window = global;
global.document = {
  getElementById(id) {
    return elements.get(id) || null;
  },
  execCommand(command) {
    if (command === "copy") {
      fallbackCopyCalled = true;
      return true;
    }
    return false;
  },
};
global.alert = function alertStub(message) {
  alertMessage = message;
};
// alert()가 window.showToast(message, level)로 전환되어 동일하게 스텁한다.
window.showToast = function showToastStub(message, level) {
  alertMessage = message;
};
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
window.showCopyIndicator = function showCopyIndicator(message) {
  toastMessage = message;
};

const step6Source = fs.readFileSync(path.resolve(__dirname, "../test-results/mv_modules.compat.js"), "utf8");
const start = step6Source.indexOf("window.toggleCharacterSheet = function");
const end = step6Source.indexOf("// --- Extracted generateSRTPreview ---", start);
assert.ok(start !== -1, "toggleCharacterSheet should exist in js/step6.js");
assert.ok(end !== -1, "character sheet helper block should end before SRT helpers");
vm.runInThisContext(step6Source.slice(start, end), {
  filename: "js/step6.js.character-sheet-helper-slice",
});

const sheetText1 = `
[Identity]
- Gender: Female
- Age: Young adult
[Body]
- Height: 170cm
[Pose]
- A-pose
[Face]
- Eyes: almond-shaped
[Hair]
- Color: black
[Outfit] Top:
- Type: leather jacket
[Footwear]
- Type: boots
[Accessories / Wear Position] Earrings:
- Type: silver hoop
`;
const sheetText2 = `
[Identity]
- Gender: Male
[Face]
- Expression: calm
`;

addElement("mvCharacterCount", "2");
addElement("mvCharacter1_sheetArea").style.display = "none";
addElement("mvCharacter1_sheet", sheetText1);
addElement("mvCharacter2_sheet", sheetText2);
addElement("mvCharacter3_sheet", "");

window.toggleCharacterSheet(1);
assert.strictEqual(document.getElementById("mvCharacter1_sheetArea").style.display, "block");
window.toggleCharacterSheet(1);
assert.strictEqual(document.getElementById("mvCharacter1_sheetArea").style.display, "none");

const summary = window.getCharacterSheetSummary(1);
assert.ok(summary.includes("[Identity]"));
assert.ok(summary.includes("- Gender: Female"));
assert.ok(summary.includes("[Body]"));
assert.ok(summary.includes("- Height: 170cm"));
assert.ok(summary.includes("[Face]"));
assert.ok(summary.includes("[Hair]"));
assert.ok(summary.includes("[Outfit]"));
assert.ok(summary.includes("[Footwear]"));
assert.ok(!summary.includes("[Pose]"));
assert.ok(!summary.includes("[Accessories"));

assert.strictEqual(window.getCharacterSheetFull(1), sheetText1.trim());
assert.strictEqual(window.getCharacterSheetFull(3), "");

const allSummaries = window.getAllCharacterSheetsSummary();
assert.ok(allSummaries.includes("【인물 1 캐릭터 시트 요약】"));
assert.ok(allSummaries.includes("【인물 2 캐릭터 시트 요약】"));
assert.ok(allSummaries.includes("- Expression: calm"));

const allFull = window.getAllCharacterSheetsFull();
assert.ok(allFull.includes("【인물 1 캐릭터 시트 전체 원본】"));
assert.ok(allFull.includes("【인물 2 캐릭터 시트 전체 원본】"));
assert.ok(allFull.includes("---"));

window.copyCharacterSheet(1);
setImmediate(() => {
  assert.strictEqual(clipboardText, sheetText1);
  assert.ok(toastMessage.includes("인물 1"));

  navigator.clipboard.writeText = function writeTextReject() {
    return Promise.reject(new Error("clipboard denied"));
  };
  window.copyCharacterSheet(2);

  setImmediate(() => {
    assert.strictEqual(fallbackCopyCalled, true);
    assert.ok(document.getElementById("mvCharacter2_sheet").selected);

    window.copyCharacterSheet(3);
    assert.ok(alertMessage.includes("복사할 캐릭터 시트"));

    originalConsole.log("MV character sheet helpers smoke test: PASS");
    process.exit(0);
  });
});
