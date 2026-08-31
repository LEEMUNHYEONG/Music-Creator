const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const files = ["app.js", "test-results/mv_modules.compat.js"];
const definitions = new Map();

for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  assert.ok(
    !source.includes("LegacyUnused"),
    `${file} should not keep LegacyUnused MV function definitions`,
  );
  const re = /^window\.([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?function/gm;
  let match;
  while ((match = re.exec(source))) {
    const line = source.slice(0, match.index).split("\n").length;
    const name = match[1];
    if (!definitions.has(name)) definitions.set(name, []);
    definitions.get(name).push({ file, line });
  }
}

const duplicates = Object.fromEntries(
  Array.from(definitions.entries())
    .filter(([, defs]) => defs.length > 1)
    .map(([name, defs]) => [name, defs.map((def) => `${def.file}:${def.line}`)]),
);

const expectedDuplicates = [];

assert.deepStrictEqual(Object.keys(duplicates).sort(), expectedDuplicates.sort());

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const appScriptIndex = html.indexOf('src="app.js');
assert.ok(appScriptIndex !== -1, "index.html should load app.js");
for (const moduleFile of [
  "core_utilities.js",
  "prompt_and_scene_review_rendering.js",
  "mv_generation_flows.js",
  "location_settings_and_character_helpers.js",
  "prompt_persistence_and_export.js",
  "legacy_cross-step_helpers.js",
  "srt_export_and_preview.js",
  "translation_regeneration_copy_and_tag_actions.js",
]) {
  const moduleScriptIndex = html.indexOf(`src="js/mv/${moduleFile}`);
  assert.ok(moduleScriptIndex !== -1, `index.html should load ${moduleFile}`);
  assert.ok(
    moduleScriptIndex < appScriptIndex,
    `${moduleFile} should load before app.js`,
  );
}

console.log("MV duplicate ownership check: PASS");
