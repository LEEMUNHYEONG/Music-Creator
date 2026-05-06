const assert = require("assert");

const originalConsole = { ...console };
const elements = new Map();
let clipboardText = "";
let toastMessage = "";
let blobText = "";
let clickedDownload = "";
let appended = false;
let removed = false;
let revokedUrl = "";

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
  createElement(tag) {
    assert.strictEqual(tag, "a");
    return {
      href: "",
      download: "",
      click() {
        clickedDownload = this.download;
      },
    };
  },
  body: {
    appendChild() {
      appended = true;
    },
    removeChild() {
      removed = true;
    },
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
global.Blob = class BlobStub {
  constructor(parts, options) {
    blobText = parts.join("");
    this.options = options;
  }
};
global.URL = {
  createObjectURL() {
    return "blob:mv-video-tool-test";
  },
  revokeObjectURL(url) {
    revokedUrl = url;
  },
};
global.alert = function alertStub(message) {
  throw new Error(`Unexpected alert: ${message}`);
};

window.showCopyIndicator = function showCopyIndicator(message) {
  toastMessage = message;
};
window.currentScenes = [
  {
    time: "00:00-00:07",
    scene: "비 내리는 골목을 걷는 주인공",
    lyrics: "멈춰 선 밤의 끝",
    location: "rainy alley",
    emotion: "lonely",
    mood: "quiet negative space",
    lighting: "blue-hour side light",
    cameraWork: "slow dolly-in",
    durationSeconds: 7,
    prompt: "rainy alley hero walk, cinematic composition",
    promptKo: "비 내리는 골목을 걷는 주인공",
    runwayPrompt:
      "A lonely hero walks through a rain-soaked alley while neon reflections ripple underfoot",
  },
  {
    time: "00:07-00:13",
    scene: "옥상 위 인물 클로즈업",
    prompt: "close-up of a person on a rooftop at dawn",
    promptKo: "새벽 옥상 위 인물 클로즈업",
  },
];

addElement("scene_1_en", "textarea prompt for the second scene");
addElement("scene_1_ko", "두 번째 씬 textarea 한글");

require("../js/step6.js");

const runwayText = window.buildMVVideoToolPrompts("runway");
assert.ok(runwayText.includes("MV Runway 영상 생성 프롬프트"));
assert.ok(runwayText.includes("A lonely hero walks through a rain-soaked alley"));
assert.ok(runwayText.includes("cinematic motion"));
assert.ok(runwayText.includes("가사 구간: 멈춰 선 밤의 끝"));
assert.ok(runwayText.includes("카메라: slow dolly-in"));
assert.ok(runwayText.includes("길이: 7초"));
assert.ok(runwayText.includes("Duration: 7 seconds"));
assert.ok(runwayText.includes("textarea prompt for the second scene"));

const pikaText = window.buildMVVideoToolPrompts("pika");
assert.ok(pikaText.includes("MV Pika 영상 생성 프롬프트"));
assert.ok(pikaText.includes("animate as a polished music video shot"));
assert.ok(pikaText.includes("두 번째 씬 textarea 한글"));

window.copyMVVideoToolPrompts("pika");

setImmediate(() => {
  assert.ok(clipboardText.includes("MV Pika 영상 생성 프롬프트"));
  assert.ok(toastMessage.includes("Pika"));

  window.downloadMVVideoToolPrompts("kling");
  assert.strictEqual(clickedDownload, "mv-kling-prompts.txt");
  assert.strictEqual(appended, true);
  assert.strictEqual(removed, true);
  assert.strictEqual(revokedUrl, "blob:mv-video-tool-test");
  assert.ok(blobText.includes("MV Kling 영상 생성 프롬프트"));
  assert.ok(blobText.includes("high-detail cinematic video"));

  originalConsole.log("MV video tool export templates smoke test: PASS");
  process.exit(0);
});
