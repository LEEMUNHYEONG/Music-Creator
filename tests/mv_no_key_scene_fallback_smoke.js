const assert = require("assert");
const fs = require("fs");

const step6Source = fs.readFileSync("js/step6.js", "utf8");

assert.ok(
  step6Source.includes("API 키 없이 로컬 기본 방식으로 씬 생성합니다."),
  "generateSceneOverview should include a local scene fallback for missing API keys",
);
assert.ok(
  step6Source.includes("scenes.length === 0 && cleanLyrics && cleanLyrics.trim()"),
  "local fallback should run when lyrics exist but no scenes were generated",
);
assert.ok(
  step6Source.includes("_isLocalFallback: true"),
  "local fallback scenes should be marked for diagnostics",
);
assert.ok(
  step6Source.includes("로컬 기본 방식 씬 생성 완료"),
  "local fallback should log the generated scene count",
);

console.log("MV no-key scene fallback smoke test: PASS");
