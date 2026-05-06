const assert = require("assert");
const fs = require("fs");

const html = fs.readFileSync("index.html", "utf8");

const progressMatch = html.match(
  /<div class="progress-steps" id="progressSteps">([\s\S]*?)<\/div>\s*<\/div>\s*<!-- Panel 1:/,
);

assert.ok(progressMatch, "Progress steps block should be present");

const progressHtml = progressMatch[1];

const expectedIcons = {
  1: "fa-pen",
  2: "fa-magic",
  3: "fa-chart-line",
  4: "fa-lightbulb",
  5: "fa-file-export",
  6: "fa-bullhorn",
};

for (let step = 1; step <= 6; step += 1) {
  const startPattern = new RegExp(
    `<div class="step[^"]*"[^>]*data-step="${step}"[^>]*onclick="goToStep\\(${step}, false, true\\)"`,
  );
  const startMatch = progressHtml.match(startPattern);
  assert.ok(
    startMatch,
    `Progress step ${step} should have data-step and goToStep click handler`,
  );

  const startIndex = startMatch.index;
  const nextStartMatch = progressHtml
    .slice(startIndex + startMatch[0].length)
    .match(/<div class="step[^"]*"/);
  const endIndex = nextStartMatch
    ? startIndex + startMatch[0].length + nextStartMatch.index
    : progressHtml.length;
  const stepHtml = progressHtml.slice(startIndex, endIndex);
  assert.ok(
    /class="step-drag-handle"[\s\S]*fa-grip-vertical/.test(stepHtml),
    `Progress step ${step} should keep the drag handle separate`,
  );
  assert.ok(
    new RegExp(`class="step-icon"[\\s\\S]*${expectedIcons[step]}`).test(
      stepHtml,
    ),
    `Progress step ${step} should render its visible icon outside the drag handle`,
  );
}

assert.ok(
  !/<div class="step[^"]*"\s*<span/.test(progressHtml),
  "Progress step div tags should be closed before child spans",
);

console.log("MV progress steps smoke test: PASS");
