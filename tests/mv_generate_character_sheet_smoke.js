const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const originalConsole = { ...console };
const elements = new Map();
const fetchCalls = [];
let alertMessage = "";
let toastMessage = "";
let saveCount = 0;
let apiUsage = [];

console.log = function logStub() {};
console.warn = function warnStub() {};
console.error = function errorStub() {};

function addElement(id, value = "") {
  const el = {
    id,
    value,
    textContent: value,
    innerText: value,
    disabled: false,
    style: {},
  };
  elements.set(id, el);
  return el;
}

global.window = global;
global.document = {
  getElementById(id) {
    return elements.get(id) || null;
  },
};
global.alert = function alertStub(message) {
  alertMessage = message;
};
global.fetch = async function fetchStub(url, options) {
  fetchCalls.push({ url, options });
  if (String(url).includes("generativelanguage.googleapis.com")) {
    return {
      ok: true,
      async json() {
        return {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: "```text\nMIDJOURNEY PROMPT (COPY THIS):\ncharacter sheet, turnaround\n[Identity]\n- Gender: Female\n```",
                  },
                ],
              },
            },
          ],
        };
      },
    };
  }
  throw new Error(`Unexpected fetch URL: ${url}`);
};

window.getGeminiApiKey = function getGeminiApiKeyStub() {
  return "AIza-valid-test-key";
};
window.getOpenAIApiKey = function getOpenAIApiKeyStub() {
  return "sk-test";
};
window.getMVLocationEnString = function getMVLocationEnStringStub() {
  return "rainy city alley";
};
window.saveMVSettings = function saveMVSettingsStub() {
  saveCount += 1;
};
window.showCopyIndicator = function showCopyIndicatorStub(message) {
  toastMessage = message;
};
window.logApiUsage = function logApiUsageStub(provider) {
  apiUsage.push(provider);
};
window.callGeminiWithAutoRoute = async function callGeminiWithAutoRouteStub(prompt, generationConfig, geminiKey) {
  // 테스트용: 실제 키를 가진 경우 generativelanguage.googleapis.com으로 직접 호출
  const key = geminiKey || "";
  const isRealKey = key && key.startsWith("AIza") && !key.includes("Proxy");
  const model = window.getGeminiModel ? window.getGeminiModel() : "gemini-3.5-flash";
  if (isRealKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: generationConfig || {},
      }),
    });
    if (!response.ok) throw new Error("Gemini error " + response.status);
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) throw new Error("Gemini response empty");
    return text;
  } else {
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, model, generationConfig }),
    });
    if (!response.ok) throw new Error("Gemini proxy error " + response.status);
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) throw new Error("Gemini proxy response empty");
    return text;
  }
};

const step6Source = fs.readFileSync(path.resolve(__dirname, "../test-results/mv_modules.compat.js"), "utf8");
const start = step6Source.indexOf("window.generateCharacterSheet = async function");
const end = step6Source.indexOf("// --- Extracted character sheet helpers ---", start);
assert.ok(start !== -1, "generateCharacterSheet should exist in js/step6.js");
assert.ok(end !== -1, "generateCharacterSheet block should end before character sheet helpers");
vm.runInThisContext(step6Source.slice(start, end), {
  filename: "js/step6.js.generate-character-sheet-slice",
});

addElement("mvCharacter1_sheetBtn");
addElement("mvCharacter1_sheetLoading");
addElement("mvCharacter1_sheetArea");
addElement("mvCharacter1_sheetToggle");
addElement("mvCharacter1_sheetCopy");
addElement("mvCharacter1_sheet");
addElement("mvCharacter1_gender", "female");
addElement("mvCharacter1_age", "20s");
addElement("mvCharacter1_race", "asian");
addElement("mvCharacter1_appearance", "black bob hair");
addElement("mvCharacter1_artStyle", "photorealistic");
addElement("mvEra", "modern");
addElement("mvCountry", "korea");
addElement("mvLighting", "neon");
addElement("mvCameraWork", "slow dolly");
addElement("mvMood", "melancholy");
addElement("mvCustomSettings", "consistent outfit");
addElement("mvCharacterCount", "1");
addElement("finalLyrics", "비 오는 밤의 노래");

(async () => {
  await window.generateCharacterSheet(1);

  assert.strictEqual(fetchCalls.length, 1);
  assert.ok(
    fetchCalls[0].url.includes("generativelanguage.googleapis.com") ||
    fetchCalls[0].url.includes("/api/gemini"),
    `fetch URL이 Gemini 엔드포인트여야 합니다. 실제 URL: ${fetchCalls[0].url}`
  );
  const requestBody = JSON.parse(fetchCalls[0].options.body);
  const prompt = requestBody.contents[0].parts[0].text;
  assert.ok(prompt.includes("CORE CHARACTERISTICS"));
  assert.ok(prompt.includes("East Asian"));
  assert.ok(prompt.includes("rainy city alley"));
  assert.ok(prompt.includes("비 오는 밤의 노래"));

  assert.strictEqual(document.getElementById("mvCharacter1_sheetBtn").disabled, false);
  assert.strictEqual(document.getElementById("mvCharacter1_sheetLoading").style.display, "none");
  assert.strictEqual(document.getElementById("mvCharacter1_sheetArea").style.display, "block");
  assert.strictEqual(document.getElementById("mvCharacter1_sheetToggle").style.display, "inline-flex");
  assert.strictEqual(document.getElementById("mvCharacter1_sheetCopy").style.display, "inline-flex");
  assert.ok(document.getElementById("mvCharacter1_sheet").value.includes("[Identity]"));
  assert.strictEqual(saveCount, 1);
  assert.deepStrictEqual(apiUsage, ["gemini"]);
  assert.ok(toastMessage.includes("인물 1"));

  document.getElementById("mvCharacter1_gender").value = "";
  document.getElementById("mvCharacter1_age").value = "";
  document.getElementById("mvCharacter1_race").value = "";
  document.getElementById("mvCharacter1_appearance").value = "";
  alertMessage = "";
  await window.generateCharacterSheet(1);
  assert.ok(alertMessage.includes("인물 정보를 최소 1개"));

  document.getElementById("mvCharacter1_gender").value = "female";
  window.getGeminiApiKey = function missingGeminiKeyStub() {
    return "";
  };
  alertMessage = "";
  await window.generateCharacterSheet(1);
  assert.ok(alertMessage.includes("Gemini API 키"));

  originalConsole.log("MV generate character sheet smoke test: PASS");
  process.exit(0);
})().catch((error) => {
  originalConsole.error(error);
  process.exit(1);
});
