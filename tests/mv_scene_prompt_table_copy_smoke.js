const assert = require("assert");

const originalConsole = { ...console };
const elements = new Map();
let clipboardText = "";
let toastMessage = "";

console.log = function logStub() {};

function addElement(id, value = "") {
  elements.set(id, { id, value, textContent: value });
}

global.window = global;
global.document = {
  getElementById(id) {
    return elements.get(id) || null;
  },
  querySelectorAll() {
    return [];
  },
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
global.alert = function alertStub(message) {
  throw new Error(`Unexpected alert: ${message}`);
};

window.showCopyIndicator = function showCopyIndicator(message) {
  toastMessage = message;
};
window.currentScenes = [
  {
    time: "00:00-00:08",
    lyrics: "첫 가사\t구간",
    scene: "비 오는 골목 장면",
    prompt: "fallback english prompt",
    promptKo: "fallback korean prompt",
  },
  {
    time: "00:08-00:16",
    lyrics: "둘째 가사\n구간",
    scene: "옥상 위 인물",
    prompt: "second fallback english",
  },
];

addElement("scene_0_en", "textarea english\twith tab");
addElement("scene_0_ko", "textarea korean\nwith newline");

require("../js/step6.js");

const tableText = window.buildMVScenePromptTableText();
const rows = tableText.split("\n");

assert.strictEqual(rows.length, 3);
assert.strictEqual(rows[0], "씬\t시간\t가사\tEN 프롬프트\tKO 설명");
assert.strictEqual(
  rows[1],
  "1\t00:00-00:08\t첫 가사 구간\ttextarea english with tab\ttextarea korean with newline",
);
assert.strictEqual(
  rows[2],
  "2\t00:08-00:16\t둘째 가사 구간\tsecond fallback english\t옥상 위 인물",
);

window.copyMVScenePromptTable();

setImmediate(() => {
  assert.strictEqual(clipboardText, tableText);
  assert.ok(toastMessage.includes("표"));
  originalConsole.log("MV scene prompt table copy smoke test: PASS");
  process.exit(0);
});
