const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.resolve(__dirname, "../js/step4.js"), "utf8");

assert.ok(source.includes("callExtractedLyricsInstructionAI"));
assert.ok(source.includes("Gemini 추출 가사 지시어 생성 실패, ChatGPT로 전환"));
assert.ok(source.includes("OpenAI 추출 가사 지시어 생성 실패"));
assert.ok(source.includes("Gemini 지침서 검수 실패, ChatGPT로 전환"));
assert.ok(source.includes("window.handleGeminiApiFailure"));
assert.ok(source.includes("window.getOpenAIApiKey"));
assert.ok(source.includes("gpt-4o-mini"));

console.log("MV step4 AI fallback smoke test: PASS");
process.exit(0);
