// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * MCP tool behavioral annotations (MCP spec `tool.annotations`).
 *
 * REQUIRED for ChatGPT app-directory submission: OpenAI's Apps SDK submission
 * guidelines state that "incorrect or missing action labels are a common cause
 * of rejection." Every registry tool must carry all three hints; the
 * consistency gate enforces it.
 *
 * Classification rule:
 *  - readOnlyHint: true  → only retrieves or computes; no write/author intent,
 *                          no persistence, no external effect. Safe to call.
 *  - readOnlyHint: false → authoring / write intent (even when side-effect-free
 *                          at the tool boundary, e.g. tools that return modified
 *                          source the caller persists — labeling these read-only
 *                          would be the mislabeling that gets apps rejected).
 *  - destructiveHint: true  → deletes or overwrites existing user data.
 *  - openWorldHint:  true   → may reach an external system / filesystem / remote
 *                             catalog beyond the in-ChatGPT compute sandbox.
 *
 * Server-native tools (generate_kcad_from_prompt, lookup_authoring_skill,
 * open_in_studio, get_project, list_my_projects) are annotated in kernelCAD-server
 * (they are defined there, not in this registry).
 */
export interface ToolAnnotations {
  readOnlyHint: boolean;
  destructiveHint: boolean;
  openWorldHint: boolean;
}

const READ: ToolAnnotations = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
const READ_REMOTE: ToolAnnotations = { readOnlyHint: true, destructiveHint: false, openWorldHint: true };
const AUTHOR: ToolAnnotations = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
const AUTHOR_DESTRUCTIVE: ToolAnnotations = { readOnlyHint: false, destructiveHint: true, openWorldHint: false };
const WRITES_FILE: ToolAnnotations = { readOnlyHint: false, destructiveHint: false, openWorldHint: true };

export const TOOL_ANNOTATIONS: Record<string, ToolAnnotations> = {
  // Read / compute / analysis — no mutation, no external effect.
  evaluate_script: READ,
  diff_scripts: READ,
  inspect: READ,
  query: READ,
  verify: READ,
  why_did_this_fail: READ,
  evaluate_sdf: READ,
  lookup_api: READ,
  lookup_diagnostics: READ,
  lookup_cookbook: READ,
  review_cad: READ,
  review_paint_peek_latest: READ,
  solve_sketch: READ,
  solve_mates: READ,
  flatten_pattern: READ,

  // Read — but may fetch from a remote parts catalog (KERNELCAD_PARTS_BASE_URL).
  find_part: READ_REMOTE,
  fetch_part: READ_REMOTE,

  // Authoring — return modified source (side-effect-free, additive).
  set_param: AUTHOR,
  add_feature: AUTHOR,
  add_surface: AUTHOR,
  add_curve: AUTHOR,
  add_path_segment: AUTHOR,
  add_text: AUTHOR,
  add_variable_sweep: AUTHOR,
  project_curve: AUTHOR,
  add_pattern_feature: AUTHOR,
  trace_from_image: AUTHOR,
  add_constraint: AUTHOR,
  add_part: AUTHOR,
  add_connector: AUTHOR,
  add_mate: AUTHOR,
  add_workspace_target: AUTHOR,
  set_scene_return: AUTHOR,

  // Authoring that removes an existing feature line.
  remove_feature: AUTHOR_DESTRUCTIVE,

  // Analysis loop that can write an optional local replay record.
  design_loop: AUTHOR,

  // Write geometry/animation to a file on disk.
  export: WRITES_FILE,
  capture_animation: WRITES_FILE,

  // Renders the model to PNG views on the local filesystem — does not change the
  // design, but writes image files (same class as capture_animation).
  render_preview: WRITES_FILE,
};
