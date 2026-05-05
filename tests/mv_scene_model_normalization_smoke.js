const assert = require("assert");

const originalConsole = { ...console };
console.log = function logStub() {};

global.window = global;
global.document = {
  getElementById() {
    return null;
  },
};
global.localStorage = {
  getItem() {
    return null;
  },
  setItem() {},
};

require("../js/storage.js");

const legacyMarketing = {
  mvScenes: [
    {
      time: "0:00-0:08",
      scene: "첫 장면",
      promptEn: "legacy english prompt",
      promptKo: "기존 한글 프롬프트",
      location: "city",
      customField: "preserved",
    },
    "문자열로 저장된 오래된 씬",
  ],
};

const legacyMv = window.syncMarketingMVModel(legacyMarketing);
assert.strictEqual(legacyMv.scenes.length, 2);
assert.deepStrictEqual(
  {
    id: legacyMv.scenes[0].id,
    index: legacyMv.scenes[0].index,
    sceneNumber: legacyMv.scenes[0].sceneNumber,
    startSeconds: legacyMv.scenes[0].startSeconds,
    endSeconds: legacyMv.scenes[0].endSeconds,
    durationSeconds: legacyMv.scenes[0].durationSeconds,
    prompt: legacyMv.scenes[0].prompt,
    customField: legacyMv.scenes[0].customField,
  },
  {
    id: "scene-1",
    index: 0,
    sceneNumber: 1,
    startSeconds: 0,
    endSeconds: 8,
    durationSeconds: 8,
    prompt: "legacy english prompt",
    customField: "preserved",
  },
);
assert.strictEqual(legacyMv.scenes[1].id, "scene-2");
assert.strictEqual(legacyMv.scenes[1].scene, "문자열로 저장된 오래된 씬");
assert.strictEqual(legacyMv.scenes[1].prompt, "");
assert.deepStrictEqual(legacyMarketing.mvScenes, legacyMarketing.mv.scenes);

const modernMarketing = {
  mv: {
    scenes: [
      {
        id: "custom-scene",
        startSeconds: 12,
        endSeconds: 20,
        description: "description fallback",
        prompt: "modern prompt",
        _isFilled: true,
      },
    ],
  },
  mvScenes: [
    {
      scene: "legacy should not win",
      prompt: "legacy prompt",
    },
  ],
};

const modernMv = window.getMarketingMVData(modernMarketing);
assert.strictEqual(modernMv.scenes.length, 1);
assert.strictEqual(modernMv.scenes[0].id, "custom-scene");
assert.strictEqual(modernMv.scenes[0].time, "0:12-0:20");
assert.strictEqual(modernMv.scenes[0].durationSeconds, 8);
assert.strictEqual(modernMv.scenes[0].scene, "description fallback");
assert.strictEqual(modernMv.scenes[0].prompt, "modern prompt");
assert.strictEqual(modernMv.scenes[0]._isFilled, true);

originalConsole.log("MV scene model normalization smoke test: PASS");
process.exit(0);
