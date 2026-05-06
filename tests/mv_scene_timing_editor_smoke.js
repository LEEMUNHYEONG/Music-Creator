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
const completePrompt =
  "sunrise rooftop music video frame with hopeful vocalist walking toward warm open horizon, golden sunrise backlight, slow crane-up camera movement, photorealistic cinematic detail, emotional performance, 16:9 aspect ratio, sharp focus, detailed lighting, cohesive color palette";
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
elements.set("scene_overview_0_en", { value: completePrompt });
elements.set("scene_overview_0_ko", { value: "희망적인 옥상 장면" });
elements.set("scene_editor_notice_0", {
  attributes: {},
  textContent: "",
  style: {},
  setAttribute(name, value) {
    this.attributes[name] = value;
  },
});
elements.set("scene_editor_summary_0", { textContent: "" });
elements.set("mv_scene_quality_summary", { textContent: "" });
elements.set("mv_scene_quality_summary_text", { textContent: "" });
elements.set("mv_scene_quality_focus_btn", { disabled: false });
[
  "invalidTime",
  "missingLocation",
  "missingCamera",
  "missingLyrics",
  "missingEnPrompt",
  "missingKoPrompt",
  "promptLength",
  "blockedTerms",
  "duplicatePrompt",
].forEach((key) => {
  elements.set(`mv_scene_quality_filter_${key}`, {
    disabled: false,
    textContent: "",
  });
});

const scene = {
  time: "0:00-0:08",
  startSeconds: 0,
  endSeconds: 8,
  durationSeconds: 8,
  lyrics: "이전 가사",
  location: "old location",
  emotion: "sad",
};
window.currentScenes = [scene];

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
assert.strictEqual(elements.get("scene_editor_notice_0").textContent, "");
assert.strictEqual(elements.get("scene_editor_notice_0").style.display, "none");
assert.strictEqual(elements.get("scene_editor_notice_0").attributes["aria-hidden"], "true");
assert.ok(elements.get("scene_editor_summary_0").textContent.includes("0:08-0:17 / 9초"));
assert.ok(elements.get("scene_editor_summary_0").textContent.includes("메타데이터 5/5"));
assert.ok(elements.get("scene_editor_summary_0").textContent.includes("가사 있음"));
assert.ok(elements.get("scene_editor_summary_0").textContent.includes("EN 있음"));
assert.ok(elements.get("scene_editor_summary_0").textContent.includes("KO 있음"));
assert.ok(elements.get("mv_scene_quality_summary_text").textContent.includes("전체 1개 씬"));
assert.ok(elements.get("mv_scene_quality_summary_text").textContent.includes("준비 완료 1개"));
assert.ok(elements.get("mv_scene_quality_summary_text").textContent.includes("확인 필요 0개"));
assert.strictEqual(elements.get("mv_scene_quality_focus_btn").disabled, true);
assert.strictEqual(elements.get("mv_scene_quality_filter_invalidTime").disabled, true);
assert.strictEqual(elements.get("mv_scene_quality_filter_missingLocation").disabled, true);
assert.strictEqual(elements.get("mv_scene_quality_filter_missingCamera").disabled, true);
assert.strictEqual(elements.get("mv_scene_quality_filter_missingLyrics").disabled, true);
assert.strictEqual(elements.get("mv_scene_quality_filter_missingEnPrompt").disabled, true);
assert.strictEqual(elements.get("mv_scene_quality_filter_missingKoPrompt").disabled, true);
assert.strictEqual(elements.get("mv_scene_quality_filter_promptLength").disabled, true);
assert.strictEqual(elements.get("mv_scene_quality_filter_blockedTerms").disabled, true);
assert.strictEqual(elements.get("mv_scene_quality_filter_duplicatePrompt").disabled, true);

elements.set("scene_time_start_1", { value: "0:30" });
elements.set("scene_time_end_1", { value: "0:20" });
elements.set("scene_lyrics_1", { value: "역전된 시간은 반영하지 않는다" });
elements.set("scene_location_1", { value: "rainy street" });
elements.set("scene_emotion_1", { value: "lonely" });
elements.set("scene_editor_notice_1", {
  attributes: {},
  textContent: "",
  style: {},
  setAttribute(name, value) {
    this.attributes[name] = value;
  },
});

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
assert.ok(elements.get("scene_editor_notice_1").textContent.includes("기존 타임라인"));
assert.strictEqual(elements.get("scene_editor_notice_1").style.display, "block");
assert.strictEqual(elements.get("scene_editor_notice_1").attributes["aria-hidden"], "false");

elements.set("scene_time_start_2", { value: "0:20" });
elements.set("scene_time_end_2", { value: "0:28" });
elements.set("scene_lyrics_2", { value: "빈 메타데이터 안내 확인" });
elements.set("scene_location_2", { value: "" });
elements.set("scene_emotion_2", { value: "" });
elements.set("scene_mood_2", { value: "" });
elements.set("scene_lighting_2", { value: "" });
elements.set("scene_camera_work_2", { value: "" });
elements.set("scene_editor_notice_2", {
  attributes: {},
  textContent: "",
  style: {},
  setAttribute(name, value) {
    this.attributes[name] = value;
  },
});

const emptyMetadataScene = {
  time: "0:20-0:28",
  startSeconds: 20,
  endSeconds: 28,
  durationSeconds: 8,
};

window.updateMVSceneTimelineFromEditor(emptyMetadataScene, 2);

