const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.resolve(__dirname, "../test-results/mv_modules.compat.js"), "utf8");
const start = source.indexOf("const MV_EMOTION_VISUAL_PRESETS = {");
const end = source.indexOf("/**\n * 해당 씬 가사에 가장 잘 맞는 장소 유형", start);

assert.notStrictEqual(start, -1, "emotion visual presets should exist");
assert.notStrictEqual(end, -1, "emotion visual presets should end before location picker");

global.window = global;

vm.runInThisContext(source.slice(start, end), {
  filename: "js/step6.js.emotion-visual-tone-slice",
});

const sadTone = window.recommendMVSceneVisualTone(
  "눈물처럼 비가 내려 이별의 밤을 혼자 걷는다",
  ["city", "rain", "rooftop"],
);
assert.strictEqual(sadTone.emotion, "sad");
assert.strictEqual(sadTone.locationHint, "rain");
assert.ok(sadTone.lighting.includes("blue-hour"));
assert.ok(sadTone.cameraWork.includes("dolly"));

const hopefulTone = window.recommendMVSceneVisualTone(
  "다시 일어나 내일의 빛을 향해 걸어간다",
  ["street", "sunrise", "club"],
);
assert.strictEqual(hopefulTone.emotion, "hopeful");
assert.strictEqual(hopefulTone.locationHint, "sunrise");
assert.ok(hopefulTone.mood.includes("sunrise"));

const intenseTone = window.recommendMVSceneVisualTone(
  "불타는 심장으로 소리쳐 달려간다",
  ["forest", "warehouse", "park"],
);
assert.strictEqual(intenseTone.emotion, "intense");
assert.strictEqual(intenseTone.locationHint, "warehouse");
assert.ok(intenseTone.cameraWork.includes("tracking"));

const defaultTone = window.recommendMVSceneVisualTone("아무 감정 키워드 없는 장면", [
  "cafe",
]);
assert.strictEqual(defaultTone.emotion, "cinematic");
assert.strictEqual(defaultTone.locationHint, "cafe");

console.log("MV emotion visual tone smoke test: PASS");
