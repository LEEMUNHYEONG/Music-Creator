const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const elements = new Map();
const toasts = [];
const alerts = [];
const originalConsole = {
  error: console.error,
  log: console.log,
};

console.log = function logStub() {};
console.error = function errorStub() {};

function addElement(id, value = "") {
  const element = { id, value, textContent: value };
  elements.set(id, element);
  return element;
}

global.window = global;
global.document = {
  getElementById(id) {
    return elements.get(id) || null;
  },
};
global.alert = function alertStub(message) {
  alerts.push(message);
};
window.showCopyIndicator = function showCopyIndicatorStub(message) {
  toasts.push(message);
};

const step6Source = fs.readFileSync(path.resolve(__dirname, "../test-results/mv_modules.compat.js"), "utf8");
const start = step6Source.indexOf("window.generateSRTPreview = function () {");
const end = step6Source.indexOf("// === MV Step 6: Translation, regeneration, copy, and tag actions ===", start);
assert.ok(start !== -1, "generateSRTPreview should exist in js/step6.js");
assert.ok(end !== -1, "generateSRTPreview block should end before translation helpers");

vm.runInThisContext(step6Source.slice(start, end), {
  filename: "js/step6.js.srt-scene-timeline-slice",
});

addElement("finalLyrics", "fallback lyric line");
addElement("srtDisplayDuration", "16");
addElement("srtLinesPerSubtitle", "2");

window.currentScenes = [
  {
    startSeconds: 8,
    endSeconds: 17,
    lyrics: "다시 빛을 향해 걸어간다",
    location: "sunrise rooftop",
    emotion: "hopeful",
    mood: "warm horizon",
  },
  {
    startSeconds: 17,
    endSeconds: 25,
    lyrics: "비처럼 남은 밤을 지나",
    location: "rainy alley",
    emotion: "lonely",
  },
];

window.generateSRTPreview();

assert.ok(window.currentSRTContent.includes("00:00:08,000 --> 00:00:17,000"));
assert.ok(window.currentSRTContent.includes("다시 빛을 향해 걸어간다"));
assert.ok(window.currentSRTContent.includes("00:00:17,000 --> 00:00:25,000"));
assert.ok(!window.currentSRTContent.includes("sunrise rooftop"));
assert.ok(!window.currentSRTContent.includes("rainy alley"));
assert.ok(toasts.some((message) => message.includes("2개 자막")));
assert.deepStrictEqual(alerts, []);

originalConsole.log("MV SRT scene timeline smoke test: PASS");
