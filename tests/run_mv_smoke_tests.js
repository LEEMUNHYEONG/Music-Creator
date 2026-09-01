const { spawnSync } = require("child_process");

const buildResult = spawnSync(process.execPath, ["tests/build_mv_compat_bundle.js"], {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: "inherit",
});
if (buildResult.status !== 0) {
  process.exit(buildResult.status || 1);
}

const checks = [
  ["Syntax: check_dom_ids.js", ["--check", "tests/check_dom_ids.js"]],
  ["Syntax: app.js", ["--check", "app.js"]],
  ["Syntax: MV compatibility bundle", ["--check", "test-results/mv_modules.compat.js"]],
  ["Syntax: MV smoke tests", ["--check", __filename]],
];

const tests = [
  "tests/check_dom_ids.js",
  "tests/mv_duplicate_ownership_check.js",
  "tests/mv_chrome_runtime_check.js",
  "tests/mv_responsive_layout_smoke.js",
  "tests/mv_step6_visual_sanity_check.js",
  "tests/mv_progress_steps_smoke.js",
  "tests/mv_marketing_step_fallback_smoke.js",
  "tests/mv_marketing_no_key_mv_access_smoke.js",
  "tests/mv_no_key_scene_fallback_smoke.js",
  "tests/mv_vocal_assignment_restore_smoke.js",
  "tests/mv_preflight_rehearsal_runtime_check.js",
  "tests/mv_user_flow_integration_smoke.js",
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
  "tests/mv_srt_scene_timeline_smoke.js",
  "tests/mv_sync_scene_overview_translation_smoke.js",
  "tests/mv_sync_scene_prompt_translation_smoke.js",
  "tests/mv_lyrics_scene_allocation_smoke.js",
  "tests/mv_scene_timeline_preview_smoke.js",
  "tests/mv_scene_timing_editor_smoke.js",
  "tests/mv_emotion_visual_tone_smoke.js",
  "tests/mv_settings_smoke.js",
  "tests/mv_location_helpers_smoke.js",
  "tests/mv_character_sheet_helpers_smoke.js",
  "tests/mv_update_character_inputs_smoke.js",
  "tests/mv_model_storage_smoke.js",
  "tests/mv_scene_model_normalization_smoke.js",
  "tests/mv_marketing_diagnostics_smoke.js",
  "tests/mv_storage_quota_recovery_smoke.js",
  "tests/mv_storage_full_mode_preservation_smoke.js",
  "tests/mv_custom_confirm_modal_smoke.js",
  "tests/mv_step4_ai_fallback_smoke.js",
  "tests/mv_runtime_guard_smoke.js",
  "tests/mv_single_project_json_smoke.js",
  "tests/mv_restore_step6_smoke.js",
  "tests/mv_step6_section_order_check.js",
  "tests/mv_copy_prompts_smoke.js",
  "tests/mv_unsaved_export_guard_smoke.js",
  "tests/mv_image_prompt_bundle_smoke.js",
  "tests/mv_scene_prompt_table_copy_smoke.js",
  "tests/mv_video_tool_export_templates_smoke.js",
  "tests/mv_save_scene_prompt_smoke.js",
  "tests/mv_scene_dirty_shortcut_smoke.js",
  "tests/mv_tag_buttons_smoke.js",
  "tests/mv_clean_midjourney_prompt_smoke.js",
  "tests/mv_auth_flow_smoke.js",
  "tests/mv_admin_panel_smoke.js",
  "tests/mv_cloud_sync_ui_smoke.js",
  "tests/mv_backup_restore_smoke.js",
  "tests/mv_step1_lyrics_flow_smoke.js",
  "tests/mv_step2_transition_flow_smoke.js",
  "tests/mv_step4_finalize_flow_smoke.js",
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
