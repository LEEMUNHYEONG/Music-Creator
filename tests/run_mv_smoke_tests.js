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
  "tests/mv_generate_character_sheet_smoke.js",
  "tests/mv_regenerate_style_prompts_smoke.js",
  "tests/mv_regenerate_single_style_prompt_smoke.js",
  "tests/mv_regenerate_prompt_ownership_smoke.js",
  "tests/mv_regenerate_scene_overview_prompt_smoke.js",
  "tests/mv_regenerate_scene_prompt_smoke.js",
  "tests/mv_sync_prompt_translation_smoke.js",
  "tests/mv_prompt_helpers_smoke.js",
  "tests/mv_download_prompts_smoke.js",
  "tests/mv_srt_export_smoke.js",
  "tests/mv_sync_scene_overview_translation_smoke.js",
  "tests/mv_sync_scene_prompt_translation_smoke.js",
  "tests/mv_lyrics_scene_allocation_smoke.js",
  "tests/mv_scene_timeline_preview_smoke.js",
  "tests/mv_emotion_visual_tone_smoke.js",
  "tests/mv_settings_smoke.js",
  "tests/mv_location_helpers_smoke.js",
  "tests/mv_character_sheet_helpers_smoke.js",
  "tests/mv_update_character_inputs_smoke.js",
  "tests/mv_model_storage_smoke.js",
  "tests/mv_scene_model_normalization_smoke.js",
  "tests/mv_restore_step6_smoke.js",
  "tests/mv_step6_section_order_check.js",
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
