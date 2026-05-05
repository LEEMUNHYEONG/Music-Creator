const { spawnSync } = require("child_process");

const checks = [
  ["Syntax: app.js", ["--check", "app.js"]],
  ["Syntax: js/step6.js", ["--check", "js/step6.js"]],
  ["Syntax: MV smoke tests", ["--check", __filename]],
];

const tests = [
  "tests/mv_duplicate_ownership_check.js",
  "tests/mv_chrome_runtime_check.js",
  "tests/mv_confirm_scene_overview_smoke.js",
  "tests/mv_generate_thumbnail_prompts_smoke.js",
  "tests/mv_regenerate_style_prompts_smoke.js",
  "tests/mv_regenerate_single_style_prompt_smoke.js",
  "tests/mv_regenerate_prompt_ownership_smoke.js",
  "tests/mv_regenerate_scene_overview_prompt_smoke.js",
  "tests/mv_regenerate_scene_prompt_smoke.js",
  "tests/mv_sync_prompt_translation_smoke.js",
  "tests/mv_sync_scene_overview_translation_smoke.js",
  "tests/mv_sync_scene_prompt_translation_smoke.js",
  "tests/mv_model_storage_smoke.js",
  "tests/mv_copy_prompts_smoke.js",
  "tests/mv_save_scene_prompt_smoke.js",
  "tests/mv_tag_buttons_smoke.js",
];

for (const testFile of tests) {
  checks.push([`Syntax: ${testFile}`, ["--check", testFile]]);
}
for (const testFile of tests) {
  checks.push([`Run: ${testFile}`, [testFile]]);
}

let passed = 0;

for (const [label, args] of checks) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "inherit",
  });

  if (result.status !== 0) {
    console.error(`\n✗ ${label} failed`);
    process.exit(result.status || 1);
  }

  passed += 1;
}

console.log(`\nMV smoke test suite: PASS (${passed} checks)`);
