const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const moduleFiles = [
  "js/mv/core_utilities.js",
  "js/mv/prompt_and_scene_review_rendering.js",
  "js/mv/mv_generation_flows.js",
  "js/mv/location_settings_and_character_helpers.js",
  "js/mv/prompt_persistence_and_export.js",
  "js/mv/legacy_cross-step_helpers.js",
  "js/mv/srt_export_and_preview.js",
  "js/mv/translation_regeneration_copy_and_tag_actions.js",
];
const outputDir = path.join(root, "test-results");
const outputFile = path.join(outputDir, "mv_modules.compat.js");

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
  outputFile,
  moduleFiles
    .map((file) => {
      const source = fs.readFileSync(path.join(root, file), "utf8");
      return `\n// ---- ${file} ----\n${source}\n`;
    })
    .join(""),
  "utf8",
);

console.log(`MV compatibility bundle created: ${outputFile}`);
