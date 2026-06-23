// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * MCP tool structured-output schemas (MCP spec `tool.outputSchema`).
 *
 * Mirrors the toolAnnotations.ts pattern: one central map, classified in a
 * single place, merged onto each definition at build time by `withMetadata`
 * in toolRegistry.ts. The consistency gate enforces that every registry tool
 * carries an `outputSchema` of `type: 'object'`.
 *
 * Each schema describes the tool's RETURN value, derived faithfully from the
 * handler's declared Output type (top-level fields only). For deeply nested or
 * union-heavy structures we use shallow `additionalProperties: true` objects
 * rather than inventing deep sub-schemas — faithful-but-shallow beats
 * invented-but-deep. Most tools follow the `{ ok, ... }` envelope; source-edit
 * tools return `{ ok, new_code?, diagnostics?, ... }`.
 *
 * The merged dispatchers (verify, inspect, query, add_surface, add_curve,
 * add_path_segment, add_text, add_mate, export) emit a union of their
 * underlying handlers' outputs; their schemas declare the universally-common
 * fields and stay permissive (`additionalProperties: true`).
 */

/** Same shape as McpToolDefinition['inputSchema'] — a JSON Schema object node. */
export type JSONSchemaObject = {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
};

/** Standard source-edit envelope: returns modified code + re-eval diagnostics. */
const SOURCE_EDIT: JSONSchemaObject = {
  type: 'object',
  properties: {
    ok: { type: 'boolean', description: 'Whether the edit applied and re-evaluated cleanly.' },
    new_code: { type: 'string', description: 'Modified .kcad.ts source (present on success). Caller persists it.' },
    binding_name: { type: 'string', description: 'JS const name bound to the new construct (when one was created).' },
    diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Diagnostics from re-evaluating the modified source.' },
    error: { type: 'string', description: 'Failure message (present when ok is false).' },
  },
  required: ['ok'],
  additionalProperties: true,
};

