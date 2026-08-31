const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.resolve(__dirname, "../test-results/mv_modules.compat.js"), "utf8");

const expectedSections = [
  "// === MV Step 6: Core utilities ===",
  "// === MV Step 6: Prompt and scene review rendering ===",
  "// === MV Step 6: MV generation flows ===",
  "// === MV Step 6: Location, settings, and character helpers ===",
  "// === MV Step 6: Prompt persistence and export ===",
  "// === MV Step 6: Legacy cross-step helpers ===",
  "// === MV Step 6: SRT export and preview ===",
  "// === MV Step 6: Translation, regeneration, copy, and tag actions ===",
];

let previousIndex = -1;
for (const section of expectedSections) {
  const index = source.indexOf(section);
  assert.notStrictEqual(index, -1, `${section} should exist`);
  assert.ok(index > previousIndex, `${section} should appear after the previous section`);
  previousIndex = index;
}

const protectedMarkers = [
  "// --- Extracted generateMVDetailPrompts ---",
  "// --- Extracted generateSceneOverview ---",
  "// --- Extracted generateMVThumbnailPrompts ---",
  "// --- Extracted getMVLocationValues ---",
  "// --- Extracted MV settings helpers ---",
  "// --- Extracted character sheet helpers ---",
  "// --- Extracted generateSRTPreview ---",
  "// --- Restored Translation Sync Functions ---",
  "// --- Restored Regeneration Functions ---",
  "// --- Restored Copy and Focus Functions ---",
  "// --- Restored Scene Prompt Regeneration Functions ---",
];

for (const marker of protectedMarkers) {
  assert.notStrictEqual(source.indexOf(marker), -1, `${marker} should remain for slice-based tests`);
}

assert.ok(
  source.indexOf("// --- Extracted MV settings helpers ---") <
    source.indexOf("// --- Extracted generateSRTPreview ---"),
  "MV settings helpers should remain before the SRT preview marker",
);
assert.ok(
  source.indexOf("// --- Extracted character sheet helpers ---") <
    source.indexOf("// --- Extracted generateSRTPreview ---"),
  "Character sheet helpers should remain before the SRT preview marker",
);
assert.ok(
  source.indexOf("window.copySRTContent = function") <
    source.indexOf("// --- Extracted generateSRTPreview ---"),
  "SRT export helpers should remain before the SRT preview marker",
);

console.log("MV step6 section order check: PASS");
