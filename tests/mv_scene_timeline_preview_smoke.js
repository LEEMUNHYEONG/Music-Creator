const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const elements = new Map();
const source = fs.readFileSync(path.resolve(__dirname, "../js/step6.js"), "utf8");
const start = source.indexOf("function getMVSceneTimelineLabel(scene, index) {");
const end = source.indexOf("// --- UI 렌더링 함수: MV 썸네일/배경/인물 프롬프트 표시 ---", start);

assert.notStrictEqual(start, -1, "timeline label helper should exist");
assert.notStrictEqual(end, -1, "timeline helper block should end before prompt UI renderer");

global.window = global;
global.document = {
  querySelector(selector) {
    return elements.get(selector) || null;
  },
};

vm.runInThisContext(source.slice(start, end), {
  filename: "js/step6.js.scene-timeline-slice",
});

const scenes = [
  {
    time: "0:00-0:08",
    scene: "비 오는 골목에서 인물이 멈춰 선다",
    emotion: "lonely",
    location: "rainy alley",
  },
  {
    time: "0:08-0:16",
    scene: "네온 불빛 아래 다시 걷는다",
    emotion: "hopeful",
    location: "neon street",
  },
];

const html = window.renderMVSceneTimelinePreview(scenes);
assert.ok(html.includes("mv-scene-timeline-preview"));
assert.ok(html.includes("총 2개 씬"));
assert.ok(html.includes("씬 1"));
assert.ok(html.includes("0:00-0:08"));
assert.ok(html.includes("비 오는 골목"));
assert.ok(html.includes("lonely · rainy alley"));
assert.ok(html.includes("window.focusMVSceneCard(1)"));
assert.strictEqual(window.renderMVSceneTimelinePreview([]), "");

let scrolled = 0;
elements.set('.mv-scene-overview-card[data-scene-index="1"]', {
  scrollIntoView(options) {
    scrolled += 1;
    assert.strictEqual(options.block, "center");
  },
});
window.focusMVSceneCard(1);
assert.strictEqual(scrolled, 1);

console.log("MV scene timeline preview smoke test: PASS");
