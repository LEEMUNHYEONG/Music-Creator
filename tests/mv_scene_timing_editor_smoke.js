const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.resolve(__dirname, "../js/step6.js"), "utf8");
const start = source.indexOf("function parseMVTimelineSeconds(value) {");
const end = source.indexOf("// --- UI 렌더링 함수: MV 썸네일/배경/인물 프롬프트 표시 ---", start);

assert.notStrictEqual(start, -1, "timeline editor helpers should exist");
assert.notStrictEqual(end, -1, "timeline editor helper block should end before prompt UI renderer");

const elements = new Map();
global.window = global;
global.document = {
  getElementById(id) {
    return elements.get(id) || null;
  },
};

vm.runInThisContext(source.slice(start, end), {
  filename: "js/step6.js.scene-timing-editor-slice",
});

elements.set("scene_time_start_0", { value: "0:08" });
elements.set("scene_time_end_0", { value: "0:17" });
elements.set("scene_lyrics_0", { value: "다시 빛을 향해 걸어간다" });
elements.set("scene_location_0", { value: "sunrise rooftop" });
elements.set("scene_emotion_0", { value: "hopeful" });
elements.set("scene_mood_0", { value: "warm open horizon" });
elements.set("scene_lighting_0", { value: "golden sunrise backlight" });
elements.set("scene_camera_work_0", { value: "slow crane-up" });

const scene = {
  time: "0:00-0:08",
  startSeconds: 0,
  endSeconds: 8,
  durationSeconds: 8,
  lyrics: "이전 가사",
  location: "old location",
  emotion: "sad",
};

window.updateMVSceneTimelineFromEditor(scene, 0);

assert.strictEqual(scene.time, "0:08-0:17");
assert.strictEqual(scene.startSeconds, 8);
assert.strictEqual(scene.endSeconds, 17);
assert.strictEqual(scene.durationSeconds, 9);
assert.strictEqual(scene.lyrics, "다시 빛을 향해 걸어간다");
assert.strictEqual(scene.location, "sunrise rooftop");
assert.strictEqual(scene.emotion, "hopeful");
assert.strictEqual(scene.mood, "warm open horizon");
assert.strictEqual(scene.lighting, "golden sunrise backlight");
assert.strictEqual(scene.cameraWork, "slow crane-up");

elements.set("scene_time_start_1", { value: "0:30" });
elements.set("scene_time_end_1", { value: "0:20" });
elements.set("scene_lyrics_1", { value: "역전된 시간은 반영하지 않는다" });
elements.set("scene_location_1", { value: "rainy street" });
elements.set("scene_emotion_1", { value: "lonely" });

const invalidScene = {
  time: "0:10-0:18",
  startSeconds: 10,
  endSeconds: 18,
  durationSeconds: 8,
};

window.updateMVSceneTimelineFromEditor(invalidScene, 1);

assert.strictEqual(invalidScene.time, "0:10-0:18");
assert.strictEqual(invalidScene.startSeconds, 10);
assert.strictEqual(invalidScene.endSeconds, 18);
assert.strictEqual(invalidScene.durationSeconds, 8);
assert.strictEqual(invalidScene.lyrics, "역전된 시간은 반영하지 않는다");
assert.strictEqual(invalidScene.location, "rainy street");
assert.strictEqual(invalidScene.emotion, "lonely");

console.log("MV scene timing editor smoke test: PASS");