assert.strictEqual(emptyMetadataScene.time, "0:20-0:28");
assert.ok(elements.get("scene_editor_notice_2").textContent.includes("메타데이터가 비어"));
assert.strictEqual(elements.get("scene_editor_notice_2").style.display, "block");
assert.strictEqual(elements.get("scene_editor_notice_2").attributes["aria-hidden"], "false");

const renderOverviewSource = source.slice(
  source.indexOf("window.renderSceneOverview = function"),
  source.indexOf("// === MV Step 6: MV generation flows ==="),
);
assert.ok(renderOverviewSource.includes('tabindex="-1"'));
assert.ok(renderOverviewSource.includes('aria-labelledby="scene_overview_title_${index}"'));
assert.ok(renderOverviewSource.includes('role="status"'));
assert.ok(renderOverviewSource.includes('aria-live="polite"'));
assert.ok(renderOverviewSource.includes('aria-describedby="scene_editor_notice_${index}"'));
assert.ok(renderOverviewSource.includes("renderMVSceneEditorSummary(scene, index)"));
assert.ok(renderOverviewSource.includes("renderMVSceneQualitySummary(scenes)"));
assert.ok(renderOverviewSource.includes(".scene-overview-en,.scene-overview-ko"));
assert.ok(source.slice(start, end).includes("focusMVFirstReviewScene"));
assert.ok(source.slice(start, end).includes("focusMVSceneIssue"));

const mixedQualityText = getMVSceneQualitySummaryText([
  scene,
  {
    time: "0:30-0:20",
    lyrics: "",
    prompt: "",
    promptKo: "",
    location: "",
  },
]);
assert.ok(mixedQualityText.includes("전체 2개 씬"));
assert.ok(mixedQualityText.includes("준비 완료 1개"));
assert.ok(mixedQualityText.includes("확인 필요 1개"));
assert.ok(mixedQualityText.includes("시간 확인 1개"));
assert.ok(mixedQualityText.includes("메타데이터 없음 1개"));
assert.ok(mixedQualityText.includes("장소 없음 1개"));
assert.ok(mixedQualityText.includes("카메라 없음 1개"));
assert.ok(mixedQualityText.includes("가사 없음 1개"));
assert.ok(mixedQualityText.includes("EN 없음 1개"));
assert.ok(mixedQualityText.includes("KO 없음 1개"));
const confirmMessage = getMVSceneQualityConfirmMessage([
  scene,
  {
    time: "0:30-0:20",
    lyrics: "",
    prompt: "",
    promptKo: "",
    location: "",
  },
]);
assert.ok(confirmMessage.includes("1개 씬에 확인 필요"));
assert.ok(confirmMessage.includes("시간 확인 1개"));
assert.ok(confirmMessage.includes("장소 없음 1개"));
assert.ok(confirmMessage.includes("카메라 없음 1개"));
assert.ok(confirmMessage.includes("취소하면 첫 확인 필요 씬으로 이동"));
assert.ok(confirmMessage.includes("결과 화면으로 이동하려면 확인"));
assert.strictEqual(getMVSceneQualityConfirmMessage([scene]), "");
assert.deepStrictEqual(
  getMVSceneReviewIndexes([
    scene,
    {
      time: "0:30-0:20",
      lyrics: "",
      prompt: "",
      promptKo: "",
      location: "",
    },
  ]),
  [1],
);
const issueScenes = [
  scene,
  {
    time: "0:30-0:20",
    lyrics: "",
    prompt: "",
    promptKo: "",
    location: "",
  },
];
assert.deepStrictEqual(getMVSceneIssueIndexes(issueScenes, "invalidTime"), [1]);
assert.deepStrictEqual(getMVSceneIssueIndexes(issueScenes, "missingMetadata"), [1]);
assert.deepStrictEqual(getMVSceneIssueIndexes(issueScenes, "missingLocation"), [1]);
assert.deepStrictEqual(getMVSceneIssueIndexes(issueScenes, "missingCamera"), [1]);
assert.deepStrictEqual(getMVSceneIssueIndexes(issueScenes, "missingLyrics"), [1]);
assert.deepStrictEqual(getMVSceneIssueIndexes(issueScenes, "missingEnPrompt"), [1]);
assert.deepStrictEqual(getMVSceneIssueIndexes(issueScenes, "missingKoPrompt"), [1]);
assert.deepStrictEqual(getMVSceneIssueIndexes(issueScenes, "promptLength"), []);
assert.deepStrictEqual(getMVSceneIssueIndexes(issueScenes, "blockedTerms"), []);
assert.deepStrictEqual(getMVSceneIssueIndexes(issueScenes, "duplicatePrompt"), []);
let focusedReviewIndex = null;
window.currentScenes = issueScenes;
elements.set("scene_editor_summary_1", { textContent: "" });
window.focusMVSceneCard = function (index) {
  focusedReviewIndex = index;
};
assert.strictEqual(window.focusMVFirstReviewScene(), true);
assert.strictEqual(focusedReviewIndex, 1);
assert.ok(elements.get("scene_editor_summary_1").textContent.includes("선택 필터: 확인 필요 확인"));
focusedReviewIndex = null;
assert.strictEqual(window.focusMVSceneIssue("missingLocation"), true);
assert.strictEqual(focusedReviewIndex, 1);
assert.ok(elements.get("scene_editor_summary_1").textContent.includes("선택 필터: 장소 확인"));

console.log("MV scene timing editor smoke test: PASS");
