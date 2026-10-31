// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * MCP tool behavioral annotations (MCP spec `tool.annotations`).
 *
 * REQUIRED for ChatGPT app-directory submission: OpenAI's Apps SDK submission
 * guidelines state that "incorrect or missing action labels are a common cause
 * of rejection." Every registry tool must carry readOnly/destructive/openWorld
 * hints; the consistency gate also requires a human `title` (merged from
 * toolTitles.ts) and rejects tools missing either a title or a hint.
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
 *  - idempotentHint: true   → repeating the call with the same args has no
 *                             additional effect beyond the first call.
 *
 * Server-native tools (generate_kcad_from_prompt, lookup_authoring_skill,
 * open_in_studio, get_project, list_my_projects) are annotated in kernelCAD-server
 * (they are defined there, not in this registry).
 */
export interface ToolAnnotations {
  /** Optional; withMetadata merges the curated title from TOOL_TITLES. */
  title?: string;
  readOnlyHint: boolean;
  destructiveHint: boolean;
  openWorldHint: boolean;
  idempotentHint?: boolean;
}

const READ: ToolAnnotations = {
  readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true,
};
const READ_REMOTE: ToolAnnotations = {
  readOnlyHint: true, destructiveHint: false, openWorldHint: true, idempotentHint: true,
};
/** Full CAD builds/reviews update the active MCP session and viewer state. */
const STATEFUL_REMOTE: ToolAnnotations = {
  readOnlyHint: false, destructiveHint: false, openWorldHint: true, idempotentHint: false,
};
const AUTHOR: ToolAnnotations = {
  readOnlyHint: false, destructiveHint: false, openWorldHint: false, idempotentHint: true,
};
/** Authoring that may fetch its input from a URL or call a remote vision model. */
const AUTHOR_REMOTE: ToolAnnotations = {
  readOnlyHint: false, destructiveHint: false, openWorldHint: true, idempotentHint: true,
};
const AUTHOR_DESTRUCTIVE: ToolAnnotations = {
  readOnlyHint: false, destructiveHint: true, openWorldHint: false, idempotentHint: false,
};
const WRITES_FILE: ToolAnnotations = {
  readOnlyHint: false, destructiveHint: false, openWorldHint: true, idempotentHint: false,
};
/** Analysis that changes nothing about the design but CAN drop artifacts on
 *  the local filesystem on an opt-in flag (diff_geometry's render overlay).
 *  Read-only is the honest label for the design; openWorld is the honest
 *  label for the optional file output. */
const READ_MAY_WRITE_ARTIFACTS: ToolAnnotations = {
  readOnlyHint: true, destructiveHint: false, openWorldHint: true, idempotentHint: false,
};
/** Starts a job on real hardware that cannot be taken back (a print uses
 *  material and machine time). */
const PHYSICAL_ACTION: ToolAnnotations = {
  readOnlyHint: false, destructiveHint: true, openWorldHint: true, idempotentHint: false,
};

export const TOOL_ANNOTATIONS: Record<string, ToolAnnotations> = {
  // Full evaluation/review updates the active MCP session and viewer state;
  // supplied scripts may also load remote geometry or assets.
  get_selection: READ_REMOTE,
  set_selection: AUTHOR_REMOTE,
  evaluate_script: STATEFUL_REMOTE,
  diff_scripts: READ,
  inspect: READ_REMOTE,
  query: READ,
  verify: READ,
  why_did_this_fail: READ,
  evaluate_sdf: READ,
  lookup_api: READ,
  lookup_diagnostics: READ,
  lookup_cookbook: READ,
  review_cad: STATEFUL_REMOTE,
  solve_sketch: READ,
  solve_mates: READ,
  flatten_pattern: READ,
  asset_manifest: READ,
  search_assets: READ,
  get_asset: READ,
  find_matching: READ,
  get_variant: READ,
  list_kits: READ,
  get_kit: READ,

  // Read-only analysis that can write an OPTIONAL local artifact (render: true).
  diff_geometry: READ_MAY_WRITE_ARTIFACTS,
  // Reads a mesh; writes the emitted script + ledger only when { out } is given.
  mesh_to_features: READ_MAY_WRITE_ARTIFACTS,
  mesh_boolean: AUTHOR,

  // Read — but may fetch from a remote parts catalog (KERNELCAD_PARTS_BASE_URL).
  find_part: READ_REMOTE,
  fetch_part: READ_REMOTE,

  // Authoring — return modified source (side-effect-free, additive).
  set_param: AUTHOR,
  sweep_tolerance: READ,
  add_feature: AUTHOR,
  apply_surface_blend: AUTHOR,
  add_surface: AUTHOR,
  add_curve: AUTHOR,
  add_path_segment: AUTHOR,
  add_text: AUTHOR,
  add_variable_sweep: AUTHOR,
  project_curve: AUTHOR,
  add_pattern_feature: AUTHOR,
  // Fetches imageUrl (http(s)/data/file) and can call a remote vision model.
  trace_from_image: AUTHOR_REMOTE,
  resolve_assumptions: AUTHOR,
  add_constraint: AUTHOR,
  add_part: AUTHOR,
  add_connector: AUTHOR,
  add_mate: AUTHOR,
  add_workspace_target: AUTHOR,
  set_scene_return: AUTHOR,

  // Authoring — derives and applies a bounded source patch, returns new_code.
  repair_script: AUTHOR,

  // Authoring that removes an existing feature line.
  remove_feature: AUTHOR_DESTRUCTIVE,

  // Analysis loop that can write an optional local replay record.
  design_loop: AUTHOR,

  // Write geometry/animation to a file on disk.
  export: WRITES_FILE,
  // Reads a local drawing PDF; writes the rebuilt script + ledger on `out`.
  drawing_to_cad: WRITES_FILE,
  capture_animation: WRITES_FILE,

  // Uploads a file to, and can start a print on, a real network printer.
  send_to_printer: PHYSICAL_ACTION,

  // Evaluates a cookbook snippet; with openInStudio:true it publishes the
  // result as a Studio project, which is a user-visible write.
  execute_cookbook: WRITES_FILE,
  // Downloads a user-supplied file (open world) and writes it plus a starter script.
  import_step: AUTHOR_REMOTE,
  explode_view: READ,

  // Renders the model to PNG views on the local filesystem — does not change the
  // design, but writes image files (same class as capture_animation).
  render_preview: WRITES_FILE,
  // run_fea shells out to CalculiX/gmsh and writes a solver deck + PNGs to
  // disk, so it is neither read-only nor sandbox-local.
  run_fea: WRITES_FILE,
  fea_summary: READ,
  // Evaluates the script in-process and reports; writes nothing.
  dfm_review: READ,
  ray_pick: READ,
  // Evaluates supplied script/file input to capture authored NURBS data; the
  // script may load referenced assets but does not replace the active session.
  inspect_nurbs: READ_REMOTE,
  fit_plane: READ,
  // Pure generator: turns a parts list into a placeholder assembly script; writes nothing.
  blockout_assembly: AUTHOR,
};
