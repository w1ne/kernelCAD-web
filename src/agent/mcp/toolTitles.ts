// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Human-readable titles for every registry MCP tool (MCP `tool.title` /
 * `annotations.title`). Required for Anthropic Connectors Directory.
 *
 * Keep in sync with kernelCAD-server `src/mcp/toolTitles.ts` for the web
 * surface; server-native tools stay curated only on the server.
 */
export const TOOL_TITLES: Record<string, string> = {
  evaluate_script: 'Evaluate CAD Script',
  diff_scripts: 'Diff CAD Scripts',
  inspect: 'Inspect Model',
  verify: 'Verify Design',
  why_did_this_fail: 'Explain Failure',
  set_param: 'Set Parameter',
  add_feature: 'Add Feature',
  add_surface: 'Add Surface',
  add_curve: 'Add Curve',
  add_path_segment: 'Add Path Segment',
  trace_from_image: 'Trace Outline from Image',
  add_variable_sweep: 'Add Variable Sweep',
  add_text: 'Add Text',
  project_curve: 'Project Curve',
  add_pattern_feature: 'Add Pattern Feature',
  remove_feature: 'Remove Feature',
  query: 'Query Geometry',
  lookup_api: 'Look Up API',
  lookup_diagnostics: 'Look Up Diagnostics',
  export: 'Export',
  lookup_cookbook: 'Look Up Cookbook',
  find_part: 'Find Part',
  fetch_part: 'Fetch Part',
  solve_sketch: 'Solve Sketch',
  add_constraint: 'Add Constraint',
  add_part: 'Add Part',
  add_connector: 'Add Connector',
  add_mate: 'Add Mate',
  add_workspace_target: 'Add Workspace Target',
  set_scene_return: 'Set Scene Return',
  solve_mates: 'Solve Mates',
  review_cad: 'Review CAD Model',
  design_loop: 'Run Design Loop',
  flatten_pattern: 'Flatten Sheet-Metal Pattern',
  evaluate_sdf: 'Evaluate SDF',
  capture_animation: 'Capture Animation',
  render_preview: 'Render Preview',
  resolve_assumptions: 'Resolve Image Assumptions',
  run_fea: 'Run Structural FEA',
  fea_summary: 'Get FEA Summary',
  run_cfd: 'Run CFD Flow Study',
  cfd_summary: 'Get CFD Summary',
  send_to_printer: 'Send G-code to Printer',
  repair_script: 'Repair CAD Script',
  sweep_tolerance: 'Sweep Tolerance Range',
  diff_geometry: 'Diff Model Geometry',
  drawing_to_cad: 'Convert Drawing to CAD',
  mesh_to_features: 'Fit Features to Mesh',
  execute_cookbook: 'Execute Cookbook',
  get_selection: 'Get Selection',
  set_selection: 'Set Selection',
  import_step: 'Import STEP',
  dfm_review: 'Review Manufacturability',
  ray_pick: 'Pick Point by Ray',
  inspect_nurbs: 'Inspect NURBS Curve',
  fit_plane: 'Fit Plane to Points',
  mesh_boolean: 'Combine Meshes (Boolean)',
  explode_view: 'Plan Exploded View',
  apply_surface_blend: 'Apply Fillet or Chamfer Blend',
  blockout_assembly: 'Block Out Assembly from Parts List',
  asset_manifest: 'List Asset Manifest',
  search_assets: 'Search Assets',
  get_asset: 'Get Asset',
  find_matching: 'Find Matching Assets',
  get_variant: 'Get Asset Variant',
  list_kits: 'List Asset Kits',
  get_kit: 'Get Asset Kit',
};

/** Title for a tool, falling back to its name when uncurated. */
export function toolTitle(name: string): string {
  return TOOL_TITLES[name] ?? name;
}
