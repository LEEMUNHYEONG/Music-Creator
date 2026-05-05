const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const originalConsole = { ...console };
const elements = new Map();

console.log = function logStub() {};
console.warn = function warnStub() {};

function makeElement(id, value = "") {
  return {
    id,
    value,
    textContent: "",
    style: {},
  };
}

function addElement(id, value = "") {
  const el = makeElement(id, value);
  elements.set(id, el);
  return el;
}

function addContainer(id) {
  const el = makeElement(id);
  Object.defineProperty(el, "innerHTML", {
    configurable: true,
    get() {
      return this._innerHTML || "";
    },
    set(html) {
      this._innerHTML = html;
      const idPattern = /id="([^"]+)"/g;
      let match;
      while ((match = idPattern.exec(html))) {
        const child = makeElement(match[1]);
        const stylePattern = new RegExp(`id="${match[1]}"[\\s\\S]*?style="([^"]*)"`);
        const styleMatch = html.match(stylePattern);
        if (styleMatch && /display:\s*none/.test(styleMatch[1])) {
          child.style.display = "none";
        }
        elements.set(match[1], child);
      }
    },
  });
  elements.set(id, el);
  return el;
}

global.window = global;
global.document = {
  getElementById(id) {
    return elements.get(id) || null;
  },
};

const step6Source = fs.readFileSync(path.resolve(__dirname, "../js/step6.js"), "utf8");
const start = step6Source.indexOf("window.updateCharacterInputs = function () {");
const end = step6Source.indexOf("// --- Extracted character sheet helpers ---", start);
assert.ok(start !== -1, "updateCharacterInputs should exist in js/step6.js");
assert.ok(end !== -1, "updateCharacterInputs block should end before character sheet helpers");
vm.runInThisContext(step6Source.slice(start, end), {
  filename: "js/step6.js.update-character-inputs-slice",
});

addElement("mvCharacterCount", "2");
addContainer("mvCharacterInputs");

addElement("mvCharacter1_gender", "female");
addElement("mvCharacter1_age", "20s");
addElement("mvCharacter1_race", "asian");
addElement("mvCharacter1_appearance", "black bob hair");
addElement("mvCharacter1_artStyle", "cinematic-photography");
addElement("mvCharacter1_sheet", "character sheet one");

addElement("mvCharacter2_gender", "male");
addElement("mvCharacter2_age", "30s");
addElement("mvCharacter2_race", "hispanic");
addElement("mvCharacter2_appearance", "silver jacket");
addElement("mvCharacter2_artStyle", "anime");
addElement("mvCharacter2_sheet", "");

window.updateCharacterInputs();

const containerHtml = document.getElementById("mvCharacterInputs").innerHTML;
assert.ok(containerHtml.includes("인물 1"));
assert.ok(containerHtml.includes("인물 2"));
assert.ok(containerHtml.includes("window.generateCharacterSheet(1)"));
assert.ok(containerHtml.includes("window.toggleCharacterSheet(2)"));
assert.ok(containerHtml.includes("window.copyCharacterSheet(2, event)"));

assert.strictEqual(document.getElementById("mvCharacter1_gender").value, "female");
assert.strictEqual(document.getElementById("mvCharacter1_age").value, "20s");
assert.strictEqual(document.getElementById("mvCharacter1_race").value, "asian");
assert.strictEqual(document.getElementById("mvCharacter1_appearance").value, "black bob hair");
assert.strictEqual(document.getElementById("mvCharacter1_artStyle").value, "cinematic-photography");
assert.strictEqual(document.getElementById("mvCharacter1_sheet").value, "character sheet one");
assert.strictEqual(document.getElementById("mvCharacter1_sheetArea").style.display, "block");
assert.strictEqual(document.getElementById("mvCharacter1_sheetToggle").style.display, "inline-flex");
assert.strictEqual(document.getElementById("mvCharacter1_sheetCopy").style.display, "inline-flex");

assert.strictEqual(document.getElementById("mvCharacter2_gender").value, "male");
assert.strictEqual(document.getElementById("mvCharacter2_age").value, "30s");
assert.strictEqual(document.getElementById("mvCharacter2_race").value, "hispanic");
assert.strictEqual(document.getElementById("mvCharacter2_appearance").value, "silver jacket");
assert.strictEqual(document.getElementById("mvCharacter2_artStyle").value, "anime");
assert.strictEqual(document.getElementById("mvCharacter2_sheet").value, "");
assert.strictEqual(document.getElementById("mvCharacter2_sheetArea").style.display, "none");

document.getElementById("mvCharacterCount").value = "1";
window.updateCharacterInputs();
assert.ok(document.getElementById("mvCharacterInputs").innerHTML.includes("인물 1"));
assert.ok(!document.getElementById("mvCharacterInputs").innerHTML.includes("인물 2"));
assert.strictEqual(document.getElementById("mvCharacter1_sheet").value, "character sheet one");

originalConsole.log("MV update character inputs smoke test: PASS");
process.exit(0);
