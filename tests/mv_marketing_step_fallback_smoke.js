const assert = require("assert");
const fs = require("fs");

const appJs = fs.readFileSync("app.js", "utf8");

const goToMarketingMatch = appJs.match(
  /window\.goToMarketingStep = function \(\) \{([\s\S]*?)window\.marketingData = \{/,
);

assert.ok(goToMarketingMatch, "goToMarketingStep should be present");

const goToMarketingBody = goToMarketingMatch[1];

assert.ok(
  goToMarketingBody.includes('document.getElementById("sunoLyrics")?.value'),
  "goToMarketingStep should fall back to 2-step Suno lyrics when final lyrics are missing",
);

assert.ok(
  goToMarketingBody.includes("window.currentProject?.data?.sunoLyrics"),
  "goToMarketingStep should fall back to saved project Suno lyrics",
);

assert.ok(
  goToMarketingBody.includes('document.getElementById("stylePrompt")?.value'),
  "goToMarketingStep should fall back to 2-step style prompt when final style is missing",
);

assert.ok(
  goToMarketingBody.includes("window.currentProject?.data?.stylePrompt"),
  "goToMarketingStep should fall back to saved project style prompt",
);

console.log("MV marketing step fallback smoke test: PASS");
