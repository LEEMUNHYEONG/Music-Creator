const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.resolve(__dirname, "../test-results/mv_modules.compat.js"), "utf8");
const start = source.indexOf("window.allocateLyricsToMVScenes = function");
const end = source.indexOf("// --- Extracted generateMVDetailPrompts ---", start);

assert.notStrictEqual(start, -1, "allocateLyricsToMVScenes should exist");
assert.notStrictEqual(end, -1, "allocation helper should end before MV detail prompts");

global.window = global;

vm.runInThisContext(source.slice(start, end), {
  filename: "js/step6.js.lyrics-allocation-slice",
});

const lyrics = `
[Verse 1]
첫 번째 긴 문장으로 이야기가 시작된다
아직은 낮은 감정으로 천천히 걷는다

[Chorus]
폭발하듯 커지는 후렴의 감정
멈출 수 없는 마음이 밤하늘로 번진다

[Bridge]
조용한 다리 위에서 다시 숨을 고른다
마지막 빛을 따라 앞으로 나아간다
`;

const fourScenes = window.allocateLyricsToMVScenes(lyrics, 4);
assert.strictEqual(fourScenes.length, 4);
assert.ok(fourScenes.every((scene) => scene.trim()));
assert.ok(!fourScenes.some((scene) => scene.includes("[Verse")));
assert.ok(!fourScenes.some((scene) => scene.includes("[Chorus")));
assert.ok(fourScenes[0].includes("첫 번째 긴 문장"));
assert.ok(fourScenes[3].includes("마지막 빛"));
assert.strictEqual(
  fourScenes.join(" ").includes("폭발하듯 커지는 후렴의 감정"),
  true,
);

const twoScenes = window.allocateLyricsToMVScenes(lyrics, 2);
assert.strictEqual(twoScenes.length, 2);
assert.ok(twoScenes[0].includes("첫 번째 긴 문장"));
assert.ok(twoScenes[0].includes("천천히 걷는다"));
assert.ok(twoScenes[1].includes("마지막 빛"));

const manyScenes = window.allocateLyricsToMVScenes("A\nB\nC", 5);
assert.deepStrictEqual(manyScenes, ["A", "A", "B", "B", "C"]);

assert.deepStrictEqual(window.allocateLyricsToMVScenes("", 3), ["", "", ""]);
assert.deepStrictEqual(window.allocateLyricsToMVScenes("가사", 0), []);

console.log("MV lyrics scene allocation smoke test: PASS");
