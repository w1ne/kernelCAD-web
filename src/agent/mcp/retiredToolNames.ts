// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Tool names REMOVED from the public MCP surface (renamed, or merged into a
 * mode-parameterized tool). The consistency gate (toolNameConsistency.test.ts)
 * asserts that no teaching surface — SKILL.md, eval, docs, examples — references
 * any of these.
 *
 * Add a name here in the SAME commit that removes it from TOOL_REGISTRY and
 * sweeps its references. The map value is the replacement guidance surfaced in
 * the gate's failure message, so make it actionable (the exact new call form).
 *
 * Source of truth for the old→new mapping:
 *   kernelCAD-private/docs/specs/2026-06-13-mcp-surface-collapse-design.md §5
 */
export const RETIRED_TOOL_NAMES: Record<string, string> = {
  // Task 2 — verify family (8 → 1):
  validate_assembly: "use verify({ check: 'assembly' })",
  validate_urdf: "use verify({ check: 'urdf', urdf_path })",
  dfm_check: "use verify({ check: 'dfm' })",
  dfm_preflight: "use verify({ check: 'dfm-preflight', vendor, material, ... })",
  check_swept_collision: "use verify({ check: 'swept-collision' })",
  check_reachable: "use verify({ check: 'reachable', tip_link, ... })",
  check_mounting_hole_consistency: "use verify({ check: 'mounting-holes' })",
  check_load_capacity: "use verify({ check: 'load-capacity', loads, materials, ... })",
  // Task 3 — inspect family (16 → 1) + query family (3 → 1):
  inspect_assembly: "use inspect({ of: 'assembly' })",
  inspect_robot: "use inspect({ of: 'robot' })",
  inspect_step: "use inspect({ of: 'step' })",
  get_shape_info: "use inspect({ of: 'shape' })",
  list_features: "use inspect({ of: 'features' })",
  list_assemblies: "use inspect({ of: 'assemblies' })",
  list_topology: "use inspect({ of: 'topology' })",
  list_edges: "use inspect({ of: 'edges' })",
  get_edges_of: "use inspect({ of: 'face-edges', face_name })",
  list_faces: "use inspect({ of: 'faces' })",
  list_face_labels: "use inspect({ of: 'face-labels' })",
  list_mates: "use inspect({ of: 'mates' })",
  list_constraints: "use inspect({ of: 'constraints' })",
  list_part_stats: "use inspect({ of: 'part-stats' })",
  get_bend_table: "use inspect({ of: 'bend-table' })",
  params_list: "use inspect({ of: 'params' })",
  evaluate_query: "use query({ mode: 'evaluate', query })",
  resolve_topo_ref: "use query({ mode: 'resolve', ref })",
  get_face_lineage: "use query({ mode: 'lineage', feature_id, ref })",

  // Task 4 — assembly authoring, source-only (12 → 5). The ephemeral
  // active-session add_connector/add_mate were removed; those names now bind
  // to the durable source-editing tools.
  add_assembly_part_source: 'use add_part({ code, assembly_binding, part_name, shape_expression })',
  add_part_connector_source: 'use add_connector({ code, part_binding, name, type, origin })',
  add_mate_source: "use add_mate({ relation: 'mate', code, assembly_binding, name, a, b, type })",
  add_mate_coupling_source: "use add_mate({ relation: 'coupling', code, assembly_binding, driven, source, ratio })",
  add_transmission_source: "use add_mate({ relation: 'transmission', code, assembly_binding, name, kind, sourceMate, drivenMates, path })",
  add_workspace_target_source: 'use add_workspace_target({ code, assembly_binding, connector_ref, reachable })',
  set_scene_return_source: 'use set_scene_return({ code, assembly_binding, mode })',

  // Task 5 — NURBS / path / text authoring collapse (9 → 4):
  add_nurbs_surface: "use add_surface({ kind: 'nurbs' })",
  add_surface_from_boundary: "use add_surface({ kind: 'boundary' })",
  add_nurbs_curve: "use add_curve({ kind: 'nurbs' })",
  add_hermite_g2: "use add_curve({ kind: 'hermite' })",
  add_path_spline: "use add_path_segment({ kind: 'spline' })",
  add_path_nurbs_segment: "use add_path_segment({ kind: 'nurbs' })",
  add_path_hermite_g2: "use add_path_segment({ kind: 'hermite' })",
  add_sketch_text: "use add_text({ mode: 'sketch' })",
  emboss_text: "use add_text({ mode: 'emboss' })",

  // Task 6 — params/export/parts/reference collapse:
  params_update: 'session param editing removed (source-only); use set_param({ code, param_name, new_value }) to edit a param() default',
  set_param_value: 'use set_param({ code, param_name, new_value })',
  export_model: "use export({ target: 'model', output_path, format })",
  export_part: "use export({ target: 'part', output_path | output_dir })",
  list_part_categories: "use inspect({ of: 'part-categories' })",
  list_part_families: "use inspect({ of: 'part-families' })",
  list_api: 'use lookup_api({})',
  list_diagnostic_codes: 'use lookup_diagnostics({})',
};
