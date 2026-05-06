const assert = require("assert");
const fs = require("fs");

const html = fs.readFileSync("index.html", "utf8");

const progressMatch = html.match(
  /<div class="progress-steps" id="progressSteps">([\s\S]*?)<\/div>\s*<\/div>\s*<!-- Panel 1:/,
);

assert.ok(progressMatch, "Progress steps block should be present");

const progressHtml = progressMatch[1];

for (let step = 1; step <= 6; step += 1) {
  const stepPattern = new RegExp(
    `<div class="step[^"]*"[^>]*data-step="${step}"[^>]*onclick="goToStep\\(${step}, false, true\\)"`,
  );
  assert.ok(
    stepPattern.test(progressHtml),
    `Progress step ${step} should have data-step and goToStep click handler`,
  );
}

assert.ok(
  !/<div class="step[^"]*"\s*<span/.test(progressHtml),
  "Progress step div tags should be closed before child spans",
);

console.log("MV progress steps smoke test: PASS");
