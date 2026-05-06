const assert = require("assert");
const fs = require("fs");

const appJs = fs.readFileSync("app.js", "utf8");

assert.ok(
  appJs.includes("function showMarketingMVWorkspace()"),
  "app.js should expose a helper that opens the MV workspace",
);

const helperMatch = appJs.match(
  /function showMarketingMVWorkspace\(\) \{([\s\S]*?)\n\}/,
);
assert.ok(helperMatch, "showMarketingMVWorkspace helper should be present");

const helperBody = helperMatch[1];
assert.ok(
  helperBody.includes('document.getElementById("marketingResult")'),
  "MV workspace helper should reveal the marketing result area",
);
assert.ok(
  helperBody.includes('marketingResult.style.display = "block"'),
  "MV workspace helper should display the marketing result area",
);
assert.ok(
  helperBody.includes('marketingResult.classList.remove("hidden")'),
  "MV workspace helper should remove the hidden class from the marketing result area",
);
assert.ok(
  helperBody.includes('window.showMarketingTab("mv")'),
  "MV workspace helper should switch to the MV prompt tab",
);

const generateStart = appJs.indexOf("window.generateMarketingMaterials = async function");
assert.ok(generateStart !== -1, "generateMarketingMaterials should be present");

const noKeyStart = appJs.indexOf(
  'if (!geminiKey || !geminiKey.startsWith("AIza")) {',
  generateStart,
);
assert.ok(noKeyStart !== -1, "Gemini missing-key branch should be present");

const noKeyEnd = appJs.indexOf("\n    }\n\n    // 지침서 가져오기", noKeyStart);
assert.ok(noKeyEnd !== -1, "Gemini missing-key branch should end before guideline loading");

const noKeyBranch = appJs.slice(noKeyStart, noKeyEnd);
assert.ok(
  noKeyBranch.includes("showMarketingMVWorkspace();"),
  "Gemini missing-key branch should keep the MV workspace accessible",
);
assert.ok(
  noKeyBranch.includes("MV 프롬프트 탭은 계속 사용할 수"),
  "Gemini missing-key message should tell users the MV tab remains usable",
);

console.log("MV marketing no-key MV access smoke test: PASS");
