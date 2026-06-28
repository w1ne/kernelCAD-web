// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { addConstraintTool, solveSketchTool } from './tools/constraints';
import { addFeatureTool } from './tools/addFeature';
import { addCurveTool } from './tools/addCurve';
import { addSurfaceTool } from './tools/addSurface';
import { addPathSegmentTool } from './tools/addPathSegment';
import { traceFromImageTool } from './tools/traceFromImage';
import { addPatternFeatureTool } from './tools/addPatternFeature';
import { addVariableSweepTool } from './tools/addVariableSweep';
import { addTextTool } from './tools/addText';
import { projectCurveTool } from './tools/projectCurve';
import { addAssemblyPartSourceTool } from './tools/addAssemblyPartSource';
import { addPartConnectorSourceTool } from './tools/addPartConnectorSource';
import { addWorkspaceTargetSourceTool } from './tools/addWorkspaceTargetSource';
import { setSceneReturnSourceTool } from './tools/setSceneReturnSource';
import { addMateAuthoringTool } from './tools/addMateAuthoring';
import { evaluateScriptTool } from './tools/evaluateScript';
import { diffScriptsTool } from './tools/diffScripts';
import { evaluateSdfTool } from './tools/evaluateSdf';
import { exportTool } from './tools/export';
import { listApiTool } from './tools/listApi';
import { listDiagnosticCodesTool } from './tools/listDiagnosticCodes';
import { lookupCookbookTool } from './tools/lookupCookbook';
import { findPartTool } from './tools/findPart';
import { fetchPartTool } from './tools/fetchPart';
import { removeFeatureTool } from './tools/removeFeature';
import { designLoopTool } from './tools/designLoop';
import { reviewCadTool } from './tools/reviewCad';
import { reviewPaintPeekLatestTool } from './tools/reviewPaint';
import { setParamValueTool } from './tools/setParamValue';
import { solveMatesTool } from './tools/solveMates';
import { whyDidThisFailTool } from './tools/whyDidThisFail';
import { flattenPatternTool } from './tools/flattenPattern';
import { verifyTool } from './tools/verify';
import { inspectTool } from './tools/inspect';
import { queryTool } from './tools/query';
import { TOOL_ANNOTATIONS, type ToolAnnotations } from './toolAnnotations';
import { TOOL_OUTPUT_SCHEMAS, type JSONSchemaObject } from './toolOutputSchemas';
import { captureAnimationTool } from './tools/captureAnimation';
import { renderPreviewTool } from './tools/renderPreview';
export { runClosedLoop } from '../loop/closedLoop.js';
export { buildRepairPrompt } from '../loop/repairPrompt.js';
export * from '../loop/types.js';

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    /** Optional JSON Schema conditional blocks (if/then/else) for
     *  required-by-discriminator fields. */
    allOf?: unknown[];
  };
  /** MCP behavioral hints (readOnly/destructive/openWorld). Required for ChatGPT
   *  app-directory submission; merged from TOOL_ANNOTATIONS at build time. */
  annotations?: ToolAnnotations;
  /** MCP structured-output schema (JSON Schema for the tool's return value).
   *  Merged from TOOL_OUTPUT_SCHEMAS at build time. */
  outputSchema?: JSONSchemaObject;
}

type ToolHandler = (input: Record<string, unknown>) => Promise<unknown>;

interface ToolRegistryEntry {
  definition: McpToolDefinition;
  handler: ToolHandler;
}

/**
 * Registry of every MCP tool — pairs each definition with its handler.
 *
 * Public contract — depended on by kernelCAD-server (vendor/kernelcad/ submodule).
 * The shape of `ToolRegistryEntry` (`{ definition: McpToolDefinition, handler: ToolHandler }`)
 * is the source of truth; `TOOLS` and the in-process Map indexes are derived from it.
 * Do NOT change the entry shape or remove entries without bumping the consumer SHA explicitly.
 */
