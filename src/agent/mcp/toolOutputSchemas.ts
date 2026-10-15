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

import { SCENE_SUMMARY_SCHEMA } from './sceneSummarySchema';
export { SCENE_SUMMARY_SCHEMA } from './sceneSummarySchema';
import { VERIFY_OUTPUT_SCHEMA } from './verificationOutputSchema';
import { MESH_RECONSTRUCT_OUTPUT_SCHEMAS } from './registry/meshReconstructTools.outputSchemas';
import { IMPORT_OUTPUT_SCHEMAS } from './registry/importTools.outputSchemas';
import { FABRICATION_OUTPUT_SCHEMAS } from './registry/fabricationTools.outputSchemas';
import { MANUFACTURING_OUTPUT_SCHEMAS } from './registry/manufacturingTools.outputSchemas';
import { NURBS_OUTPUT_SCHEMAS } from './registry/nurbsTools.outputSchemas';

export type { JSONSchemaObject } from './toolOutputSchemaParts';
import { MECHANISM_SUMMARY, SELECTION, SOURCE_EDIT, TUBE_JOINT, type JSONSchemaObject } from './toolOutputSchemaParts';

export const TOOL_OUTPUT_SCHEMAS: Record<string, JSONSchemaObject> = {
  get_selection: SELECTION,
  set_selection: SELECTION,
  ray_pick: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' }, feature_id: { type: 'string' }, shape_index: { type: 'integer' },
      studio_url: { type: 'string' }, session: { type: 'string' }, model_generation: { type: 'integer' },
      hit_basis: { type: 'string', enum: ['per-face tessellation'] },
      hits: { type: 'array', items: { type: 'object', additionalProperties: true, description: 'face_id, point, distance, normal, model_generation, selection, and set_selection arguments ready to pass directly to set_selection.' } },
      error: { type: 'string' },
    },
    required: ['ok'], additionalProperties: true,
  },
  evaluate_script: {
    type: 'object',
    properties: {
      sceneSummary: SCENE_SUMMARY_SCHEMA,
      ok: { type: 'boolean', description: 'Whether the script compiled and lowered cleanly.' },
      viewerUrl: { type: 'string', description: 'Live loopback Studio URL; reused on later full builds in the same local MCP process.' },
      viewerError: { type: 'string', description: 'Viewer provisioning error; separate from the CAD build result.' },
      viewerMode: { type: 'string', enum: ['hosted'], description: 'Hosted mode uses open_in_studio instead of a process-local viewer.' },
      viewerHint: { type: 'string', description: 'How to view the built model in hosted Studio.' },
      step: { type: 'object', additionalProperties: true, description: 'Per-step build validity, volume and paired local PNG paths with a shared iso frame; unavailable snapshots report an error. Not a topology certificate. Omitted on dry runs.' },
      featureCount: { type: 'number', description: 'Number of features captured by the script.' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
      dryRun: { type: 'boolean', description: 'True when the result came from a fast dry run.' },
      parts: { type: 'object', additionalProperties: true, description: 'Assembly parts summary { count, names } when the scene is assembly-built.' },
      featureHealth: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            featureId: { type: 'string' },
            status: { type: 'string', enum: ['warning', 'error'] },
          },
          required: ['featureId', 'status'],
          additionalProperties: false,
        },
        description: 'Per-feature health degradations — ONLY features that fell back to a passthrough (warning) or failed to lower (error). Empty when every feature is healthy. Surfaces which feature degraded even when ok is true.',
      },
      dimensions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            kind: { type: 'string', enum: ['linear', 'diameter', 'radius', 'angular'] },
            source: { type: 'string', enum: ['declared', 'auto'] },
          },
          required: ['text', 'kind', 'source'],
          additionalProperties: false,
        },
        description: 'Dimensions declared with shape.dimension(), as the viewer labels them (e.g. "hole spacing 30"). Omitted when the script declares none.',
      },
      tubes: {
        type: 'object',
        properties: {
          lines: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                from: TUBE_JOINT('Set when the from end branches off another tube: the trunk and the station of the tee on it. The cut length and bend table of this tube then start on the trunk wall. Omitted for any other end.'),
                to: TUBE_JOINT('Set when the to end branches off another tube: the trunk and the station of the tee on it. Omitted for any other end.'),
                branches: { type: 'array', items: TUBE_JOINT('One tube that branches off this one.'), description: 'The tubes that branch off this one, by station. Omitted when there are none.' },
              },
              additionalProperties: true,
            },
            description: 'One entry per tube: name, system, od, wall, bendRadius, material, cutLength (mm), bends, xyz (bend-table corner points), lra (length/rotation/angle rows), lastStraight, minStraight, minClearance { mm, to, at } (exact nearest part or tube), massKg (null without a known material or density), volumeInternalMl, pressureDropKPa (null without a declared flow).',
          },
          systems: {
            type: 'array',
            items: { type: 'object', additionalProperties: true },
            description: 'One entry per named system: { system, lines, cutLength, massKg }.',
          },
        },
        required: ['lines', 'systems'],
        additionalProperties: false,
        description: 'Tube line report. Present only when the model has tubes; the gate diagnostics are in diagnostics.',
      },
      ports: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            part: { type: 'string', description: 'The assembly part that owns the port.' },
            name: { type: 'string', description: 'The connector name; part.port(name) gives this port to tube().' },
            system: { type: 'string' },
            od: { type: 'number', description: 'Tube outer diameter the port takes, mm.' },
            minStraight: { type: 'number', description: 'Straight a tube must keep leaving the port, mm. Omitted when the port declares none.' },
            origin: { type: 'array', items: { type: 'number' }, description: 'Port position [x, y, z] in assembly space, mm, with params and mates resolved. Omitted when unresolved is set.' },
            axis: { type: 'array', items: { type: 'number' }, description: 'Unit axis [x, y, z] pointing out of the part, assembly space. Omitted when unresolved is set.' },
            placedBy: { type: 'string', enum: ['at', 'connect', 'mate'], description: "'at': the part is where its at puts it. 'connect': the part is where its connect puts it. For both, part.port(name) gives this position. 'mate': a mate or joint moved or turned the part after that; origin and axis are the solved ones, and part.port(name) still gives the position before the solve. Omitted when unresolved is set." },
            usedBy: { type: 'array', items: { type: 'string' }, description: 'Names of the tubes that end on the port; empty when the port is free.' },
            unresolved: { type: 'string', description: 'Why the position is missing: the script does not build the assembly, the part failed to build, another part failed so the solve did not run and this part is positioned by a mate, a joint or connect, the part is not in the built assembly, or the connector origin is a topology reference or not numeric. Omitted when origin is given.' },
          },
          required: ['part', 'name', 'system', 'od', 'usedBy'],
          additionalProperties: false,
        },
        description: 'Every fluid port (a connector with port data) of the assembly the script returns. Present, possibly empty, whenever the script declares an assembly and builds a model, with or without tubes; omitted otherwise and for dryRun.',
      },
      mechanism: { type: 'string', enum: ['real', 'broken', 'unverified'], description: "Mechanism-truth verdict for an assembly-built scene (default-on; omitted for dryRun, non-assembly, or skipMechanismCheck:true). 'broken' makes ok:false; 'unverified' keeps ok and surfaces a loud budget diagnostic." },
      mechanismSummary: MECHANISM_SUMMARY,
      reviewHint: { type: 'string', description: 'Present only when a captured assembly declares articulated (non-fastened) mates: the default mechanism check is shallow (no joint-support intents, pose-envelope overlap at declared limits, or gravity drop) — run review_cad for pose-envelope + gravity checks.' },
    },
    required: ['ok', 'featureCount', 'diagnostics', 'sceneSummary'],
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
      deeperDiffAvailable: { type: 'object', additionalProperties: true, description: "Present when the diff touched geometry-affecting ops: { tool: 'diff_geometry', reason, bodies } — the same two scripts can be compared at material level (added/removed/common volume + per-body verdict)." },
      side: { type: 'string', description: "Which side failed ('base' | 'revised') (failure)." },
      error: { type: 'string', description: 'Failure message (failure).' },
      errorCode: { type: 'string' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
    },
    required: ['ok'],
    additionalProperties: true,
  },

  diff_geometry: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      base: { type: 'object', additionalProperties: true, description: 'Baseline summary { featureCount, bodyCount, isAssembly } (success).' },
      revised: { type: 'object', additionalProperties: true, description: 'Revision summary { featureCount, bodyCount, isAssembly } (success).' },
      bodies: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            baseName: { type: 'string' },
            revisedName: { type: 'string' },
            matchedBy: { type: 'string', enum: ['name', 'position'], description: 'How this pair was established.' },
            verdict: {
              type: 'string',
              enum: ['identical', 'moved', 'resized', 'topology-changed'],
              description: 'The field to branch on. Precedence: topology-changed > resized > moved > identical.',
            },
            volumeMm3: { type: 'object', additionalProperties: true, description: '{ base, revised, delta } in mm³.' },
            addedMm3: { type: 'number', description: 'volume(revised − base) — material that appeared.' },
            removedMm3: { type: 'number', description: 'volume(base − revised) — material that vanished.' },
            commonMm3: { type: 'number', description: 'volume(base ∩ revised) — material that stayed put.' },
            bbox: { type: 'object', additionalProperties: true, description: 'Exact bbox both sides plus min/max/extent deltas (mm).' },
            faceCount: { type: 'object', additionalProperties: true, description: '{ base, revised, delta } BREP face count.' },
            edgeCount: { type: 'object', additionalProperties: true, description: '{ base, revised, delta } BREP edge count.' },
            holeCount: { type: 'object', additionalProperties: true, description: '{ base, revised, delta } cylindrical-hole count.' },
            maxDeviationMm: { type: 'number', description: 'Two-sided discrete Hausdorff distance between the two surfaces.' },
          },
          required: ['name', 'verdict', 'addedMm3', 'removedMm3', 'commonMm3'],
          additionalProperties: true,
        },
        description: 'Per matched body, the material-level delta (success).',
      },
      unmatched: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Bodies present on only one side; each also raises diff.body.unmatched.' },
      summary: { type: 'object', additionalProperties: true, description: 'Verdict counts plus totalAddedMm3 / totalRemovedMm3 / maxDeviationMm.' },
      render: { type: 'object', additionalProperties: true, description: 'Overlay result when render: true — { ok, images, out_dir, script_path, error? }.' },
      side: { type: 'string', description: "Which side failed ('base' | 'revised') (failure)." },
      error: { type: 'string', description: 'Failure message (failure).' },
      errorCode: { type: 'string' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
    },
    required: ['ok'],
    additionalProperties: true,
  },

  ...MESH_RECONSTRUCT_OUTPUT_SCHEMAS,


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

  verify: VERIFY_OUTPUT_SCHEMA,

  why_did_this_fail: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      feature_id: { type: 'string' },
      chain: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Upstream feature diagnostics in topological order; requested feature last.' },
      trace: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Every captured feature joined to its call site, AST node range, diagnostics, inputs and dependents.' },
      repairRegion: { type: 'object', additionalProperties: true, description: 'Minimal editable line ranges for the failure: { file, ranges: [{ startLine, endLine, role, featureId?, paramName? }] }.' },
      candidates: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Ordered concrete fixes, each with an AST-anchored patch, a predicted effect, and the geometry it was derived from.' },
      candidateStatus: { type: 'string', enum: ['candidates', 'no-automatic-candidate'], description: "'no-automatic-candidate' means the region is the whole answer — no mechanical fix exists for that diagnostic kind." },
      candidateReason: { type: 'string', description: 'Why no candidate was derivable.' },
      targetDiagnosticId: { type: 'string', description: 'Id of the diagnostic the repair plan targets; pass it to repair_script.' },
      error: { type: 'string' },
      errorCode: { type: 'string' },
    },
    required: ['ok'],
    additionalProperties: true,
  },

  repair_script: {
    type: 'object',
    properties: {
      ok: { type: 'boolean', description: 'Whether a candidate cleared the target diagnostic without new errors.' },
      strategy: { type: 'string', enum: ['apply-first', 'try-all', 'dry-run'] },
      target: { type: 'object', additionalProperties: true, description: 'The diagnostic this run targeted { id, code, featureId?, message }.' },
      repairRegion: { type: 'object', additionalProperties: true, description: 'The line ranges the repair was bound to.' },
      candidates: { type: 'array', items: { type: 'object', additionalProperties: true } },
      candidateStatus: { type: 'string', enum: ['candidates', 'no-automatic-candidate'] },
      candidateReason: { type: 'string' },
      attempts: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Per-candidate outcome { candidateId, applied, ok?, clearedDiagnostic?, newErrorCodes?, accepted, diagnostic? }.' },
      applied: { type: 'string', description: 'Candidate id that was accepted.' },
      new_code: { type: 'string', description: 'Repaired .kcad.ts source (present when a patch applied). Caller persists it.' },
      diff: { type: 'string', description: 'Unified diff of the accepted patch (dry run: every candidate patch).' },
      before: { type: 'object', properties: { sceneSummary: SCENE_SUMMARY_SCHEMA }, additionalProperties: true, description: 'Pre-repair { ok, featureHealth, diagnostics }.' },
      after: { type: 'object', properties: { sceneSummary: SCENE_SUMMARY_SCHEMA }, additionalProperties: true, description: 'Post-repair { ok, featureHealth, diagnostics }.' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'tool.repair.* diagnostics when repair could not complete.' },
      error: { type: 'string' },
      errorCode: { type: 'string' },
    },
    required: ['ok', 'strategy', 'candidates', 'attempts'],
    additionalProperties: true,
  },

  set_param: SOURCE_EDIT,
  sweep_tolerance: {
    type: 'object',
    properties: {
      ok: { type: 'boolean', description: 'Whether every gate passed on every evaluated combo.' },
      combosEvaluated: { type: 'number', description: 'Number of combos actually evaluated (capped at 64).' },
      combosCapped: { type: 'boolean', description: 'True when the full cartesian product exceeded the 64-combo cap.' },
      results: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'One entry per evaluated combo: { combo, gates, diagnostics }.' },
      firstFailure: { type: 'object', additionalProperties: true, description: 'First failing combo per gate name.' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Sweep-level diagnostics (e.g. combo-cap-exceeded).' },
      error: { type: 'string' },
      errorCode: { type: 'string' },
    },
    required: ['ok'],
    additionalProperties: true,
  },
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
      ledger: { type: 'object', additionalProperties: true, description: 'Assumption ledger: { facts, scale?, unresolvedCount } classifying every fact as visible/inferred/assumed/missing.' },
    },
    required: ['ok', 'features', 'imageDims', 'diagnostics', 'ledger'],
    additionalProperties: true,
  },

  drawing_to_cad: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      page: { type: 'integer' },
      pageCount: { type: 'integer' },
      sheet: { type: 'object', additionalProperties: true, description: '{ widthMm, heightMm, scale: { text, sheetPerModel, source }, units, projection } read off the sheet.' },
      views: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Identified orthographic views: { name, bboxMm, identifiedBy, label? }.' },
      reconstruction: { type: 'object', additionalProperties: true, description: '{ kind: extrude | revolve, profileView, axis, holeCount, extents }.' },
      params: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Role-named params declared by the script: { name, value, description }.' },
      script: { type: 'string', description: 'The emitted .kcad.ts source.' },
      scriptPath: { type: 'string', description: 'Where the script was written (when `out` was given).' },
      ledger: { type: 'object', additionalProperties: true, description: 'Assumption ledger: { facts, unresolvedCount }; facts are visible / inferred / assumed / missing, disagreements recorded on the fact.' },
      ledgerPath: { type: 'string', description: 'Where the ledger was written (when `out` was given); pass it to resolve_assumptions.' },
      fidelity: { type: 'object', additionalProperties: true, description: '{ verdict: match | partial | mismatch | failed, extents, holes, silhouettes, reasons } from evaluating and re-projecting the script.' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
    },
    required: ['ok', 'views', 'params', 'ledger', 'diagnostics'],
    additionalProperties: true,
  },

  resolve_assumptions: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      ledger: { type: 'object', additionalProperties: true, description: 'The ledger after applying resolutions (present on success).' },
      paramOverrides: { type: 'object', additionalProperties: true, description: 'factId -> value for every resolved fact with a value; feed into set_param.' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
    },
    required: ['ok', 'paramOverrides', 'diagnostics'],
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
      converged: { type: 'boolean', description: 'Whether the constraint solve converged below tolerance. ok is false when this is false.' },
      residual: { type: 'number', description: 'Final aggregate constraint residual when the solver ran.' },
      entities: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Solved sketch entities (best-effort on a non-converging solve).' },
      constraints: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'The constraints applied.' },
      errors: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Solver/validation errors (present on failure, including non-convergence).' },
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
      shapeListMethods: { type: 'array', items: { type: 'object', additionalProperties: true } },
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

  execute_cookbook: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      cookbookId: { type: 'string', description: 'Resolved cookbook snippet id.' },
      title: { type: 'string', description: 'Resolved cookbook title.' },
      evaluate: { type: 'object', additionalProperties: true, description: 'Full evaluate_script result (same shape).' },
      openInStudio: { type: 'object', additionalProperties: true, description: 'open_in_studio result when openInStudio was requested.' },
      executionId: { type: 'string', description: 'Short id for logs / correlation.' },
      code: { type: 'string', description: 'Snippet body used for evaluate / Studio.' },
      dryRunNotEvidence: { type: 'boolean', description: 'Present when dryRun:true — dryRun success is not evidence the solid built.' },
      error: { type: 'string' },
      stage: { type: 'string', description: "'resolve' | 'evaluate' | 'open_in_studio' on failure." },
    },
    required: ['ok', 'executionId'],
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
      kind: { type: 'string', description: "'link_out' when the URL is a vendor configurator the agent must drive by hand." },
      url: { type: 'string', description: 'Outbound vendor URL (link_out). May carry a referral tag; see disclosure.' },
      instruction: { type: 'string', description: 'What to do with the link_out URL.' },
      disclosure: { type: 'string', description: 'Referral disclosure. Present only when url carries a referral tag; show it with the link.' },
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
      stageTimingsMs: { type: 'object', additionalProperties: { type: 'number' }, description: 'Wall-clock ms per review stage that ran.' },
      skippedStages: {
        type: 'array',
        items: { type: 'object', properties: { stage: { type: 'string' }, reason: { type: 'string' } }, additionalProperties: true },
        description: 'Stages skipped because timeBudgetMs was spent; their checks did not run.',
      },
      featureCount: { type: 'number' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
      assembly: { type: 'string' },
      validator: { type: 'object', additionalProperties: true, description: 'Assembly/mate-graph validator result.' },
      poseEnvelope: { type: 'object', additionalProperties: true, description: 'Sampled mate-limit pose envelope.' },
      connectorWorkspace: {
        type: 'array',
        items: { type: 'object', additionalProperties: true },
        description: 'Connector workspace bounds.',
      },
      gripperAperture: { type: 'object', additionalProperties: true },
      physicalUseCaseStaticCertificates: {
        type: 'array',
        items: { type: 'object', additionalProperties: true },
        description: 'Verified sampled quasi-static certificates with residual wrench, contact forces, and actuator torque evidence.',
      },
      physicalUseCaseJointReactionCertificates: {
        type: 'array',
        description: 'Exact-pose parent-on-child joint reaction wrench certificates in N, mm, and Nmm.',
        items: {
          type: 'object',
          properties: {
            useCaseName: { type: 'string' },
            poses: { type: 'object', additionalProperties: true },
            reactions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  mateName: { type: 'string' },
                  parentPart: { type: 'string' },
                  childPart: { type: 'string' },
                  pointWorldMm: { type: 'array', items: { type: 'number' } },
                  axisWorld: { type: 'array', items: { type: 'number' } },
                  forceWorldN: { type: 'array', items: { type: 'number' } },
                  momentWorldNmm: { type: 'array', items: { type: 'number' } },
                  resultantForceN: { type: 'number' },
                  resultantMomentNmm: { type: 'number' },
                  axialForceN: { type: 'number' },
                  radialForceN: { type: 'number' },
                  axisMomentNmm: { type: 'number' },
                  bendingMomentNmm: { type: 'number' },
                },
                required: [
                  'mateName', 'parentPart', 'childPart', 'pointWorldMm', 'axisWorld',
                  'forceWorldN', 'momentWorldNmm', 'resultantForceN',
                  'resultantMomentNmm', 'axialForceN', 'radialForceN',
                  'axisMomentNmm', 'bendingMomentNmm',
                ],
                additionalProperties: false,
              },
            },
          },
          required: ['useCaseName', 'poses', 'reactions'],
          additionalProperties: false,
        },
      },
      physicalUseCaseJointStructuralCertificates: {
        type: 'array',
        description: 'Per-joint declared-envelope and geometry/material clevis strength evidence.',
        items: {
          type: 'object',
          properties: {
            useCaseName: { type: 'string' },
            poses: { type: 'object', additionalProperties: true },
            joints: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  mateName: { type: 'string' },
                  envelope: { type: 'object', additionalProperties: true },
                  structure: { type: 'object', additionalProperties: true },
                },
                required: ['mateName', 'envelope'],
                additionalProperties: false,
              },
            },
          },
          required: ['useCaseName', 'poses', 'joints'],
          additionalProperties: false,
        },
      },
      fitness: { type: 'object', additionalProperties: true, description: 'Mechanism fitness verdict incl. repairMode.' },
      repairContext: { type: 'object', additionalProperties: true },
      rawInterferencePairs: { type: 'array', items: { type: 'object', additionalProperties: true } },
      interferenceSummary: {
        type: 'object',
        additionalProperties: true,
        description: 'Classified interference counts and pairs: raw, contact-noise, actionable, and capMm3.',
      },
      mechanism: { type: 'string' },
      mechanismFailures: { type: 'array', items: { type: 'object', additionalProperties: true } },
      mechanismSummary: MECHANISM_SUMMARY,
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
      attempts: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Per-attempt review results (includes revisionAssist when failed).' },
      record: { type: 'object', additionalProperties: true, description: 'Studio-compatible build record (when requested).' },
      outputRecordPath: { type: 'string' },
      recordUrl: { type: 'string' },
      nextActionPrompt: { type: 'string' },
      convergence: { type: 'object', additionalProperties: true, description: 'Present when trailing failures share a signature (escalate).' },
      revisionAssist: {
        type: 'object',
        additionalProperties: true,
        description:
          'Structured revision assist from the last failing attempt: hints, suggestedPatches (AST diffs), optional autoApplied.suggestedCode when repair_script cleared a repairable diagnostic. Honest scope — not full autonomous CAD rewrite.',
      },
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
      sceneSummary: SCENE_SUMMARY_SCHEMA,
      ok: { type: 'boolean' },
      output_path: { type: 'string', description: "target:'model' — written file path." },
      byte_count: { type: 'number', description: "target:'model' — file size in bytes." },
      feature_count: { type: 'number' },
      format: { type: 'string' },
      gcode_stats: {
        type: 'object',
        description: 'G-code only: slicer predictions and generator identity reported by artifact comments; not physical measurements.',
        properties: {
          slicer: { type: 'object', properties: { name: { type: 'string', enum: ['OrcaSlicer', 'PrusaSlicer'] }, version: { type: 'string' } }, required: ['name', 'version'], additionalProperties: false },
          estimatedPrintTimeSeconds: { type: 'number', minimum: 0 },
          filamentUsedGrams: { type: 'number', minimum: 0 },
          filamentUsedMeters: { type: 'number', minimum: 0 },
          layerCount: { type: 'integer', minimum: 0 },
          maxZMm: { type: 'number', minimum: 0 },
        },
        additionalProperties: false,
      },
      mesh_files: { type: 'array', items: { type: 'string' }, description: 'Per-link mesh files: meshes/<part>.stl for urdf/sdf-gazebo, meshes/<part>.usda mesh layers for usd-isaac.' },
      part_files: { type: 'array', items: { type: 'string' }, description: "Per-part DXF files: parts/<part>.dxf for a multi-part dxf export (layout 'per-part', the default)." },
      written: { type: 'array', items: { type: 'object', additionalProperties: true }, description: "target:'part' — per-part export records." },
      infill: { type: 'object', additionalProperties: true, description: "3mf with options.infill — stress-graded infill: band table (density, stress range, volume %), saving vs uniform infill at the high density, FEA peaks, and images { heatmap, bands, cutaway } PNG paths." },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
      error: { type: 'string' },
    },
    required: ['ok'],
    additionalProperties: true,
  },

  send_to_printer: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      uploaded_path: { type: 'string', description: 'Path/name the G-code (bambu-lan: the .gcode.3mf print file) was stored under on the printer.' },
      dry_run: { type: 'boolean', description: 'True when only connectivity/auth was validated (no upload, no print start).' },
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
      sceneSummary: SCENE_SUMMARY_SCHEMA,
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
  run_fea: {
    type: 'object',
    properties: {
      ok: { type: 'boolean', description: 'False when the study violated its declared minSafetyFactor, a selector did not resolve, or the solver toolchain is missing.' },
      summary: {
        type: 'object',
        additionalProperties: true,
        description: 'Solved evidence: maxVonMisesMPa, maxVonMisesAt, maxDisplacementMm, maxDisplacementAt, minSafetyFactor (+ minSafetyFactorRequired), nodeCount/elementCount/meshSizeMm, quality (minSICN, meanSICN, lowQualityCount), maxStressErrorPercent (high-stress region), trust { meshTrusted, reasons }, hotSpots [{ region, maxVonMisesMPa, nodeId, at, safetyFactor }]; the stress values, safety factor and hot spots exclude the support zone next to fixed-face edges (governingField), whose clamp-singular raw peak is reported as peakAtSupportMPa / peakAtSupportAt / peakAtSupportRegion with supportAdjacentNodeCount and supportZoneRadiusMm; appliedForceN / reactionForceN / equilibriumResidual, meshMs / solveMs.',
      },
      images: { type: 'array', items: { type: 'string' }, description: 'Absolute PNG paths of the rendered stress heatmap.' },
      legend: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Heatmap colour bands { color, fromMPa, toMPa } — the scale the PNGs are drawn on.' },
      out_dir: { type: 'string', description: 'Directory holding the summary JSON, solver deck and heatmap PNGs.' },
      artifacts: { type: 'object', additionalProperties: true, description: 'Absolute paths of the BREP geometry handoff, .inp deck, .frd results and mesh JSON, for hand reproduction.' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'fea.* diagnostics raised by the run.' },
      error: { type: 'string' },
      errorCode: { type: 'string' },
    },
    required: ['ok'],
    additionalProperties: true,
  },
  fea_summary: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      summary: { type: 'object', additionalProperties: true, description: 'Stored summary of a previous run_fea in output_dir, when present.' },
      toolchain: { type: 'object', additionalProperties: true, description: '{ available, ccx?, gmshVersion?, missing[], hint? } — whether a study can run here and how to fix it if not.' },
      materials: { type: 'object', additionalProperties: true, description: 'Named grade -> { E (MPa), nu, yield (MPa) }.' },
      material_names: { type: 'array', items: { type: 'string' }, description: 'Accepted material grade names.' },
      error: { type: 'string' },
      errorCode: { type: 'string' },
    },
    required: ['ok', 'toolchain', 'materials', 'material_names'],
    additionalProperties: true,
  },
  fit_plane: {
    type: 'object',
    properties: {
      ok: { type: 'boolean', description: 'Present and true when a plane fit succeeds; false when input validation or fitting fails.' },
      centroid: { type: 'array', items: { type: 'number' }, description: 'Least-squares plane centroid [x, y, z].' },
      normal: { type: 'array', items: { type: 'number' }, description: 'Deterministic unit plane normal [x, y, z].' },
      residuals: { type: 'array', items: { type: 'number' }, description: 'Signed orthogonal distances in input order.' },
      rms: { type: 'number', description: 'Root mean square orthogonal residual.' },
      maxAbsResidual: { type: 'number', description: 'Maximum absolute orthogonal residual.' },
      error: { type: 'string', description: 'Failure message; present when ok is false.' },
    },
    required: ['ok'],
    additionalProperties: true,
  },
  ...IMPORT_OUTPUT_SCHEMAS,
  ...FABRICATION_OUTPUT_SCHEMAS,
  ...MANUFACTURING_OUTPUT_SCHEMAS,
  ...NURBS_OUTPUT_SCHEMAS,
  explode_view: {
    type: 'object', properties: {
      ok: { type: 'boolean' },
      order: { type: 'array', items: { type: 'string' } },
      durationMs: { type: 'number' },
      tracks: { type: 'array', items: { type: 'object', additionalProperties: true } },
      reverseTracks: { type: 'array', items: { type: 'object', additionalProperties: true } },
      param_declarations: { type: 'string', description: 'Ready-to-paste param() calls that declare every animation track parameter with its initial value.' },
      script_fragment: { type: 'string', description: 'Ready-to-paste declarations and forward animationView() call.' },
      animation_tracks: { type: 'array', items: { type: 'object', additionalProperties: true } },
      reverse_animation_tracks: { type: 'array', items: { type: 'object', additionalProperties: true } },
      part_transforms: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Per-part expressions to apply to existing shapes before assembly.part().' },
      cameraPlan: { type: 'object', additionalProperties: true, description: 'Suggested target and camera distance for assembled/exploded capture framing; camera keyframes are guidance and are not consumed by animationView.' },
      warnings: { type: 'array', items: { type: 'string' } },
      playback: { type: 'string' },
    }, required: ['ok', 'order', 'durationMs', 'tracks', 'reverseTracks', 'warnings', 'cameraPlan'], additionalProperties: false,
  },
};
