const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const originalConsole = { ...console };
const elements = new Map();
const store = new Map();
const alerts = [];
const toasts = [];
let clipboardText = "";
let translatedText = "";

console.error = function errorStub() {};

function addElement(id, value = "") {
  const el = { id, value, textContent: value };
  elements.set(id, el);
  return el;
}

global.window = global;
global.document = {
  getElementById(id) {
    return elements.get(id) || null;
  },
};
global.localStorage = {
  getItem(key) {
    return store.has(key) ? store.get(key) : null;
  },
  setItem(key, value) {
    store.set(key, String(value));
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
  alerts.push(message);
};
// alert()가 window.showToast(message, level)로 전환되어 동일하게 스텁한다.
window.showToast = function showToastStub(message, level) {
  alerts.push(message);
};
global.translateKoreanToEnglishForScene = async function translateStub(fieldName, koreanText) {
  // fieldName은 "prompt", "location" 등 필드 식별자이고 koreanText가 실제 번역 대상
  const textToTranslate = koreanText !== undefined ? koreanText : fieldName;
  translatedText = textToTranslate;
  return `translated: ${textToTranslate}`;
};
window.showCopyIndicator = function showCopyIndicatorStub(message) {
  toasts.push(message);
};

const step6Source = fs.readFileSync(path.resolve(__dirname, "../test-results/mv_modules.compat.js"), "utf8");
const start = step6Source.indexOf("window.updateMVPromptTranslation = async function");
const end = step6Source.indexOf("// --- Extracted generateSRTPreview ---", start);
assert.ok(start !== -1, "updateMVPromptTranslation should exist in js/step6.js");
assert.ok(end !== -1, "prompt helper block should end before SRT helpers");
vm.runInThisContext(step6Source.slice(start, end), {
  filename: "js/step6.js.mv-prompt-helper-slice",
});

addElement("mvBackgroundPromptKo", "비 오는 골목");
addElement("mvBackgroundPromptEn", "");
addElement("mvThumbnailPromptKo", "썸네일 한글");
addElement("mvThumbnailPromptEn", "thumbnail english");
addElement("mvBackgroundDetailPromptKo", "배경 상세 한글");
addElement("mvBackgroundDetailPromptEn", "background detail english");

(async () => {
  await window.updateMVPromptTranslation("background");
  assert.strictEqual(translatedText, "비 오는 골목");
  assert.strictEqual(
    document.getElementById("mvBackgroundPromptEn").value,
    "translated: 비 오는 골목",
  );

  document.getElementById("mvBackgroundPromptKo").value = "";
  await window.updateMVPromptTranslation("background");
  assert.strictEqual(document.getElementById("mvBackgroundPromptEn").value, "");

  window.saveMVPrompt("thumbnail");
  const saved = JSON.parse(localStorage.getItem("mvPrompt_thumbnail"));
  assert.strictEqual(saved.type, "thumbnail");
  assert.strictEqual(saved.ko, "썸네일 한글");
  assert.strictEqual(saved.en, "thumbnail english");
  assert.ok(saved.savedAt);
  assert.ok(toasts.some((message) => message.includes("thumbnail 프롬프트")));

  document.getElementById("mvBackgroundPromptKo").value = "비 오는 골목";
  document.getElementById("mvBackgroundPromptEn").value = "translated: 비 오는 골목";
  window.copyMVPromptSection("background");
  setImmediate(() => {
    assert.ok(clipboardText.includes("=== 배경 프롬프트 ==="));
    assert.ok(clipboardText.includes("[영어]"));
    assert.ok(clipboardText.includes("[한글]"));
    assert.ok(clipboardText.includes("translated: 비 오는 골목"));
    assert.ok(toasts.some((message) => message.includes("배경 프롬프트")));

    navigator.clipboard.writeText = function writeTextReject() {
      return Promise.reject(new Error("clipboard denied"));
    };
    window.copyMVPromptSection("character");

    setImmediate(() => {
      assert.ok(alerts.some((message) => message.includes("복사 중 오류")));
      originalConsole.log("MV prompt helpers smoke test: PASS");
      process.exit(0);
    });
  });
})().catch((error) => {
  originalConsole.error(error);
  process.exit(1);
});