export const TOOL_REGISTRY: ToolRegistryEntry[] = [
  {
    definition: {
      name: 'evaluate_script',
      description:
        'Use this when you need to run a script and check it compiles. ' +
        'Run a kernelCAD .kcad.ts script and report pass/fail + feature count + diagnostics. ' +
        'When the scene is assembly-built (assembly().part(...) → .model()/.solvedModel()), ' +
        'also returns a parts summary { count, names } AND runs the mechanism-truth gate by ' +
        'default: the `mechanism` field reports real/broken/unverified and a broken mechanism ' +
        '(self-collision, fastened drift, dof-mismatch) makes ok:false with the failures in ' +
        'diagnostics. Pass { skipMechanismCheck: true } to opt out. ' +
        'Pass either { file: "<path>" } or { code: "<inline source>" }. ' +
        'Set { dryRun: true } for fast validation while iterating: transpile + capture + ' +
        'capture-light checks WITHOUT OCCT lowering, DFM gates, or meshing — milliseconds ' +
        'instead of seconds (100x+ on boolean/fillet-heavy scripts). A dry run catches script ' +
        'throws, capture-time API misuse, and assembly validity-gate failures, but NOT ' +
        'lowering failures or dfmSpec diagnostics; it leaves the active session untouched, ' +
        'so finish with a full (non-dry) evaluate_script before using session-dependent tools.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
          dryRun: {
            type: 'boolean',
            description:
              'Fast validation only: skip OCCT lowering, DFM gates, and meshing. ' +
              'Does not set or clear the active session.',
          },
          skipMechanismCheck: {
            type: 'boolean',
            description:
              'Opt out of the default mechanism-truth gate. By default a full ' +
              'evaluation of an assembly-built scene runs checkMechanismTruth and ' +
              'returns a `mechanism` verdict (real/broken/unverified); a broken ' +
              "mechanism makes ok:false. Set true to skip the sweep entirely (no " +
              '`mechanism` field, no cost). Ignored for dryRun and non-assembly scripts.',
          },
        },
      },
    },
    handler: input => evaluateScriptTool(input as Parameters<typeof evaluateScriptTool>[0]),
  },
  {
    definition: {
      name: 'diff_scripts',
      description:
        'Use this when you need to see exactly what changed between two script versions. ' +
        'Structured geometric delta between two versions of a kernelCAD script — a baseline ' +
        '({ baseFile } or { baseCode }) and a revision ({ file } or { code }). Returns ' +
        'agent-readable JSON: per-part added/removed/renamed/changed (volume mm³ + exact bbox ' +
        "deltas, numbers matching inspect({ of: 'part-stats' })), total interference-volume delta with " +
        'per-pair detail, mate-graph changes (added/removed/changed mates incl. type, ' +
        'connectors, pose, limits), and param changes (value/min/max). Single-shape scripts ' +
        'diff as one "(root)" pseudo-part. Use after editing a script to verify exactly what ' +
        'changed physically before re-rendering. Read-only — never touches the active session.',
      inputSchema: {
        type: 'object',
        properties: {
          baseFile: { type: 'string', description: 'Baseline script — path to a .kcad.ts file.' },
          baseCode: { type: 'string', description: 'Baseline script — inline source.' },
          file: { type: 'string', description: 'Revised script — path to a .kcad.ts file.' },
          code: { type: 'string', description: 'Revised script — inline source.' },
        },
      },
    },
    handler: input => diffScriptsTool(input as Parameters<typeof diffScriptsTool>[0]),
  },
  {
    definition: {
      name: 'inspect',
      description:
        'Use this when you need to read facts about a model. One reader, selected by `of`:\n' +
        "- 'assembly' — physical assembly inventory (parts, bboxes, connectors, mates, disconnected solids).\n" +
        "- 'robot' — URDF/SDFormat export preview (links, joints, planning groups, end-effectors, issues).\n" +
        "- 'step' — inspect an imported STEP file.\n" +
        "- 'shape' — volume / surfaceArea / bbox for one feature ({ feature_id? }).\n" +
        "- 'features' — features captured by the script (kind, id, params, transforms, suppression).\n" +
        "- 'assemblies' — assembly intent (assemblies, parts, connectors, joints).\n" +
        "- 'topology' — canonical face names + edge count for a feature ({ feature_id? }).\n" +
        "- 'edges' — edges of a shape with optional EdgeQuery ({ feature_id?, query? }); returns @kc[...] refs.\n" +
        "- 'face-edges' — boundary edges of a named canonical face ({ feature_id?, face_name }).\n" +
        "- 'faces' — faces of a shape with optional FaceQuery ({ feature_id?, query? }); returns @kc[...] refs.\n" +
        "- 'face-labels' — user-applied labels visible in the script.\n" +
        "- 'mates' — mates captured by the script.\n" +
        "- 'constraints' — sketch constraints captured by the script.\n" +
        "- 'part-stats' — bundled parts-catalog statistics.\n" +
        "- 'bend-table' — sheet-metal bend table for a flattened pattern.\n" +
        "- 'params' — declared model parameters.\n" +
        "- 'part-categories' — top-level part-catalog categories available in the bundled (and configured remote) catalog.\n" +
        "- 'part-families' — part families within a category ({ category? }); count + exemplar ids per family.\n" +
        'All params except `of` are subject-specific and forwarded verbatim. Most subjects accept { file | code }.',
      inputSchema: {
        type: 'object',
        properties: {
          of: {
            type: 'string',
            enum: ['assembly', 'robot', 'step', 'shape', 'features', 'assemblies', 'topology', 'edges', 'face-edges', 'faces', 'face-labels', 'mates', 'constraints', 'part-stats', 'bend-table', 'params', 'part-categories', 'part-families'],
            description: 'Which facts to read.',
          },
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
          assembly: { type: 'string', description: "of:'assembly'|'robot' — assembly name; defaults to the first captured assembly." },
          feature_id: { type: 'string', description: "of:'shape'|'topology'|'edges'|'faces'|'face-edges'|'face-labels' — FeatureId; defaults to the last returned shape." },
          face_name: { type: 'string', enum: ['top', 'bottom', 'left', 'right', 'front', 'back'], description: "of:'face-edges' — canonical face name (required for that subject)." },
          query: { type: 'object', description: "of:'edges'|'faces' — optional EdgeQuery/FaceQuery filter." },
          category: { type: 'string', description: "of:'part-families' — optional top-level category to filter families by." },
        },
        required: ['of'],
      },
    },
    handler: input => inspectTool(input as unknown as Parameters<typeof inspectTool>[0]),
  },
  {
    definition: {
      name: 'verify',
      description:
        'Use this when you need to check a design against a rule set. One verifier, selected by `check`:\n' +
        "- 'assembly' — mate-aware assembly validator on the active session (run evaluate_script first).\n" +
        "- 'urdf' — structural validity of a .urdf file ({ urdf_path }).\n" +
        "- 'dfm' — print-readiness gates declared by dfmSpec() ({ file | code }).\n" +
        "- 'dfm-preflight' — sheet-metal flat pattern vs a job-shop's ordering rules ({ vendor, material, thicknessIn|thicknessMm, ... }).\n" +
        "- 'swept-collision' — sweep declared joint range(s) and report colliding poses.\n" +
        "- 'reachable' — inverse-kinematics reachability for an end-effector ({ tip_link, target_position, ... }).\n" +
        "- 'mounting-holes' — fastened mates expose matching hole diameters on both sides.\n" +
        "- 'load-capacity' — closed-form Euler-Bernoulli beam stress / safety-factor check ({ loads, materials, ... }).\n" +
        'All params except `check` are check-specific and forwarded verbatim; each check fails closed on its own missing required params.',
      inputSchema: {
        type: 'object',
        properties: {
          check: {
            type: 'string',
            enum: ['assembly', 'urdf', 'dfm', 'dfm-preflight', 'swept-collision', 'reachable', 'mounting-holes', 'load-capacity'],
            description: 'Which verification to run.',
          },
          file: { type: 'string', description: 'Path to a .kcad.ts script (assembly/dfm/dfm-preflight/swept-collision/reachable/mounting-holes/load-capacity).' },
          code: { type: 'string', description: 'Inline kernelCAD script source (same checks as `file`).' },
          assembly: { type: 'string', description: 'Assembly name; defaults to the first captured assembly.' },
          urdf_path: { type: 'string', description: "check:'urdf' — path to the .urdf file." },
          dxf: { type: 'string', description: "check:'dfm-preflight' — path to a DXF file." },
          featureId: { type: 'string', description: "check:'dfm-preflight' — FeatureId to scope to." },
          vendor: { type: 'string', description: "check:'dfm-preflight' — vendor SKU (required for that check)." },
          material: { type: 'string', description: "check:'dfm-preflight' — material SKU (required for that check)." },
          thicknessIn: { type: 'number', description: "check:'dfm-preflight' — material thickness in inches." },
          thicknessMm: { type: 'number', description: "check:'dfm-preflight' — material thickness in millimeters." },
          service: { type: 'string', enum: ['laser', 'cnc-router', 'waterjet', 'bending'], description: "check:'dfm-preflight' — service." },
          refreshCatalog: { type: 'boolean', description: "check:'dfm-preflight' — force vendor catalog refresh." },
          joint: { type: 'string', description: "check:'swept-collision' — joint to sweep; omit to sweep every declared joint." },
          range: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: "check:'swept-collision' — [lower, upper, step] in joint-native units." },
          collision_tolerance_mm3: { type: 'number', description: "check:'swept-collision' — BREP intersection volume tolerance (mm^3)." },
          tip_link: { type: 'string', description: "check:'reachable' — end-effector part name (required for that check)." },
          target_position: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: "check:'reachable' — target [x, y, z] mm (world frame)." },
          target_orientation: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: "check:'reachable' — target XYZ Euler angles in radians." },
          position_tolerance_mm: { type: 'number', description: "check:'reachable' — position tolerance in mm." },
          orientation_tolerance_rad: { type: 'number', description: "check:'reachable' — orientation tolerance in radians." },
          prefer_solver: { type: 'string', enum: ['analytical', 'numeric', 'auto'], description: "check:'reachable' — force the IK path ('auto' default)." },
          max_iterations: { type: 'number', description: "check:'reachable' — numeric-path iteration cap." },
          seed: { type: 'object', description: "check:'reachable' — numeric IK seed pose (joint name -> deg/mm)." },
          loads: { type: 'object', description: "check:'load-capacity' — partName -> { force?: [Fx,Fy,Fz] N, torque?: [Tx,Ty,Tz] N*m }." },
          materials: { type: 'object', description: "check:'load-capacity' — partName -> material declaration." },
          mode: { type: 'string', enum: ['stub', 'beam'], description: "check:'load-capacity' — 'beam' (default) or 'stub'." },
          safety_factor_threshold: { type: 'number', description: "check:'load-capacity' — pass/fail safety-factor floor (default 1.5)." },
        },
        required: ['check'],
      },
    },
    handler: input => verifyTool(input as unknown as Parameters<typeof verifyTool>[0]),
  },
  {
    definition: {
      name: 'why_did_this_fail',
      description: "Use this when you need to trace why a feature failed. Walk the upstream chain of a failing feature. Returns the diagnostics of the requested feature plus the diagnostics of every upstream feature in topological order (the requested feature is the last entry). Per-code hints are inline on every diagnostic — call lookup_diagnostics for the full catalogue. Pass { file?, code?, feature_id? }.",
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          code: { type: 'string' },
          feature_id: { type: 'string' },
        },
      },
    },
    handler: input => whyDidThisFailTool(input as Parameters<typeof whyDidThisFailTool>[0]),
  },
  {
    definition: {
      name: 'set_param',
      description: 'Use this when you need to edit a param() default value in a kernelCAD script. Returns the modified code as text plus diagnostics from re-evaluating the result. Caller persists the new code via standard file-write tools (this tool has no side effects).',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          param_name: { type: 'string', description: 'The string literal name of the param (first arg to param()).' },
          new_value: { description: 'The new default value — number for numeric params, string for expressions.' },
        },
        required: ['code', 'param_name', 'new_value'],
      },
    },
    handler: input => setParamValueTool(input as unknown as Parameters<typeof setParamValueTool>[0]),
  },
  {
    definition: {
      name: 'add_feature',
      description: 'Use this when you need to insert a new feature line into a script. Insert a new feature line into a kernelCAD script before the last top-level return statement. Returns the modified code as text plus diagnostics from re-evaluating the result. Side-effect-free. Primitives that accept faceLabels (box, cylinder, extrudeRect, extrudeCircle, extrudePolygon, extrudeRoundedRect) can receive `opts.faceLabels` in the inserted code — use `lookup_api` to see `featureKindFaceLabels` for the full value schema.',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          feature_code: { type: 'string', description: 'Single-statement source line to insert (e.g. `const hole = cylinder(5, 2).translate(10, 10, -1);`).' },
        },
        required: ['code', 'feature_code'],
      },
    },
    handler: input => addFeatureTool(input as unknown as Parameters<typeof addFeatureTool>[0]),
  },
  {
    definition: {
      name: 'add_surface',
      description:
        'Use this when you need an organic, freeform, or swept shape — a body shell, panel, fairing, ergonomic curve, lens, or sculpted form — authored as a NURBS Surface into the user\'s .kcad.ts, OR when you need to finish surfaces into a watertight solid or taper faces for moldability. One authoring/finishing path, selected by `kind`:\n' +
        "- 'nurbs' — insert a nurbsSurface(...) / surfaceFromCurves(...) call. Pass either { controls, degree, weights?, knots?, periodic? } for direct construction, OR { section_sketch_ids } for skinning. Weights are honored: supply rational weights to build exact circles/cylinders/spheres/conics (the surface becomes rational); omit weights for a non-rational surface.\n" +
        "- 'boundary' — insert a surfaceFromBoundary([c1,c2,c3,c4], opts?) call: one NURBS face through 4 boundary Curve3D refs (bottom, right, top, left in loop order; adjacent endpoints must coincide within 1e-6 mm) via OCCT BRepOffsetAPI_MakeFilling.\n" +
        "- 'trim' — insert a `<surface>.trimTo(<by>)` or `<surface>.split(<by>)` call. Pass `surface_binding` (the Surface variable name), `by_binding` (the cutter Surface variable name; Shape/Curve3D cutters are deferred to a later slice), and `op: 'trim'` (keep the largest imprinted piece) or `op: 'split'` (return both halves as a `[Surface, Surface]` tuple).\n" +
        "- 'sew' — insert a `sew([s0, s1, ...], opts?)` call to stitch N surfaces into a closed watertight solid via OCCT BRepBuilderAPI_Sewing. Pass `surface_bindings` (array of Surface variable names). Use after trim/boundary to close patches into a solid: trim → sew → solid pipeline. Optional `tolerance` (mm, default 1e-6) and `require_closed` (emits feature.surface-sew.open-shell if result is not watertight).\n" +
        "- 'draft' — insert a `<shape>.draft(angleDeg, { face, neutralPlane?, pullDir? })` call to taper the selected face(s) for mold release. Pass `shape_binding`, `angle_deg` (0–90), and `face` (canonical name, label, or FaceQuery descriptor). Lowering emits feature.draft.failed on invalid geometry.\n" +
        'The returned Surface produces no Shape until you chain .thicken(t) or .toShape() (do that via add_feature on the binding name). Returns the modified code + diagnostics. Each kind fails closed on its own missing required params.',
      inputSchema: {
        type: 'object',
        properties: {
          kind: {
            type: 'string',
            enum: ['nurbs', 'boundary', 'trim', 'sew', 'draft'],
            description: "Which surface-construction or surface-finishing path to use: 'nurbs' | 'boundary' | 'trim' | 'sew' | 'draft'.",
          },
          code: { type: 'string', description: 'Current .kcad.ts source.' },
          controls: {
            type: 'array',
            description: "kind:'nurbs' — control-point grid for direct construction (controls[u][v] = [x, y, z], mm).",
            items: {
              type: 'array',
              items: { type: 'array', items: { type: 'number' } },
            },
          },
          weights: {
            type: 'array',
            description: "kind:'nurbs' — optional rational weights, same grid shape as controls. Ignored in slice-1.",
            items: { type: 'array', items: { type: 'number' } },
          },
          degree: {
            type: 'object',
            description: "kind:'nurbs' — degrees in U and V; each in [1, nU-1] / [1, nV-1].",
            properties: {
              u: { type: 'integer', minimum: 1 },
              v: { type: 'integer', minimum: 1 },
            },
            required: ['u', 'v'],
          },
          knots: {
            type: 'object',
            description: "kind:'nurbs' — optional explicit knot vectors; missing => clamped uniform inferred.",
            properties: {
              u: { type: 'array', items: { type: 'number' } },
              v: { type: 'array', items: { type: 'number' } },
            },
          },
          periodic: {
            type: 'object',
            description: "kind:'nurbs' — optional periodic flags per parametric direction.",
            properties: {
              u: { type: 'boolean' },
              v: { type: 'boolean' },
            },
          },
          section_sketch_ids: {
            type: 'array',
            description: "kind:'nurbs' — existing sketch FeatureIds (2 or more) to skin a surface through, in order.",
            items: { type: 'string' },
          },
          curve_bindings: {
            type: 'array',
            description: "kind:'boundary' — tuple of 4 existing Curve3D variable names (bottom, right, top, left) declared earlier in the source.",
            items: { type: 'string' },
            minItems: 4,
            maxItems: 4,
          },
          continuity: {
            description: "kind:'boundary' — continuity grade applied to every edge ('C0' | 'C1' | 'C2'), or an array of 4 grades (one per edge, bottom/right/top/left order). Default 'C0'.",
            oneOf: [
              { type: 'string', enum: ['C0', 'C1', 'C2'] },
              { type: 'array', items: { type: 'string', enum: ['C0', 'C1', 'C2'] }, minItems: 4, maxItems: 4 },
            ],
          },
          sampling: { type: 'integer', minimum: 1, description: "kind:'boundary' — OCCT NbPtsOnCur sampling parameter (default 15)." },
          binding_name: {
            type: 'string',
            description: "JS const name for the new binding (kind:'nurbs' default surface_<N>; kind:'boundary' default _surface_<N>; kind:'trim' default _trimmed_<N>; kind:'sew' default _sewn_<N>; kind:'draft' default _drafted_<N>).",
          },
          // kind:'trim' params
          surface_binding: {
            type: 'string',
            description: "kind:'trim' — JS variable name of the Surface to trim/split (must be declared in source).",
          },
          by_binding: {
            type: 'string',
            description: "kind:'trim' — JS variable name of the cutter Surface (must be declared in source). Shape/Curve3D cutters are deferred.",
          },
          op: {
            type: 'string',
            enum: ['trim', 'split'],
            description: "kind:'trim' — 'trim' discards the smaller half (calls .trimTo()); 'split' retains both halves (calls .split()).",
          },
          // kind:'sew' params
          surface_bindings: {
            type: 'array',
            description: "kind:'sew' — JS variable names of the surfaces to stitch into a solid (each must be declared in source).",
            items: { type: 'string' },
            minItems: 1,
          },
          tolerance: {
            type: 'number',
            description: "kind:'sew' — edge-merging tolerance in mm (default 1e-6). Edges within this distance are merged.",
          },
          require_closed: {
            type: 'boolean',
            description: "kind:'sew' — when true the lowerer emits feature.surface-sew.open-shell if the stitched result is not a watertight solid.",
          },
          // kind:'draft' params
          shape_binding: {
            type: 'string',
            description: "kind:'draft' — JS variable name of the Shape to taper (must be declared in source).",
          },
          angle_deg: {
            type: 'number',
            minimum: 0,
            maximum: 90,
            description: "kind:'draft' — draft angle in degrees [0, 90]. The face is tapered outward by this angle relative to the pull direction.",
          },
          face: {
            type: 'string',
            description: "kind:'draft' — face selector for the face(s) to taper. Accepts a canonical name (top/bottom/front/back/left/right), a user label declared via faceLabels, or a FaceQuery descriptor string.",
          },
          neutral_plane: {
            type: 'string',
            description: "kind:'draft' — parting-line face (the plane where drafted faces remain fixed). Defaults to `face` if omitted.",
          },
          pull_dir: {
            type: 'array',
            items: { type: 'number' },
            minItems: 3,
            maxItems: 3,
            description: "kind:'draft' — demoulding direction as [x, y, z]. Defaults to the face normal at lower time.",
          },
        },
        required: ['kind', 'code'],
      },
    },
    handler: input => addSurfaceTool(input as unknown as Parameters<typeof addSurfaceTool>[0]),
  },
  {
    definition: {
      name: 'add_curve',
      description:
        "Use this when you need a freeform/organic 3D curve — a body feature line, brow, spine rail, or G2 blend between panels — authored as a Curve3D into the user's .kcad.ts immediately before the last top-level return. One authoring path, selected by `kind`:\n" +
        "- 'nurbs' — insert a `nurbsCurve(controlPoints, opts?)` declaration. Pass `controlPoints` as a Vec3[] (mm, at least 2 points). Optional NURBS knobs: `degree` (default 3), rational `weights`, explicit `knots`, `closed`.\n" +
        "- 'hermite' — insert a `hermiteG2(a, b)` declaration: a quintic Hermite curve interpolating two endpoints with matching positions, tangents, and (optional) curvatures — bridges two curves with G2 continuity. Each endpoint is `{ point: Vec3, tangent: Vec3, curvature?: Vec3 }` in mm; tangent magnitude ~ chord length; curvature defaults to [0,0,0] (G1-only).\n" +
        "The returned binding has type Curve3D (peer to Shape / Surface) — consume it via `add_variable_sweep` (spine input), `add_surface({ kind: 'boundary' })` (boundary curve), or downstream Curve3D-accepting features. Returns the modified code + diagnostics from re-evaluating. Side-effect-free. Each kind fails closed on its own missing required params.",
      inputSchema: {
        type: 'object',
        properties: {
          kind: {
            type: 'string',
            enum: ['nurbs', 'hermite'],
            description: 'Which curve-construction path to use.',
          },
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          controlPoints: {
            type: 'array',
            description: "kind:'nurbs' — control points as Vec3 triples in mm; at least 2 entries.",
            items: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
          },
          degree: { type: 'integer', minimum: 1, description: "kind:'nurbs' — curve degree; default 3 (cubic)." },
          weights: {
            type: 'array',
            description: "kind:'nurbs' — optional rational weights, one per control point (same length as controlPoints).",
            items: { type: 'number' },
          },
          knots: {
            type: 'array',
            description: "kind:'nurbs' — optional explicit knot vector; missing => clamped-uniform inferred.",
            items: { type: 'number' },
          },
          closed: { type: 'boolean', description: "kind:'nurbs' — optional periodic/closed-curve flag." },
          a: {
            type: 'object',
            description: "kind:'hermite' — start endpoint.",
            properties: {
              point: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: 'Endpoint position in mm.' },
              tangent: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: 'First derivative of the curve at this endpoint.' },
              curvature: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: 'Optional second derivative; defaults to [0, 0, 0] (G1-only).' },
            },
            required: ['point', 'tangent'],
          },
          b: {
            type: 'object',
            description: "kind:'hermite' — end endpoint.",
            properties: {
              point: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
              tangent: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
              curvature: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
            },
            required: ['point', 'tangent'],
          },
          binding_name: { type: 'string', description: 'JS const name for the new Curve3D binding (default: _curve_<N>).' },
        },
        required: ['kind', 'code'],
        allOf: [
          { if: { properties: { kind: { const: 'nurbs' } } }, then: { required: ['controlPoints'] } },
          { if: { properties: { kind: { const: 'hermite' } } }, then: { required: ['a', 'b'] } },
        ],
      },
    },
    handler: input => addCurveTool(input as unknown as Parameters<typeof addCurveTool>[0]),
  },
  {
    definition: {
      name: 'add_path_segment',
      description:
        "Use this when you need a freeform/organic 2D outline — an eyewear brow, ergonomic grip, sneaker midsole, or body silhouette — by appending a curved segment to an existing PathBuilder chain on the named `chain_anchor` variable. The call is injected at the END of the chain, immediately before any `.close()`. One segment kind, selected by `kind`:\n" +
        "- 'spline' — `.spline(points, opts?)`: interpolates through every `points` waypoint (Vec2[] mm, >= 2 entries; points[0] must match current pen position). Optional `tension`, and `startTangent`/`endTangent` 2D direction vectors that constrain the first-derivative direction at the endpoints (magnitude normalised internally). Use for organic 2D outlines (eyewear brow, ergonomic handle, sneaker midsole).\n" +
        "- 'nurbs' — `.nurbsSegment(controlPoints, opts?)`: explicit B-spline net (Vec2[] mm, >= degree+1 entries; controlPoints[0] must match pen; pen ends at controlPoints[N-1]). Optional `degree` (default 3), rational `weights` (strictly positive), explicit `knots` (length = controlPoints.length + degree + 1).\n" +
        "- 'hermite' — `.hermiteG2(a, b)`: each endpoint `{ point: Vec2, tangent: Vec2, curvature?: Vec2 }` in mm (a.point must match pen; pen ends at b.point). `curvature` defaults to [0,0] (G1); pass matching curvatures for G2 blends. Tangent magnitude is the first derivative (~ chord length), NOT unit length.\n" +
        'Returns the modified code + diagnostics from re-evaluating. Side-effect-free. Each kind fails closed on its own missing required params.',
      inputSchema: {
        type: 'object',
        properties: {
          kind: {
            type: 'string',
            enum: ['spline', 'nurbs', 'hermite'],
            description: 'Which path-segment kind to append.',
          },
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          chain_anchor: { type: 'string', description: 'JS identifier of an existing PathBuilder binding (e.g. `const brow = path().moveTo(0,0)`).' },
          points: {
            type: 'array',
            description: "kind:'spline' — waypoints as Vec2 pairs in mm; at least 2 entries; first must match current pen position.",
            items: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
            minItems: 2,
          },
          tension: { type: 'number', description: "kind:'spline' — optional Catmull-Rom-style stiffness; forwarded to the underlying B-spline approximation." },
          startTangent: {
            type: 'array',
            description: "kind:'spline' — optional [x, y] direction vector at points[0]. Magnitude is normalised internally; direction matters.",
            items: { type: 'number' },
            minItems: 2,
            maxItems: 2,
          },
          endTangent: {
            type: 'array',
            description: "kind:'spline' — optional [x, y] direction vector at points[N-1]. Magnitude is normalised internally; direction matters.",
            items: { type: 'number' },
            minItems: 2,
            maxItems: 2,
          },
          controlPoints: {
            type: 'array',
            description: "kind:'nurbs' — control-net vertices as Vec2 pairs in mm; at least degree+1 entries.",
            items: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
          },
          degree: { type: 'integer', minimum: 1, description: "kind:'nurbs' — B-spline degree (default 3)." },
          weights: {
            type: 'array',
            description: "kind:'nurbs' — optional rational weights (one per control point; strictly positive).",
            items: { type: 'number' },
          },
          knots: {
            type: 'array',
            description: "kind:'nurbs' — optional explicit knot vector; length must equal controlPoints.length + degree + 1.",
            items: { type: 'number' },
          },
          a: {
            type: 'object',
            description: "kind:'hermite' — start endpoint; point must match current pen position within 1e-6 mm.",
            properties: {
              point: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
              tangent: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
              curvature: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
            },
            required: ['point', 'tangent'],
          },
          b: {
            type: 'object',
            description: "kind:'hermite' — end endpoint.",
            properties: {
              point: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
              tangent: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
              curvature: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
            },
            required: ['point', 'tangent'],
          },
          binding_name: { type: 'string', description: 'Reserved for future use; the segment injection mutates the chain anchor in place.' },
        },
        required: ['kind', 'code', 'chain_anchor'],
        allOf: [
          { if: { properties: { kind: { const: 'spline' } } }, then: { required: ['points'] } },
          { if: { properties: { kind: { const: 'nurbs' } } }, then: { required: ['controlPoints'] } },
          { if: { properties: { kind: { const: 'hermite' } } }, then: { required: ['a', 'b'] } },
        ],
      },
    },
    handler: input => addPathSegmentTool(input as unknown as Parameters<typeof addPathSegmentTool>[0]),
  },
  {
    definition: {
      name: 'trace_from_image',
      description:
        "Use this when you need to trace features from a reference photo into waypoints. " +
        "Trace pixel-space features from a reference photo into normalized [0..1] waypoints the agent can map to mm via a known scale anchor and feed to path().spline / path().nurbsSegment. Three backends are dispatched behind the scenes: `opencv` (deterministic; uniform-bg silhouette only), `vision-llm` (Claude vision; named points/cluttered backgrounds; caller-supplied ANTHROPIC_API_KEY), and `hybrid` (opencv silhouette + LLM-labeled named points). Default backend is `auto` — the tool picks based on the image's corner-color stddev. Accuracy honesty: opencv contour is geometrically exact; vision-LLM is typically 5–10% off on dense landmarks. Per-feature `confidence` is reported. Caller pays for any vision-LLM API spend via their own ANTHROPIC_API_KEY. Pair with the `kernelcad-trace-from-image` skill for the conversion-to-mm pipeline.",
      inputSchema: {
        type: 'object',
        properties: {
          imageUrl: {
            type: 'string',
            description: 'URL or path to the reference image. Supports file://, http(s)://, data:image/...;base64,..., or a bare filesystem path.',
          },
          hint: {
            type: 'string',
            description: 'Optional free-text hint forwarded to vision-LLM backends (e.g. "a pair of eyewear; trace the upper brow only").',
          },
          features: {
            type: 'array',
            description: 'Features to trace. Defaults to a single { label: "silhouette", kind: "silhouette" } when omitted.',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string', description: 'Caller-chosen identifier (echoed in the response).' },
                kind: {
                  type: 'string',
                  enum: ['silhouette', 'curve', 'point', 'bbox'],
                  description: 'Geometric shape of the requested feature.',
                },
                region: {
                  type: 'string',
                  description: 'Optional free-text region hint forwarded to vision-LLM backends; ignored by opencv.',
                },
              },
              required: ['label', 'kind'],
            },
          },
          maxWaypointsPerFeature: {
            type: 'integer',
            description: 'Cap on waypoints per feature. Defaults to 12 (suitable for medium-inflection outlines).',
            minimum: 2,
          },
          backend: {
            type: 'string',
            enum: ['opencv', 'vision-llm', 'hybrid', 'auto'],
            description: 'Force a specific backend; default `auto` routes by corner-color stddev.',
          },
        },
        required: ['imageUrl'],
      },
    },
    handler: input => traceFromImageTool(input as unknown as Parameters<typeof traceFromImageTool>[0]),
  },
  {
    definition: {
      name: 'add_variable_sweep',
      description:
        "Use this when you need an organic swept solid whose cross-section changes along its length — a tapering body, horn, bottle, fairing, or duct — authored as a variable-section sweep along a spine. " +
        "Insert a `variableSweep(spine, sections, opts?)` declaration into the user's .kcad.ts immediately before the last top-level return. The result is a Shape — chain `.translate(...)`, `.union(...)`, etc. via `add_feature`. `spine_binding` references an existing variable (Curve3D / Sketch / Vec3[]) in the source; each `sections[i].profile_binding` references an existing Sketch. Sections must be strictly increasing in `t` and span [0, 1]; first t=0, last t=1. Orientation is not exposed by this MCP tool until runtime orientation support is wired. Validates every binding exists in the source via regex before inserting (fast structured error vs capture-time stack). Returns the modified code + diagnostics. Side-effect-free.",
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          spine_binding: { type: 'string', description: 'Existing variable name for a Curve3D / Sketch / Vec3[] declared earlier in the source.' },
          sections: {
            type: 'array',
            description: 'Varying cross-sections along the spine; at least 2 entries, strictly increasing in `t`, first t=0, last t=1.',
            items: {
              type: 'object',
              properties: {
                t: { type: 'number', description: 'Spine parameter in [0, 1].' },
                profile_binding: { type: 'string', description: 'Existing Sketch variable name for this section.' },
              },
              required: ['t', 'profile_binding'],
            },
          },
          closed: { type: 'boolean', description: 'Optional closed-sweep flag.' },
          continuity: { type: 'string', enum: ['C0', 'C1', 'C2'], description: "Inter-section continuity; default 'C1'." },
          binding_name: { type: 'string', description: 'JS const name for the new Shape binding (default: _sweep_<N>).' },
        },
        required: ['code', 'spine_binding', 'sections'],
      },
    },
    handler: input => addVariableSweepTool(input as unknown as Parameters<typeof addVariableSweepTool>[0]),
  },
  {
    definition: {
      name: 'add_text',
      description:
        'Use this when you need to author text into a kernelCAD script before the last top-level return. One authoring path, selected by `mode`:\n' +
        "- 'sketch' — insert a sketch.text(...) call. The emitted sketch is chainable: pair with subsequent .extrude(...) / cut(...) edits to land an engraved or raised text feature.\n" +
        "- 'emboss' — insert a `<shape>.embossText({...})` chained call onto an existing Shape `target`. Use for engraved brand text on faces (Ray-Ban temple, CE mark, model number). `depth > 0` raises text out of the face; `depth < 0` engraves text into the face. Lowers via replicad drawText → sketchOnFace → extrude → fuse|cut.\n" +
        'Default font is the runtime-bundled Liberation Sans. Side-effect-free; returns the modified code plus diagnostics from re-evaluating. Each mode fails closed on its own missing required params.',
      inputSchema: {
        type: 'object',
        properties: {
          mode: {
            type: 'string',
            enum: ['sketch', 'emboss'],
            description: 'Which text-authoring path to use.',
          },
          code:        { type: 'string', description: 'The .kcad.ts source code.' },
          content:     { type: 'string', description: "mode:'sketch' — text content (UTF-8, non-empty, non-whitespace)." },
          size:        { type: 'number', description: "mode:'sketch'|'emboss' — glyph cap height in mm (positive finite)." },
          font:        { type: 'string', description: "mode:'sketch' — optional logical font name or .ttf file path; defaults to bundled Liberation Sans." },
          align:       { type: 'string', enum: ['left', 'center', 'right'], description: "mode:'sketch' — horizontal alignment relative to position (default left); mode:'emboss' — relative to the UV anchor (default center)." },
          position:    { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: "mode:'sketch' — [x, y] anchor in mm. Default [0, 0]." },
          rotation:    { type: 'number', description: "mode:'sketch' — CCW rotation in degrees around position (default 0); mode:'emboss' — CCW rotation in the face tangent plane (default 0)." },
          bindAs:      { type: 'string', description: "mode:'sketch' — emits `const <bindAs> = sketch.text(...)`; mode:'emboss' — emits `const <bindAs> = <target>.embossText(...);`." },
          target:      { type: 'string', description: "mode:'emboss' — variable name of the Shape to chain onto (inserted verbatim)." },
          textContent: { type: 'string', description: "mode:'emboss' — text content (UTF-8, non-empty, non-whitespace)." },
          depth:       { type: 'number', description: "mode:'emboss' — signed extrusion depth in mm: positive emboss out, negative engrave in. Must be non-zero." },
          face:        { type: 'string', description: "mode:'emboss' — target face — canonical name ('top'/'bottom'/'left'/'right'/'front'/'back') or label." },
          fontFamily:  { type: 'string', description: "mode:'emboss' — optional logical font name or .ttf file path; defaults to bundled Liberation Sans." },
          anchorU:     { type: 'number', description: "mode:'emboss' — U anchor in [0, 1] face-local (0=umin, 0.5=centre, 1=umax). Default 0.5." },
          anchorV:     { type: 'number', description: "mode:'emboss' — V anchor in [0, 1] face-local. Default 0.5." },
          scaleMode:   { type: 'string', enum: ['original', 'native', 'bounds'], description: "mode:'emboss' — Drawing.sketchOnFace scaling mode. Default original." },
        },
        required: ['mode', 'code'],
      },
    },
    handler: input => addTextTool(input as unknown as Parameters<typeof addTextTool>[0]),
  },
  {
    definition: {
      name: 'project_curve',
      description: 'Use this when you need to wrap a 2D closed curve onto a 3D face. Insert a `<shape>.projectCurve({ source, face, scaleMode? })` chained call into a kernelCAD script. The `source` is the structured `{ kind: "sketchCommands", commands: [...] }` wire format the runtime API accepts. Wraps the curve onto the face along the face normal; pair with `.extrude(d)` / `.cut(...)` for raised or engraved logos on curved bodies. Open-wire projection (`asEdge: true`) is deferred (BRepProj_Projection not bundled) and is rejected at edit time. Side-effect-free; returns modified code plus diagnostics.',
      inputSchema: {
        type: 'object',
        properties: {
          code:      { type: 'string', description: 'The .kcad.ts source code.' },
          target:    { type: 'string', description: 'Variable name of the Shape to chain onto.' },
          commands:  {
            type: 'array',
            description: 'Closed 2D path to wrap onto the face, as plain-number commands. Must start with a `moveTo` and end with a `close` (e.g. [{kind:"moveTo",x:0,y:0},{kind:"lineTo",x:2,y:0},{kind:"lineTo",x:2,y:2},{kind:"close"}]).',
            items: {
              type: 'object',
              properties: {
                kind: { type: 'string', enum: ['moveTo', 'lineTo', 'close'] },
                x:    { type: 'number' },
                y:    { type: 'number' },
              },
              required: ['kind'],
            },
          },
          face:      { type: 'string', description: 'Target face — canonical name or label.' },
          scaleMode: { type: 'string', enum: ['original', 'native', 'bounds'], description: 'Drawing.sketchOnFace scaling mode. Default original.' },
          asEdge:    { type: 'boolean', description: 'Open-wire (edge) projection. DEFERRED — rejected at edit time (BRepProj_Projection not bundled).' },
          bindAs:    { type: 'string', description: 'Optional local variable name; emits `const <bindAs> = <target>.projectCurve(...);`.' },
        },
        required: ['code', 'target', 'commands', 'face'],
      },
    },
    handler: input => projectCurveTool(input as unknown as Parameters<typeof projectCurveTool>[0]),
  },
  {
    definition: {
      name: 'add_pattern_feature',
      description: "Use this when you need to repeat a feature in a pattern. Insert a Shape.patternLinear / .patternCircular / .patternGrid call into a kernelCAD script before the last top-level return. Pass structured args (kind + the matching spec object). Returns the modified code plus diagnostics from re-evaluating. Side-effect-free. The pattern feature is a single editable unit; pattern-instance face refs resolve via `<sourceId>_pattern_<i>` on the pattern feature's lineage. Geometric note: pattern is implemented as cumulative boolean union of transformed source copies — additive features (boxes, ribs, fins, spokes) pattern cleanly; patterning a subtractive feature (hole, cutout) only preserves the per-instance void when adjacent bodies are disjoint.",
      inputSchema: {
        type: 'object',
        properties: {
          code:      { type: 'string', description: 'The .kcad.ts source code.' },
          target:    { type: 'string', description: 'Variable name of the Shape to pattern (inserted verbatim as the LHS receiver).' },
          kind:      { type: 'string', enum: ['linear', 'circular', 'grid'] },
          linear:    { type: 'object', description: 'Required when kind=linear.', properties: {
            count: { type: 'integer', minimum: 2 },
            direction: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
            spacing: { type: 'number' },
          }, required: ['count', 'direction', 'spacing'] },
          circular:  { type: 'object', description: 'Required when kind=circular.', properties: {
            count: { type: 'integer', minimum: 2 },
            axis: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
            angleDeg: { type: 'number', description: 'Optional; defaults to 360.' },
          }, required: ['count', 'axis'] },
          grid:      { type: 'object', description: 'Required when kind=grid.', properties: {
            x: { type: 'object', description: 'First grid axis.', properties: {
              count: { type: 'integer', minimum: 2 },
              direction: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
              spacing: { type: 'number' },
            }, required: ['count', 'direction', 'spacing'] },
            y: { type: 'object', description: 'Second grid axis.', properties: {
              count: { type: 'integer', minimum: 2 },
              direction: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
              spacing: { type: 'number' },
            }, required: ['count', 'direction', 'spacing'] },
          }, required: ['x', 'y'] },
          assign_to: { type: 'string', description: "Optional const-binding name; emits `const <assign_to> = <target>.patternX(...);`. Omit for statement form." },
        },
        required: ['code', 'target', 'kind'],
        allOf: [
          { if: { properties: { kind: { const: 'linear' } } }, then: { required: ['linear'] } },
          { if: { properties: { kind: { const: 'circular' } } }, then: { required: ['circular'] } },
          { if: { properties: { kind: { const: 'grid' } } }, then: { required: ['grid'] } },
        ],
      },
    },
    handler: input => addPatternFeatureTool(input as unknown as Parameters<typeof addPatternFeatureTool>[0]),
  },
  {
    definition: {
      name: 'remove_feature',
      description: 'Use this when you need to remove a feature line from a script. Remove a single line from a kernelCAD script identified by a substring match. Returns the modified code plus diagnostics from re-evaluating. Refuses to remove the line containing the return statement. Side-effect-free.',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          match: { type: 'string', description: 'A substring that uniquely identifies the line to remove (e.g. `const hole = cylinder(5,`).' },
        },
        required: ['code', 'match'],
      },
    },
    handler: input => removeFeatureTool(input as unknown as Parameters<typeof removeFeatureTool>[0]),
  },
  {
    definition: {
      name: 'query',
      description:
        "Use this when you need to resolve or inspect topology against a script's lowered geometry. " +
        "Selected by `mode` (default 'evaluate'):\n" +
        "- 'evaluate' — inspect a Query (@kc[...] ref, @kcq[...] DSL, or { ast }); returns matched entities. Pass expect:'unique' to assert exactly-one.\n" +
        "- 'resolve' — resolve a single @kc[...] / @kcq[...] ref to one entity ({ ref }).\n" +
        "- 'lineage' — walk the HistoryMap for a named face ref ({ feature_id, ref }).\n" +
        'All params except `mode` are forwarded verbatim.',
      inputSchema: {
        type: 'object',
        properties: {
          mode: { type: 'string', enum: ['evaluate', 'resolve', 'lineage'], description: "Resolution mode (default 'evaluate')." },
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
          query: { description: "mode:'evaluate' — Query input: @kc[...] / @kcq[...] string or { ast } object." },
          ref: { type: 'string', description: "mode:'resolve'|'lineage' — topology ref string." },
          expect: { type: 'string', enum: ['any', 'unique'], description: "mode:'evaluate' — 'unique' asserts exactly-one." },
          feature_id: { type: 'string', description: 'Optional FeatureId; defaults to the last lowered shape (use "auto" for lineage).' },
        },
      },
    },
    handler: input => queryTool(input as unknown as Parameters<typeof queryTool>[0]),
  },
  {
    definition: {
      name: 'lookup_api',
      description:
        'Use this when you need to list the kernelCAD script-runtime surface: global functions (box, path, selectEdges, helix, etc), Shape methods (fillet, sweep, lower, etc), Sketch methods (extrude, revolve, sweep), PathBuilder methods, EdgeQuery/FaceQuery key sets, and featureKindFaceLabels (which globals accept opts.faceLabels and valid value shapes). Use this to discover what is callable from a .kcad.ts script.' +
        ' Call this BEFORE concluding kernelCAD lacks a capability — its NURBS freeform surfacing (loft, sweep, boundary-fill, G2 blend) is easy to miss from tool names alone.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    handler: input => listApiTool(input as Parameters<typeof listApiTool>[0]),
  },
  {
    definition: {
      name: 'lookup_diagnostics',
      description:
        'Use this when you need the kernelCAD 26-code diagnostic catalogue with hint templates. ' +
        'Tiny one-shot call; useful for an agent that wants to pre-populate ' +
        'retry strategies. Hints are also inline on every emitted diagnostic — ' +
        'this tool just gives you the canonical list up front.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    handler: input => listDiagnosticCodesTool(input as Parameters<typeof listDiagnosticCodesTool>[0]),
  },
  {
    definition: {
      name: 'export',
      description:
        'Use this when you need to export geometry to a file. One exporter, selected by `target`:\n' +
        "- target:'model' — export the script geometry to one file. Pass { file | code }, a required { output_path }, and { format }. " +
        'Supported formats: stl (binary STL mesh), step (BREP CAD interchange), dxf (planar laser/waterjet profile from a Region or planar face), ' +
        '3mf (slicer-friendly mesh with per-part colors), glb (web-viewer / AR with PBR materials), ' +
        'svg-drawing (third-angle engineering-drawing sheet: front/top/left + isometric views, hidden edges dashed, tangent edges thin, ' +
        'overall bounding-box dimensions, title block; assemblies are drawn with inter-part occlusion). ' +
        'Robot descriptions: urdf (tree-topology robot description), srdf (motion-planning semantics layered over the URDF), sdf-gazebo (SDFormat 1.10 with native ball joints, closed loops, and solved per-link poses). ' +
        'urdf and sdf-gazebo also write one meshes/<part>.stl per link next to output_path (reported in mesh_files) — ship the whole directory to the consumer. ' +
        'STL exports run a watertight verify by default; failures return ok: false with export.mesh.not-watertight ' +
        '(open-edge count + up to 5 crack-cluster locations) but the file is still written so the broken mesh can be inspected. ' +
        'Optional { feature_id } selects which feature to export (default: last). ' +
        'Optional { options } carries per-format options bag (see the kernelcad-mcp skill for the per-format keys: dxf layers/tolerance/unit, 3mf printUnit/embedSource, glb axis/draco).\n' +
        "- target:'part' — export solved-assembly parts as individual binary STL files in their modeled (world-frame) positions. " +
        'Pass { file | code }, plus { part, output_path } for one part or { output_dir } for all parts ' +
        '(files land at <output_dir>/<part>.stl). A watertight verify runs on every exported mesh by default ' +
        'and fails the call with export.mesh.not-watertight; unknown part names fail with export.part.not-found listing the valid names.\n' +
        'Pass { no_verify: true } to skip the watertight gate. All params except `target` are forwarded verbatim; each target fails closed on its own missing required params.',
      inputSchema: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            enum: ['model', 'part'],
            description: "Which exporter to run: 'model' (whole-script geometry to one file) or 'part' (per-part STLs from a solved assembly).",
          },
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
          output_path: { type: 'string', description: "Destination path. target:'model' — the export file (required). target:'part' — single-part .stl path." },
          format: {
            type: 'string',
            enum: ['stl', 'step', 'dxf', '3mf', 'glb', 'svg-drawing', 'urdf', 'srdf', 'sdf-gazebo'],
            description: "target:'model' — output file format (required for that target).",
          },
          feature_id: { type: 'string', description: "target:'model' — optional FeatureId to export; defaults to last." },
          options: {
            type: 'object',
            description:
              "target:'model' — optional per-format options bag. Discriminator options.format must equal top-level format. " +
              'dxf: { layers?, unit?: "mm"|"cm"|"in", tolerance? }. ' +
              '3mf: { printUnit?: "mm"|"cm"|"in", embedSource? }. ' +
              'glb: { axis?: "y-up"|"z-up", draco?: false }. ' +
              'svg-drawing: { sheet?: "a4"|"a3", modelName?, date? }.',
          },
          part: { type: 'string', description: "target:'part' — part name for single-part export, or 'all'." },
          output_dir: { type: 'string', description: "target:'part' — destination directory (all-parts mode); files are <dir>/<part>.stl." },
          no_verify: { type: 'boolean', description: 'Skip the STL watertight verify gate.', default: false },
        },
        required: ['target'],
      },
    },
    handler: input => exportTool(input as unknown as Parameters<typeof exportTool>[0]),
  },
  {
    definition: {
      name: 'lookup_cookbook',
      description:
        'Use this when you need a canonical pattern snippet for a CAD task. ' +
        'Search the kernelCAD cookbook for canonical pattern snippets. ' +
        'Returns top-k snippets matching the natural-language query, ' +
        'ranked by BM25 over title/tags/keywords/trigger. ' +
        'Use when you need a canonical pattern for fillet-after-subtract, ' +
        'non-overlapping booleans, sketch-to-extrude flows, etc. ' +
        'Returns empty if no snippet scores above the relevance floor — ' +
        'proceed without cookbook help in that case.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Natural-language description of what you want to do (e.g. "round the rim of a hole", "build an L-bracket").',
          },
          k: {
            type: 'number',
            description: 'Max snippets to return. Default 3, max 5.',
            default: 3,
          },
        },
        required: ['query'],
      },
    },
    handler: input => lookupCookbookTool(input as unknown as Parameters<typeof lookupCookbookTool>[0]),
  },
  {
    definition: {
      name: 'find_part',
      description:
        'Use this when you need to find a part in the catalog. ' +
        'Discover bundled (and optionally remote) part-catalog records by fuzzy query and faceted filters. Tokens AND-combine; cross-facet filters AND-combine. Pass partsBaseUrl (or set KERNELCAD_PARTS_BASE_URL) to enable the remote tier; otherwise results are bundled-only.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          category: { type: 'string' },
          family: { type: 'string' },
          standard: { type: 'string' },
          tag: { type: 'string' },
          limit: { type: 'number' },
          source: { type: 'string', enum: ['local', 'remote', 'auto'] },
          partsBaseUrl: { type: 'string', description: 'Opt-in remote endpoint; no default value ships with kernelCAD.' },
        },
      },
    },
    handler: input => findPartTool(input as Parameters<typeof findPartTool>[0]),
  },
  {
    definition: {
      name: 'fetch_part',
      description:
        'Use this when you need to download a catalog part as a STEP file. ' +
        'Resolve an id (or single-match query) to a part record and write its STEP file to the local cache. Bundled ids resolve offline; non-bundled ids require partsBaseUrl (or KERNELCAD_PARTS_BASE_URL). Returns the cache path plus a sha256 fingerprint.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          query: { type: 'string' },
          category: { type: 'string' },
          family: { type: 'string' },
          standard: { type: 'string' },
          partsBaseUrl: { type: 'string', description: 'Opt-in remote endpoint; no default value ships with kernelCAD.' },
        },
      },
    },
    handler: input => fetchPartTool(input as Parameters<typeof fetchPartTool>[0]),
  },
  {
    definition: {
      name: 'solve_sketch',
      description:
        'Use this when you need to solve a 2D sketch constraint set. ' +
        'Solve a 2D sketch constraint set. Side-effect-free: pass { entities, constraints } and receive solved entities plus the original constraints. Entities are POINT, LINE, and CIRCLE records; constraints use the kernelCAD constraint vocabulary.',
      inputSchema: {
        type: 'object',
        properties: {
          entities: {
            type: 'array',
            description: 'Sketch entities to solve. Lines reference point ids; circles reference a center point id.',
            items: {
              oneOf: [
                { type: 'object', description: 'POINT — a 2D point.', properties: {
                  id: { type: 'string' }, type: { type: 'string', enum: ['POINT'] },
                  x: { type: 'number' }, y: { type: 'number' },
                  fixed: { type: 'boolean', description: "If true, the solver won't move this point." },
                }, required: ['id', 'type', 'x', 'y'] },
                { type: 'object', description: 'LINE — references two point ids.', properties: {
                  id: { type: 'string' }, type: { type: 'string', enum: ['LINE'] },
                  p1: { type: 'string' }, p2: { type: 'string' },
                }, required: ['id', 'type', 'p1', 'p2'] },
                { type: 'object', description: 'CIRCLE — references a center point id.', properties: {
                  id: { type: 'string' }, type: { type: 'string', enum: ['CIRCLE'] },
                  center: { type: 'string' }, radius: { type: 'number' },
                }, required: ['id', 'type', 'center', 'radius'] },
              ],
            },
          },
          constraints: {
            type: 'array',
            description: 'Constraints to apply to the entities.',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { type: 'string', enum: ['COINCIDENT', 'DISTANCE', 'HORIZONTAL', 'VERTICAL', 'PARALLEL', 'PERPENDICULAR', 'EQUAL_LENGTH', 'TANGENT', 'RADIUS', 'ANGLE', 'CONCENTRIC', 'SYMMETRIC'] },
                entities: { type: 'array', items: { type: 'string' }, description: 'Ids of the entities the constraint relates.' },
                value: { type: 'number', description: 'Required for DISTANCE, RADIUS, and ANGLE.' },
              },
              required: ['id', 'type', 'entities'],
            },
          },
        },
        required: ['entities', 'constraints'],
      },
    },
    handler: input => solveSketchTool(input as unknown as Parameters<typeof solveSketchTool>[0]),
  },
  {
    definition: {
      name: 'add_constraint',
      description:
        'Use this when you need to add a sketch constraint to a list. ' +
        'Append one validated sketch constraint to a constraint list. Side-effect-free: pass { constraints, constraint } and receive the updated list.',
      inputSchema: {
        type: 'object',
        properties: {
          constraints: {
            type: 'array',
            description: 'Existing constraint list to append to (omit for an empty list).',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { type: 'string', enum: ['COINCIDENT', 'DISTANCE', 'HORIZONTAL', 'VERTICAL', 'PARALLEL', 'PERPENDICULAR', 'EQUAL_LENGTH', 'TANGENT', 'RADIUS', 'ANGLE', 'CONCENTRIC', 'SYMMETRIC'] },
                entities: { type: 'array', items: { type: 'string' } },
                value: { type: 'number' },
              },
              required: ['id', 'type', 'entities'],
            },
          },
          constraint: {
            type: 'object',
            description: 'The constraint to append.',
            properties: {
              id: { type: 'string' },
              type: { type: 'string', enum: ['COINCIDENT', 'DISTANCE', 'HORIZONTAL', 'VERTICAL', 'PARALLEL', 'PERPENDICULAR', 'EQUAL_LENGTH', 'TANGENT', 'RADIUS', 'ANGLE', 'CONCENTRIC', 'SYMMETRIC'] },
              entities: { type: 'array', items: { type: 'string' }, description: 'Ids of the entities the constraint relates.' },
              value: { type: 'number', description: 'Required for DISTANCE, RADIUS, and ANGLE.' },
            },
            required: ['id', 'type', 'entities'],
          },
        },
        required: ['constraint'],
      },
    },
    handler: input => addConstraintTool(input as unknown as Parameters<typeof addConstraintTool>[0]),
  },
  {
    definition: {
      name: 'add_part',
      description:
        'Use this when you need to add a part to an assembly. Durably insert `const <binding> = <assembly>.part(partName, shapeExpression, opts?)` before the final top-level return in a kernelCAD source string. Returns modified source plus diagnostics from re-evaluating it. Side-effect-free: caller persists the returned source.',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          assembly_binding: { type: 'string', description: 'JS identifier bound to assembly(...), e.g. "arm".' },
          part_name: { type: 'string', description: 'Assembly-unique part name.' },
          shape_expression: { type: 'string', description: 'JS expression for the Shape to pass to assembly.part, inserted verbatim.' },
          binding_name: { type: 'string', description: 'Optional JS const name for the returned AssemblyPartRef. Defaults to a part-name-derived identifier.' },
          at: { type: 'array', items: { type: 'number' }, description: 'Optional [x, y, z] assembly placement.' },
        },
        required: ['code', 'assembly_binding', 'part_name', 'shape_expression'],
      },
    },
    handler: input => addAssemblyPartSourceTool(input as unknown as Parameters<typeof addAssemblyPartSourceTool>[0]),
  },
  {
    definition: {
      name: 'add_connector',
      description:
        'Use this when you need to add a mate connector to a part. Durably insert `<partBinding>.connector(name, { type, origin, axis?, normal? })` before the final top-level return. Use the part binding returned by add_part. Returns modified source plus diagnostics from re-evaluation. Side-effect-free.',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          part_binding: { type: 'string', description: 'JS identifier bound to an AssemblyPartRef, e.g. "basePart".' },
          name: { type: 'string', description: 'Connector name unique within the part.' },
          type: { type: 'string', enum: ['frame', 'axis', 'planar', 'ball'] },
          origin: {
            description: 'Origin as [x, y, z] shorthand, or a structured ConnectorOrigin.',
            oneOf: [
              { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: '[x, y, z] shorthand.' },
              { type: 'object', description: 'Explicit numeric origin.', properties: {
                kind: { type: 'string', enum: ['vec3'] },
                value: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
              }, required: ['kind', 'value'] },
              { type: 'object', description: 'Topology-derived origin.', properties: {
                kind: { type: 'string', enum: ['topology'] },
                query: { type: 'object', properties: {
                  kind: { type: 'string', enum: ['face-center', 'face-normal', 'vertex', 'edge-axis'] },
                  name: { type: 'string' },
                }, required: ['kind', 'name'] },
              }, required: ['kind', 'query'] },
            ],
          },
          axis: { type: 'array', items: { type: 'number' }, description: 'Optional [x, y, z] axis.' },
          normal: { type: 'array', items: { type: 'number' }, description: 'Optional [x, y, z] normal.' },
        },
        required: ['code', 'part_binding', 'name', 'type', 'origin'],
      },
    },
    handler: input => addPartConnectorSourceTool(input as unknown as Parameters<typeof addPartConnectorSourceTool>[0]),
  },
  {
    definition: {
      name: 'add_mate',
      description:
        "Use this when you need to author a mate-graph relationship into the source, selected by `relation` (default 'mate'):\n" +
        "- 'mate' — a typed mate between two connectors ({ name, a, b, type, pose?, limitsDeg?, limitsMm? }).\n" +
        "- 'coupling' — couple a driven mate to a source mate by ratio ({ driven, source, ratio, offset? }).\n" +
        "- 'transmission' — a physical drive path across mates ({ name, kind, sourceMate, drivenMates, path, ... }).\n" +
        'All durably edit source and need { code, assembly_binding }. Params other than `relation` are forwarded verbatim; each relation fails closed on its own missing required params.',
      inputSchema: {
        type: 'object',
        properties: {
          relation: { type: 'string', enum: ['mate', 'coupling', 'transmission'], description: "Which relationship to author (default 'mate')." },
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          assembly_binding: { type: 'string', description: 'JS identifier bound to assembly(...).' },
          name: { type: 'string', description: "relation:'mate'|'transmission' — name unique within the assembly." },
          a: { type: 'string', description: "relation:'mate' — connector ref \"<partName>.<connectorName>\"." },
          b: { type: 'string', description: "relation:'mate' — connector ref \"<partName>.<connectorName>\"." },
          type: { type: 'string', enum: ['fastened', 'revolute', 'prismatic', 'cylindrical', 'planar', 'ball', 'pin_slot'], description: "relation:'mate' — mate type." },
          pose: { description: "relation:'mate' — optional mate pose." },
          limitsDeg: { type: 'array', items: { type: 'number' }, description: "relation:'mate' — optional [minDeg, maxDeg]." },
          limitsMm: { type: 'array', items: { type: 'number' }, description: "relation:'mate' — optional [minMm, maxMm]." },
          driven: { type: 'string', description: "relation:'coupling' — driven mate name." },
          source: { type: 'string', description: "relation:'coupling' — source mate name." },
          ratio: { type: 'number', description: "relation:'coupling' — driven pose = source pose * ratio + offset." },
          offset: { type: 'number', description: "relation:'coupling' — optional pose offset." },
          kind: { type: 'string', enum: ['direct-horn', 'link-rod', 'four-bar', 'gear-pair', 'belt', 'tendon'], description: "relation:'transmission' — transmission kind." },
          sourceMate: { type: 'string', description: "relation:'transmission' — source mate name." },
          drivenMates: { type: 'array', items: { type: 'string' }, description: "relation:'transmission' — driven mate names." },
          actuator: { type: 'string', description: "relation:'transmission' — optional actuator." },
          input: { type: 'string', description: "relation:'transmission' — optional input." },
          output: { type: 'string', description: "relation:'transmission' — optional output." },
          path: { type: 'array', items: { type: 'string' }, description: "relation:'transmission' — drive path." },
          notes: { type: 'string', description: "relation:'transmission' — optional notes." },
        },
        required: ['code', 'assembly_binding'],
        allOf: [
          { if: { properties: { relation: { const: 'coupling' } }, required: ['relation'] }, then: { required: ['driven', 'source', 'ratio'] } },
          { if: { properties: { relation: { const: 'transmission' } }, required: ['relation'] }, then: { required: ['name', 'kind', 'sourceMate', 'drivenMates', 'path'] } },
          { if: { properties: { relation: { enum: ['coupling', 'transmission'] } }, required: ['relation'] }, then: {}, else: { required: ['name', 'a', 'b', 'type'] } },
        ],
      },
    },
    handler: input => addMateAuthoringTool(input as unknown as Parameters<typeof addMateAuthoringTool>[0]),
  },
  {
    definition: {
      name: 'add_workspace_target',
      description:
        'Use this when you need to declare a reachability target for a connector. Durably insert `<assembly>.workspace(connectorRef, { reachable, toleranceMm? })` before the final top-level return. Workspace targets are checked by solvedModel validation/review pose-envelope gates. Returns modified source plus diagnostics from re-evaluation.',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          assembly_binding: { type: 'string', description: 'JS identifier bound to assembly(...).' },
          connector_ref: { type: 'string', description: 'Connector ref "<partName>.<connectorName>".' },
          reachable: {
            type: 'array',
            description: 'World-frame Vec3 targets the connector must be able to reach.',
            items: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
          },
          toleranceMm: { type: 'number', description: 'Optional non-negative tolerance in mm.' },
        },
        required: ['code', 'assembly_binding', 'connector_ref', 'reachable'],
      },
    },
    handler: input => addWorkspaceTargetSourceTool(input as unknown as Parameters<typeof addWorkspaceTargetSourceTool>[0]),
  },
  {
    definition: {
      name: 'set_scene_return',
      description:
        'Use this when you need to set how the script returns its assembly. Replace the final top-level return statement with `return <assembly>.model();` or `return <assembly>.solvedModel(poses, options?);`. Use solvedModel for mate-authored mechanisms so FK and validation run. Returns modified source plus diagnostics from re-evaluation.',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          assembly_binding: { type: 'string', description: 'JS identifier bound to assembly(...).' },
          mode: { type: 'string', enum: ['model', 'solvedModel'] },
          poses: { type: 'object', description: 'Optional solvedModel pose overrides keyed by mate name. Defaults to {}.' },
          options: { type: 'object', description: "Optional solvedModel options such as { validate: 'warn', posesGate: 'envelope' }." },
        },
        required: ['code', 'assembly_binding', 'mode'],
      },
    },
    handler: input => setSceneReturnSourceTool(input as unknown as Parameters<typeof setSceneReturnSourceTool>[0]),
  },
  {
    definition: {
      name: 'solve_mates',
      description: 'Use this when you need to solve the mate graph and get part poses. Run the v0.6 mate-graph solver on the active assembly. Returns { status, poses, iterations? } where each pose is a serialized Transform ({ translation, rotateAxis, rotateDeg }). Optional poses overrides mate pose values by mate name.',
      inputSchema: {
        type: 'object',
        properties: {
          assembly: { type: 'string' },
          poses: { type: 'object', description: 'Optional numeric pose overrides keyed by mate name.' },
        },
      },
    },
    handler: input => solveMatesTool(input as unknown as Parameters<typeof solveMatesTool>[0]),
  },
  {
    definition: {
      name: 'review_cad',
      description: 'Use this when you need to review a mechanism for fitness and repair mode. Run the deterministic CAD review loop: evaluate the script, validate the assembly/mate graph, check mate connectors touch modeled material, sample declared mate limits, optionally check interferences at sampled poses, report connector workspace bounds, and return a mechanism fitness verdict for agent self-review. Fitness includes repairMode: none, local-fix, parameter-tune, or topology-redesign.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
          assembly: { type: 'string', description: 'Assembly name; defaults to the first captured assembly.' },
          designGoal: { type: 'string', description: 'Original user design prompt or goal. Included in suggestedRepairPrompt so topology-redesign repairs restart from the intended physical design instead of local coordinate nudges.' },
          preserveInterfaces: {
            type: 'array',
            description: 'External mates, connector refs, part names, or behavioral interfaces the repair agent must preserve during redesign.',
            items: { type: 'string' },
          },
          includePoseEnvelope: { type: 'boolean', description: 'Whether to sample declared mate limits. Default true.' },
          includeInterference: { type: 'boolean', description: 'Whether sampled poses run BREP interference checks. Default true.' },
          samplesPerMate: {
            type: 'integer',
            minimum: 1,
            description: 'Pose-envelope samples per declared-limit mate. 1 (default) = corners only; >=3 adds uniform interior points between min and max. Total samples per non-locked mate = samplesPerMate.',
          },
          combinatorial: {
            type: 'boolean',
            description: 'Sample all 2^N limit-corner combinations across mates with declared limits. Capped at 8 mates with limits; combine with samplesPerMate for both interior coverage and worst-pose detection. Default false.',
          },
          epsilonMm3: { type: 'number', description: 'Interference volume threshold in mm^3. Default 0.01.' },
          trackConnectors: {
            type: 'array',
            description: 'Optional connector refs such as ["gripper-plate.tool-tip"] to limit connector workspace reporting.',
            items: { type: 'string' },
          },
          gripperAperture: {
            type: 'object',
            description: 'Optional fingertip connector refs for gripper aperture travel reporting.',
            properties: {
              left: { type: 'string', description: 'Left fingertip connector ref such as "left-finger.tip".' },
              right: { type: 'string', description: 'Right fingertip connector ref such as "right-finger.tip".' },
            },
          },
        },
      },
    },
    handler: input => reviewCadTool(input as unknown as Parameters<typeof reviewCadTool>[0]),
  },
  {
    definition: {
      name: 'review_paint_peek_latest',
      description:
        'Use this when you need to see the latest region the user painted in Studio. ' +
        'Return the newest inpainting-style review packet the user painted in Studio. ' +
        'Studio writes packets to <scriptPath>.review-paint/latest/ as the user marks regions ' +
        'over the 3D viewport; this tool scans the known kernelCAD-web checkouts and returns the ' +
        'freshest one within a configurable freshness window (default 30 minutes). Returns base64 ' +
        'PNGs of the screenshot + mask in-band so any MCP client can see the marked regions ' +
        'without local-disk Read access. The packet also carries the user\'s intent — an optional ' +
        'one-line note and preset tags (e.g. "too thick", "missing", "wrong angle") describing ' +
        'WHAT is wrong, not just where. Call this whenever the user says "look at my mark", ' +
        '"check what I painted", or any equivalent.',
      inputSchema: {
        type: 'object',
        properties: {
          freshness_sec: {
            type: 'integer',
            description: 'Maximum packet age in seconds. Default 1800 (30 min). Use a smaller value for "what did I just paint" or a larger one for "earlier today".',
            minimum: 1,
          },
          extra_roots: {
            type: 'array',
            description: 'Optional extra checkout paths to scan (in addition to ~/projects/kernelCAD-web and ~/projects/kernelCAD-web-worktrees). Use when Studio is hosted from a non-standard location.',
            items: { type: 'string' },
          },
          paths_only: {
            type: 'boolean',
            description: 'When true, omit base64 PNG fields and return only paths + metadata. Smaller response when the agent will Read the PNGs from disk anyway, or just wants to know "is there a packet".',
          },
        },
      },
    },
    handler: input => reviewPaintPeekLatestTool(input as Parameters<typeof reviewPaintPeekLatestTool>[0]),
  },
  {
    definition: {
      name: 'design_loop',
      description: 'Use this when you need to run a CAD design loop over multiple attempts. Run an agent CAD design loop over one or more attempt scripts: review each attempt with review_cad, continue past functional attempts that still have unresolved review warnings, return structured repair prompts, and optionally write a Studio-compatible build record JSON for visual replay.',
      inputSchema: {
        type: 'object',
        properties: {
          goal: { type: 'string', description: 'Original user design goal. Fed into every review_cad repair prompt.' },
          attempts: {
            type: 'array',
            description: 'Ordered design attempts. Each item is { id?, title?, file? or code?, visualReview? }. File attempts can be replayed by Studio build records.',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                file: { type: 'string' },
                code: { type: 'string' },
                visualReview: {
                  type: 'object',
                  description: 'Evidence from the reviewing agent after rendering/opening screenshots. Accepted reviews must include screenshotPath, concrete findings, and all required checks passing.',
                  properties: {
                    accepted: { type: 'boolean' },
                    screenshotPath: { type: 'string' },
                    findings: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    checks: {
                      type: 'array',
                      description: 'Required checklist entries: main-object-count, proportions-match-reference, required-visible-features, no-stray-or-floating-geometry, attachment-plausibility, semantic-orientation-alignment, device-depth-and-construction, canonical-views-physically-coherent.',
                      items: {
                        type: 'object',
                        properties: {
                          code: { type: 'string' },
                          passed: { type: 'boolean' },
                          finding: { type: 'string' },
                          screenshotPath: { type: 'string' },
                        },
                        required: ['code', 'passed', 'finding'],
                      },
                    },
                  },
                  required: ['accepted', 'findings'],
                },
              },
            },
          },
          assembly: { type: 'string' },
          preserveInterfaces: {
            type: 'array',
            items: { type: 'string' },
            description: 'External mates, connector refs, part names, or behavioral interfaces the agent must preserve between attempts.',
          },
          includePoseEnvelope: { type: 'boolean', description: 'Forwarded to review_cad. Default true.' },
          includeInterference: { type: 'boolean', description: 'Forwarded to review_cad. Default true.' },
          samplesPerMate: {
            type: 'integer',
            minimum: 1,
            description: 'Pose-envelope samples per declared-limit mate. 1 (default) = corners only; >=3 adds uniform interior points between min and max. Total samples per non-locked mate = samplesPerMate.',
          },
          combinatorial: {
            type: 'boolean',
            description: 'Sample all 2^N limit-corner combinations across mates with declared limits. Capped at 8 mates with limits; combine with samplesPerMate for both interior coverage and worst-pose detection. Default false.',
          },
          epsilonMm3: { type: 'number', description: 'Forwarded to review_cad.' },
          trackConnectors: {
            type: 'array',
            items: { type: 'string' },
            description: 'Connector refs to track across sampled poses.',
          },
          gripperAperture: { type: 'object', description: 'Optional gripper aperture request forwarded to review_cad.' },
          stopOnPass: { type: 'boolean', description: 'Stop after the first attempt that is functional and passes the quality gate. Default true.' },
          requireVisualReview: { type: 'boolean', description: 'Require screenshot-backed visualReview with structured checks before accepting an attempt. Default true; set false only for explicit non-visual batch checks.' },
          allowReviewWarnings: {
            type: 'array',
            items: { type: 'string' },
            description: 'Warning diagnostic codes the original prompt explicitly allows. Other review warnings keep the loop iterating even if review_cad is functionally ok.',
          },
          outputRecordPath: { type: 'string', description: 'Optional JSON path to write a Studio-compatible build record.' },
          recordTitle: { type: 'string', description: 'Optional title for the build record.' },
        },
        required: ['goal', 'attempts'],
      },
    },
    handler: input => designLoopTool(input as unknown as Parameters<typeof designLoopTool>[0]),
  },
  {
    definition: {
      name: 'flatten_pattern',
      description:
        'Use this when you need the unfolded flat pattern of a bent sheet-metal part. ' +
        'Return the unfolded 2D flat-pattern of a bent sheet-metal Shape as a Region ' +
        '(outer polyline + holes + bend lines + sketch plane). Slice 1: at most 2 bends. ' +
        'Pass { file } or { code }; optional { featureId } to pick a specific Shape.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          code: { type: 'string' },
          featureId: { type: 'string' },
        },
      },
    },
    handler: input => flattenPatternTool(input as unknown as Parameters<typeof flattenPatternTool>[0]) as Promise<unknown>,
  },
  {
    definition: {
      name: 'evaluate_sdf',
      description:
        'Use this when you need to sample a signed-distance field at a point. ' +
        'Sample the signed distance from an in-script sdf.* field at a 3D point. ' +
        'Returns { distance, inside, aabb, kind }. Distance is in mm; negative = inside the surface, ' +
        '0 = exactly on the surface, positive = outside. Use this to verify SDF composition before ' +
        'calling sdf.materialize (which is the expensive step). The script must bind the SdfField via ' +
        "sdf.bind('<name>', field) and pass that name as fieldName. " +
        'Hint: pass either { file } or { code }, plus { fieldName, point: [x,y,z] }.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
          fieldName: { type: 'string', description: "sdf.bind binding name holding the SdfField." },
          point: {
            type: 'array',
            items: { type: 'number' },
            minItems: 3,
            maxItems: 3,
            description: 'Sample point [x, y, z] in mm.',
          },
        },
        required: ['fieldName', 'point'],
      },
    },
    handler: input => evaluateSdfTool(input as unknown as Parameters<typeof evaluateSdfTool>[0]),
  },
  {
    definition: {
      name: 'capture_animation',
      description:
        "Use this when you need to render a script's animation timeline to a video. " +
        "Capture a kernelCAD script's animationView({...}) timeline to an MP4 (ffmpeg) or a PNG frame sequence, " +
        'verifying the sampled poses for part interference. FILE ONLY: pass { file } (a .kcad.ts path) — there is no ' +
        '{ code } mode, because the capture engine renders from a file on disk (its relative lib.fromSTEP imports resolve ' +
        'against the script directory). MP4 by default; pass { frames_dir } to write frame-0000.png... and skip ffmpeg ' +
        'entirely (mutually exclusive with output_path). Animation-pose interference verification runs by default ' +
        '(keyframe times + segment midpoints) BEFORE any browser/ffmpeg cost; { no_verify: true } skips it and ' +
        '{ verify_every: n } additionally samples every n-th frame time. Pass { focus } or { hide } (arrays of feature ids ' +
        'or assembly part names, mutually exclusive) to isolate parts in the rendered frames — same semantics as ' +
        '`kernelcad render --focus/--hide`; visibility is render-only and does NOT affect the pose verification. ' +
        'Collisions DO NOT fail the call — the artifact ' +
        'is still written as evidence with ok: true; read verified: false + the collisions[] array. ' +
        'ENVIRONMENT REQUIREMENT (identical to `kernelcad render`): capture drives a headless browser against a running ' +
        'studio dev server reachable at http://localhost:5173 (or the VITE_PORT override); there is no bundled-static ' +
        'serving mode yet, so the same dev-server precondition applies in a production MCP install. ' +
        'Returns { ok, output_path, frame_count, duration_ms, fps, verified, verify_skipped?, collisions: [{ t_ms, a, b, volume_mm3 }], diagnostics }.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts script with an animationView({...}) record. Required (no inline { code } mode).' },
          output_path: { type: 'string', description: 'MP4 output path; default <scriptDir>/<basename>-animation.mp4. Mutually exclusive with frames_dir.' },
          frames_dir: { type: 'string', description: 'PNG-sequence mode directory: write frame-0000.png... and skip ffmpeg. Mutually exclusive with output_path.' },
          fps: { type: 'number', description: "Override the animationView record's fps." },
          no_verify: { type: 'boolean', description: 'Skip the animation-pose interference verification (default: verify on).', default: false },
          verify_every: { type: 'integer', minimum: 1, description: 'Additionally verify at every n-th frame time of the fps schedule (unioned with the keyframe sample set).' },
          focus: { type: 'array', items: { type: 'string' }, description: 'Show only matching feature ids / assembly part names in the rendered frames. Mutually exclusive with hide. Render-only; does not affect pose verification.' },
          hide: { type: 'array', items: { type: 'string' }, description: 'Hide matching feature ids / assembly part names in the rendered frames. Mutually exclusive with focus. Render-only; does not affect pose verification.' },
        },
        required: ['file'],
      },
    },
    handler: input => captureAnimationTool(input as Parameters<typeof captureAnimationTool>[0]),
  },
  {
    definition: {
      name: 'render_preview',
      description:
        'Use this when you need to LOOK at a kernelCAD model — render its script to deterministic PNG views ' +
        'for visual self-check (the visual half of the evaluate → render → inspect → fix loop), with NO studio or ' +
        'dev server required. Pass { code } (inline source) or { file } (a .kcad.ts path), exactly one. ' +
        'Renders the canonical engineering views (front, right, top, iso — pass { views } for a subset, e.g. ["iso"] for ' +
        'fastest iteration) plus an optional { pose: "<az>,<el>" } arbitrary camera angle (degrees; az=0,el=0 is front, ' +
        '+az rotates CCW around +Z, +el lifts the camera). NO STUDIO / DEV-SERVER REQUIRED: a prebuilt static player ' +
        '(dist/headless-player) is served from an ephemeral local port automatically; a running studio dev server is used ' +
        'as fallback, and { base_url } forces one. The only environment dependency is playwright chromium ' +
        '(npx playwright install chromium). Pass { focus } or { hide } (arrays of feature ids or assembly part names, ' +
        'mutually exclusive) to isolate parts — same semantics as `kernelcad render --focus/--hide`. Pass ' +
        '{ section: { axis, position, flip? } } to cut a cross-section and inspect INTERIOR geometry (wall thickness, ' +
        'internal pockets, whether a bore runs through) rather than only the outer shell. PNGs are written to ' +
        '{ out_dir } (default: a fresh temp session directory) and returned as absolute paths with per-view camera ' +
        'descriptions (kernelCAD is Z-up). Mechanism truth runs first, same protocol as `kernelcad render`: a broken ' +
        'mechanism still renders but every tile is watermarked MECHANISM BROKEN (KERNELCAD_RENDER_STRICT=1 refuses ' +
        'instead); read { mechanism, mechanism_failure_codes }. The probe runs full BREP interference sweeps and can ' +
        'dominate latency on large assemblies — pass { no_mechanism_check: true } for fast iteration (the preview then ' +
        'reports mechanism: "unverified"; ignored under strict mode). Returns { ok, images: [{ name, path, description }], ' +
        'out_dir, bounds, mechanism, render_source, render_ms, diagnostics }. PATHS ARE LOCAL to the machine running the ' +
        'MCP server — local stdio clients read them directly; hosted/remote clients should use open_in_studio instead.',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Inline kernelCAD script source. Mutually exclusive with file. Relative imports resolve against a temp dir — use file for scripts with relative lib.fromSTEP(...) imports.' },
          file: { type: 'string', description: 'Path to a .kcad.ts script on disk. Mutually exclusive with code.' },
          views: { type: 'array', items: { type: 'string', enum: ['front', 'right', 'top', 'iso'] }, description: 'Canonical views to render (default: all four). Fewer views = faster.' },
          pose: { type: 'string', description: "Extra arbitrary camera pose '<az>,<el>' in degrees, e.g. '30,20'." },
          focus: { type: 'array', items: { type: 'string' }, description: 'Show only matching feature ids / assembly part names. Mutually exclusive with hide.' },
          hide: { type: 'array', items: { type: 'string' }, description: 'Hide matching feature ids / assembly part names. Mutually exclusive with focus.' },
          out_dir: { type: 'string', description: 'Directory for the PNGs (created if missing). Default: a fresh temp session dir.' },
          width: { type: 'integer', minimum: 64, maximum: 2048, description: 'Per-view tile width in px (default 768).' },
          height: { type: 'integer', minimum: 64, maximum: 2048, description: 'Per-view tile height in px (default 768).' },
          environment: { type: 'string', description: "HDRI environment override: preset ('studio', 'softbox', 'neutral', 'outdoor', 'warehouse'), a URL, or 'none' for the default three-light rig." },
          no_watermark: { type: 'boolean', description: 'Suppress the kernelCAD version watermark.', default: false },
          no_mechanism_check: { type: 'boolean', description: "Skip the mechanism-truth probe for fast iteration on large assemblies; the preview reports mechanism: 'unverified'. Ignored under KERNELCAD_RENDER_STRICT=1.", default: false },
          base_url: { type: 'string', description: 'Advanced: force a specific render server (e.g. a running studio dev server) instead of the bundled static player.' },
          section: {
            type: 'object',
            description: "Cut the model with one axis-aligned section plane to inspect INTERIOR structure (wall thickness, internal pockets, whether a bore runs through) instead of only the outer shell. position is in mm along the axis (kernelCAD Z-up frame); flip keeps the +axis side (default keeps the -axis side).",
            properties: {
              axis: { type: 'string', enum: ['x', 'y', 'z'] },
              position: { type: 'number' },
              flip: { type: 'boolean', default: false },
            },
            required: ['axis', 'position'],
            additionalProperties: false,
          },
        },
      },
    },
    handler: input => renderPreviewTool(input as Parameters<typeof renderPreviewTool>[0]),
  },
];