export const TOOL_OUTPUT_SCHEMAS: Record<string, JSONSchemaObject> = {
  evaluate_script: {
    type: 'object',
    properties: {
      ok: { type: 'boolean', description: 'Whether the script compiled and lowered cleanly.' },
      featureCount: { type: 'number', description: 'Number of features captured by the script.' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
      dryRun: { type: 'boolean', description: 'True when the result came from a fast dry run.' },
      parts: { type: 'object', additionalProperties: true, description: 'Assembly parts summary { count, names } when the scene is assembly-built.' },
      mechanism: { type: 'string', enum: ['real', 'broken', 'unverified'], description: "Mechanism-truth verdict for an assembly-built scene (default-on; omitted for dryRun, non-assembly, or skipMechanismCheck:true). 'broken' makes ok:false; 'unverified' keeps ok and surfaces a loud budget diagnostic." },
    },
    required: ['ok', 'featureCount', 'diagnostics'],
    additionalProperties: true,
  },

  diff_scripts: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      base: { type: 'object', additionalProperties: true, description: 'Baseline summary { featureCount, partCount, isAssembly } (success).' },
      revised: { type: 'object', additionalProperties: true, description: 'Revision summary { featureCount, partCount, isAssembly } (success).' },
      parts: { type: 'object', additionalProperties: true, description: 'Per-part added/removed/renamed/changed/unchanged (success).' },
      interference: { type: 'object', additionalProperties: true, description: 'Total interference-volume delta + per-pair detail (success).' },
      mates: { type: 'object', additionalProperties: true, description: 'Mate-graph changes (success).' },
      params: { type: 'object', additionalProperties: true, description: 'Param value/min/max changes (success).' },
      side: { type: 'string', description: "Which side failed ('base' | 'revised') (failure)." },
      error: { type: 'string', description: 'Failure message (failure).' },
      errorCode: { type: 'string' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
    },
    required: ['ok'],
    additionalProperties: true,
  },

  // Merged dispatcher (selected by `of`): union of ~18 reader outputs. All
  // variants carry `ok`; remaining fields are subject-specific (parts, mates,
  // faces, edges, features, shape, params, …). Permissive by design.
  inspect: {
    type: 'object',
    properties: {
      ok: { type: 'boolean', description: 'Whether the read succeeded.' },
      error: { type: 'string', description: 'Failure message (present on failure).' },
      errorCode: { type: 'string' },
    },
    required: [],
    additionalProperties: true,
  },

  // Merged dispatcher (selected by `check`): union of 8 verifier outputs. All
  // carry `ok` and (mostly) `diagnostics`; remaining fields are check-specific.
  verify: {
    type: 'object',
    properties: {
      ok: { type: 'boolean', description: 'Whether the verification ran and passed its gate.' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Verifier diagnostics (most checks).' },
      error: { type: 'string', description: 'Failure message (present on failure).' },
      errorCode: { type: 'string' },
    },
    required: ['ok'],
    additionalProperties: true,
  },

  why_did_this_fail: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      feature_id: { type: 'string' },
      chain: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Upstream feature diagnostics in topological order; requested feature last.' },
      error: { type: 'string' },
      errorCode: { type: 'string' },
    },
    required: ['ok'],
    additionalProperties: true,
  },

  set_param: SOURCE_EDIT,
  add_feature: SOURCE_EDIT,
  add_variable_sweep: SOURCE_EDIT,
  project_curve: SOURCE_EDIT,
  add_pattern_feature: SOURCE_EDIT,
  remove_feature: SOURCE_EDIT,

  trace_from_image: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      features: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Traced features with normalized [0..1] waypoints + confidence.' },
      imageDims: { type: 'array', items: { type: 'number' }, description: 'Pixel dimensions [width, height] of the source image.' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
    },
    required: ['ok', 'features', 'imageDims', 'diagnostics'],
    additionalProperties: true,
  },

  // Merged authoring dispatchers — each forwards to source-edit handlers that
  // return the SOURCE_EDIT envelope. Same shape applies to every variant.
  add_surface: SOURCE_EDIT,
  add_curve: SOURCE_EDIT,
  add_path_segment: SOURCE_EDIT,
  add_text: SOURCE_EDIT,
  add_mate: SOURCE_EDIT,

  add_part: SOURCE_EDIT,
  add_connector: SOURCE_EDIT,
  add_workspace_target: SOURCE_EDIT,
  set_scene_return: SOURCE_EDIT,

  add_constraint: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      constraints: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Updated constraint list.' },
      errors: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Validation errors (present on failure).' },
    },
    required: ['ok', 'constraints'],
    additionalProperties: true,
  },

  solve_sketch: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      entities: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Solved sketch entities.' },
      constraints: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'The constraints applied.' },
      errors: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Solver errors (present on failure).' },
    },
    required: ['ok', 'entities', 'constraints'],
    additionalProperties: true,
  },

  // Merged dispatcher (selected by `mode`): union of evaluate/resolve/lineage.
  query: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      entities: { type: 'array', items: { type: 'object', additionalProperties: true }, description: "mode:'evaluate' — matched entities." },
      query: { type: 'object', additionalProperties: true, description: "mode:'evaluate' — the resolved Query ({ ast })." },
      ref: { type: 'string', description: "mode:'resolve' — the resolved ref string." },
      entity: { type: 'object', additionalProperties: true, description: "mode:'resolve' — the single matched entity." },
      candidates: { type: 'array', items: { type: 'object', additionalProperties: true }, description: "mode:'resolve' — near-miss candidates (failure)." },
      chain: { type: 'array', items: { type: 'object', additionalProperties: true }, description: "mode:'lineage' — HistoryMap walk." },
      warnings: { type: 'array', items: { type: 'object', additionalProperties: true } },
      error: { type: 'string' },
      errorCode: { type: 'string' },
    },
    required: ['ok'],
    additionalProperties: true,
  },

  lookup_api: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      globals: { type: 'array', items: { type: 'object', additionalProperties: true } },
      shapeMethods: { type: 'array', items: { type: 'object', additionalProperties: true } },
      sketchMethods: { type: 'array', items: { type: 'object', additionalProperties: true } },
      pathBuilderMethods: { type: 'array', items: { type: 'object', additionalProperties: true } },
      paramRefMethods: { type: 'array', items: { type: 'object', additionalProperties: true } },
      sceneMethods: { type: 'array', items: { type: 'object', additionalProperties: true } },
      scenePartProperties: { type: 'array', items: { type: 'object', additionalProperties: true } },
      surfaceMethods: { type: 'array', items: { type: 'object', additionalProperties: true } },
      curve3dMethods: { type: 'array', items: { type: 'object', additionalProperties: true } },
      curve3dAnalyticsMethods: { type: 'array', items: { type: 'object', additionalProperties: true } },
      edgeQueryKeys: { type: 'array', items: { type: 'string' } },
      faceQueryKeys: { type: 'array', items: { type: 'string' } },
      featureKindFaceLabels: { type: 'object', additionalProperties: true },
      constraints: { type: 'object', additionalProperties: true },
      error: { type: 'string' },
    },
    required: ['ok'],
    additionalProperties: true,
  },

  lookup_diagnostics: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      codes: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'The diagnostic-code catalogue with hint templates.' },
    },
    required: ['ok', 'codes'],
    additionalProperties: true,
  },

  lookup_cookbook: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      hits: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Top-k matching cookbook snippets, ranked by BM25.' },
      error: { type: 'string' },
    },
    required: ['ok'],
    additionalProperties: true,
  },

  // Read-remote: bundled offline, optional remote parts-catalog tier.
  find_part: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      results: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Matching part records (success).' },
      totalMatches: { type: 'number', description: 'Total matches before limiting (success).' },
      source: { type: 'string', description: "Where results came from ('local' | 'remote') (success)." },
      remoteEnabled: { type: 'boolean', description: 'Whether the remote tier was queried (success).' },
      error: { type: 'string' },
      errorCode: { type: 'string' },
      errorHint: { type: 'string' },
    },
    required: ['ok'],
    additionalProperties: true,
  },

  fetch_part: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      record: { type: 'object', additionalProperties: true, description: 'Resolved part record (success).' },
      cachePath: { type: 'string', description: 'Local cache path of the written STEP file (success).' },
      sha256: { type: 'string', description: 'SHA-256 fingerprint of the STEP file (success).' },
      source: { type: 'string', description: "Where the part came from ('local' | 'remote') (success)." },
      error: { type: 'string' },
      errorCode: { type: 'string' },
      errorHint: { type: 'string' },
    },
    required: ['ok'],
    additionalProperties: true,
  },

  solve_mates: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      status: { type: 'string', description: 'Solver status (success).' },
      poses: { type: 'object', additionalProperties: true, description: 'Solved part poses keyed by mate; each a serialized Transform (success).' },
      iterations: { type: 'number', description: 'Solver iteration count (success).' },
      error: { type: 'string' },
      errorCode: { type: 'string' },
      errorHint: { type: 'string' },
    },
    required: ['ok'],
    additionalProperties: true,
  },

  review_cad: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      featureCount: { type: 'number' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
      assembly: { type: 'string' },
      validator: { type: 'object', additionalProperties: true, description: 'Assembly/mate-graph validator result.' },
      poseEnvelope: { type: 'object', additionalProperties: true, description: 'Sampled mate-limit pose envelope.' },
      connectorWorkspace: { type: 'object', additionalProperties: true, description: 'Connector workspace bounds.' },
      gripperAperture: { type: 'object', additionalProperties: true },
      fitness: { type: 'object', additionalProperties: true, description: 'Mechanism fitness verdict incl. repairMode.' },
      repairContext: { type: 'object', additionalProperties: true },
      rawInterferencePairs: { type: 'array', items: { type: 'object', additionalProperties: true } },
      mechanism: { type: 'string' },
      mechanismFailures: { type: 'array', items: { type: 'object', additionalProperties: true } },
      suggestedRepairPrompt: { type: 'string', description: 'Structured repair prompt (failure / repair path).' },
    },
    required: ['ok', 'featureCount', 'diagnostics'],
    additionalProperties: true,
  },

  review_paint_peek_latest: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      empty: { type: 'boolean', description: 'True when no fresh packet was found.' },
      packet: { type: 'object', additionalProperties: true, description: 'The freshest review packet (screenshot + mask + metadata).' },
      scanned_roots: { type: 'array', items: { type: 'string' }, description: 'Checkout roots that were scanned.' },
      scanned_candidates: { type: 'number', description: 'Number of candidate packets considered.' },
    },
    required: ['ok'],
    additionalProperties: true,
  },

  design_loop: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      goal: { type: 'string', description: 'Echoed design goal.' },
      finalAttemptId: { type: 'string' },
      attempts: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Per-attempt review results.' },
      record: { type: 'object', additionalProperties: true, description: 'Studio-compatible build record (when requested).' },
      outputRecordPath: { type: 'string' },
      recordUrl: { type: 'string' },
      nextActionPrompt: { type: 'string' },
    },
    required: ['ok', 'goal', 'attempts'],
    additionalProperties: true,
  },

  flatten_pattern: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      region: { type: 'object', additionalProperties: true, description: 'Unfolded flat-pattern Region (outer polyline + holes + bend lines + plane).' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
    },
    required: ['ok', 'diagnostics'],
    additionalProperties: true,
  },

  evaluate_sdf: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      distance: { type: 'number', description: 'Signed distance in mm; negative = inside (success).' },
      inside: { type: 'boolean', description: 'Whether the point is inside the surface (success).' },
      aabb: { type: 'object', additionalProperties: true, description: 'Axis-aligned bounding box of the field (success).' },
      kind: { type: 'string', description: 'SDF field kind (success).' },
      error: { type: 'string' },
      errorCode: { type: 'string' },
      hint: { type: 'string' },
    },
    required: ['ok'],
    additionalProperties: true,
  },

  // Merged dispatcher (selected by `target`): union of model/part export outputs.
  export: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      output_path: { type: 'string', description: "target:'model' — written file path." },
      byte_count: { type: 'number', description: "target:'model' — file size in bytes." },
      feature_count: { type: 'number' },
      format: { type: 'string' },
      mesh_files: { type: 'array', items: { type: 'string' }, description: 'Per-link mesh files for urdf/sdf-gazebo exports.' },
      written: { type: 'array', items: { type: 'object', additionalProperties: true }, description: "target:'part' — per-part export records." },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
      error: { type: 'string' },
    },
    required: ['ok'],
    additionalProperties: true,
  },

  capture_animation: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      output_path: { type: 'string', description: 'Written MP4 path (MP4 mode).' },
      frame_count: { type: 'number' },
      duration_ms: { type: 'number' },
      fps: { type: 'number' },
      verified: { type: 'boolean', description: 'Whether pose-interference verification passed.' },
      verify_skipped: { type: 'boolean' },
      collisions: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Colliding poses { t_ms, a, b, volume_mm3 }.' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
      error: { type: 'string' },
      errorCode: { type: 'string' },
      errorHint: { type: 'string' },
      failure_kind: { type: 'string' },
    },
    required: ['ok', 'diagnostics'],
    additionalProperties: true,
  },

  render_preview: {
    type: 'object',
    properties: {
      ok: { type: 'boolean', description: 'Whether the preview rendered.' },
      images: {
        type: 'array',
        items: { type: 'object', additionalProperties: true },
        description: 'Rendered tiles { name, path, description } — absolute local PNG paths with per-view camera orientation (kernelCAD is Z-up).',
      },
      out_dir: { type: 'string', description: 'Directory holding the PNGs (session temp dir unless out_dir was given).' },
      bounds: { type: 'object', additionalProperties: true, description: 'Model AABB in mm { min, max } the camera was fit to (success).' },
      mechanism: { type: 'string', description: "Mechanism-truth verdict: 'real' | 'broken' | 'unverified'." },
      mechanism_failure_codes: { type: 'array', items: { type: 'string' }, description: "De-duplicated failure codes when mechanism is 'broken'." },
      render_source: { type: 'string', description: "Lane that served the render: 'static-player' | 'dev-server' | 'explicit'." },
      render_ms: { type: 'number', description: 'Wall-clock render time in ms (provisioning + browser + captures).' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
      error: { type: 'string' },
      errorCode: { type: 'string' },
      errorHint: { type: 'string' },
    },
    required: ['ok', 'images', 'diagnostics'],
    additionalProperties: true,
  },
};