/** Merge the central MCP metadata maps onto a definition: behavioral hints
 *  (TOOL_ANNOTATIONS) and the structured-output schema (TOOL_OUTPUT_SCHEMAS).
 *  Both live in one central map each so the surface is classified in a single
 *  place and the consistency gate can enforce coverage. */
function withMetadata(def: McpToolDefinition): McpToolDefinition {
  const annotations = TOOL_ANNOTATIONS[def.name];
  const outputSchema = TOOL_OUTPUT_SCHEMAS[def.name];
  return {
    ...def,
    ...(annotations ? { annotations } : {}),
    ...(outputSchema ? { outputSchema } : {}),
  };
}

const toolHandlers = new Map(TOOL_REGISTRY.map(entry => [entry.definition.name, entry.handler]));
const toolDefinitions = new Map(
  TOOL_REGISTRY.map(entry => [entry.definition.name, withMetadata(entry.definition)]),
);

/**
 * Flat array of all tool definitions (with behavioral annotations + output schemas), in registry order.
 *
 * Public contract — depended on by kernelCAD-server.
 */
export const TOOLS = TOOL_REGISTRY.map(entry => withMetadata(entry.definition));

/**
 * Dispatch an MCP tool call by name. Transport-agnostic: used by stdio MCP server,
 * remote MCP gateway (kernelCAD-server), and the server-side agent orchestrator.
 *
 * Public contract — depended on by kernelCAD-server. Do NOT remove or change the
 * signature without bumping the consumer SHA explicitly.
 *
 * @param name - The MCP tool name
 * @param input - The tool's input arguments (validated against inputSchema by the handler)
 * @returns The tool's result (shape varies per tool — see individual tool files)
 * @throws Error if `name` does not match any registered tool
 */
export async function callMcpTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  const handler = toolHandlers.get(name);
  if (!handler) throw new Error(`Unknown tool: ${name}`);
  return handler(input);
}

/**
 * Look up a tool's MCP definition by name.
 *
 * Public contract — depended on by kernelCAD-server (vendor/kernelcad/ submodule).
 * Do NOT remove or change the signature without bumping the consumer SHA explicitly.
 *
 * @param name - The MCP tool name (e.g. 'evaluate_script')
 * @returns The McpToolDefinition, or undefined if no tool by that name exists
 */
export function getToolDefinition(name: string): McpToolDefinition | undefined {
  return toolDefinitions.get(name);
}
