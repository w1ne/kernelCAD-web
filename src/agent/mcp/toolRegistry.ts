// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { addConnectorTool } from './tools/addConnector';
import { addConstraintTool, listConstraintsTool, solveSketchTool } from './tools/constraints';
import { addFeatureTool } from './tools/addFeature';
import { addHermiteG2Tool } from './tools/addHermiteG2';
import { addNurbsCurveTool } from './tools/addNurbsCurve';
import { addNurbsSurfaceTool } from './tools/addNurbsSurface';
import { addPathHermiteG2Tool } from './tools/addPathHermiteG2';
import { addPathNurbsSegmentTool } from './tools/addPathNurbsSegment';
import { addPathSplineTool } from './tools/addPathSpline';
import { traceFromImageTool } from './tools/traceFromImage';
import { addSurfaceFromBoundaryTool } from './tools/addSurfaceFromBoundary';
import { addPatternFeatureTool } from './tools/addPatternFeature';
import { addVariableSweepTool } from './tools/addVariableSweep';
import { addSketchTextTool } from './tools/addSketchText';
import { embossTextTool } from './tools/embossText';
import { projectCurveTool } from './tools/projectCurve';
import { addAssemblyPartSourceTool } from './tools/addAssemblyPartSource';
import { addPartConnectorSourceTool } from './tools/addPartConnectorSource';
import { addMateSourceTool } from './tools/addMateSource';
import { addMateCouplingSourceTool } from './tools/addMateCouplingSource';
import { addTransmissionSourceTool } from './tools/addTransmissionSource';
import { addWorkspaceTargetSourceTool } from './tools/addWorkspaceTargetSource';
import { setSceneReturnSourceTool } from './tools/setSceneReturnSource';
import { addMateTool } from './tools/addMate';
import { evaluateScriptTool } from './tools/evaluateScript';
import { diffScriptsTool } from './tools/diffScripts';
import { evaluateSdfTool } from './tools/evaluateSdf';
import { exportModelTool } from './tools/exportModel';
import { exportPartTool } from './tools/exportPart';
import { listPartStatsTool } from './tools/listPartStats';
import { getEdgesOfTool } from './tools/getEdgesOf';
import { getShapeInfoTool } from './tools/getShapeInfo';
import { inspectAssemblyTool } from './tools/inspectAssembly';
import { inspectRobotTool } from './tools/inspectRobot';
import { inspectStepTool } from './tools/inspectStep';
import { listApiTool } from './tools/listApi';
import { listDiagnosticCodesTool } from './tools/listDiagnosticCodes';
import { listEdgesTool } from './tools/listEdges';
import { listFaceLabelsTool } from './tools/listFaceLabels';
import { getFaceLineageTool } from './tools/getFaceLineage';
import { resolveTopoRefTool } from './tools/resolveTopoRef';
import { evaluateQueryTool } from './tools/evaluateQuery';
import { listAssembliesTool } from './tools/listAssemblies';
import { listFacesTool } from './tools/listFaces';
import { listFeaturesTool } from './tools/listFeatures';
import { listMatesTool } from './tools/listMates';
import { listTopologyTool } from './tools/listTopology';
import { lookupCookbookTool } from './tools/lookupCookbook';
import { findPartTool } from './tools/findPart';
import { fetchPartTool } from './tools/fetchPart';
import { listPartCategoriesTool } from './tools/listPartCategories';
import { listPartFamiliesTool } from './tools/listPartFamilies';
import { paramsListTool } from './tools/paramsList';
import { paramsUpdateTool } from './tools/paramsUpdate';
import { removeFeatureTool } from './tools/removeFeature';
import { designLoopTool } from './tools/designLoop';
import { reviewCadTool } from './tools/reviewCad';
import { reviewPaintPeekLatestTool } from './tools/reviewPaint';
import { setParamValueTool } from './tools/setParamValue';
import { solveMatesTool } from './tools/solveMates';
import { whyDidThisFailTool } from './tools/whyDidThisFail';
import { flattenPatternTool } from './tools/flattenPattern';
import { getBendTableTool } from './tools/getBendTable';
import { verifyTool } from './tools/verify';
import { captureAnimationTool } from './tools/captureAnimation';
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
  };
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
        'Run a kernelCAD .kcad.ts script and report pass/fail + feature count + diagnostics. ' +
        'When the scene is assembly-built (assembly().part(...) → .model()/.solvedModel()), ' +
        'also returns a parts summary { count, names }. ' +
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
        },
      },
    },
    handler: input => evaluateScriptTool(input as Parameters<typeof evaluateScriptTool>[0]),
  },
  {
    definition: {
      name: 'diff_scripts',
      description:
        'Structured geometric delta between two versions of a kernelCAD script — a baseline ' +
        '({ baseFile } or { baseCode }) and a revision ({ file } or { code }). Returns ' +
        'agent-readable JSON: per-part added/removed/renamed/changed (volume mm³ + exact bbox ' +
        'deltas, numbers matching list_part_stats), total interference-volume delta with ' +
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
      name: 'list_features',
      description:
        'List the features captured by a kernelCAD script — kind, id, params, inputs, ' +
        'transforms count, suppression. Pass either { file } or { code }.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
        },
      },
    },
    handler: input => listFeaturesTool(input as Parameters<typeof listFeaturesTool>[0]),
  },
  {
    definition: {
      name: 'list_assemblies',
      description:
        'List assembly intent captured by a kernelCAD script: assemblies, parts, named connectors, ' +
        'fixed connections, joints, and aggregate assembly models. Pass either { file } or { code }.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
        },
      },
    },
    handler: input => listAssembliesTool(input as Parameters<typeof listAssembliesTool>[0]),
  },
  {
    definition: {
      name: 'inspect_assembly',
      description:
        'Evaluate a kernelCAD script and return an agent-facing physical assembly inventory: named parts, bboxes, connectors (topology-bound connector summaries carry `origin` as a `@kc[<part>/<kind>/<name>]` string plus the resolved [x,y,z] vec3; numeric-vec3 origins are echoed back as the tuple), mates, disconnected solids, mechanical review facts, and a next-action prompt. Use before design_loop or after a visual rejection to make random/floating geometry explicit.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
          assembly: { type: 'string', description: 'Assembly name; defaults to the first captured assembly.' },
        },
      },
    },
    handler: input => inspectAssemblyTool(input as Parameters<typeof inspectAssemblyTool>[0]),
  },
  {
    definition: {
      name: 'inspect_robot',
      description:
        'Preview an assembly as it would be exported to URDF or SDFormat: returns links (name + bounding-box extent + declared density), joints (with limits in SI units), planning groups, end-effectors, and open issues the export would surface (closed loops, missing density). Read-only — pass either { file } or { code }.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
          assembly: { type: 'string', description: 'Assembly name; defaults to the first captured assembly.' },
        },
      },
    },
    handler: input => inspectRobotTool(input as Parameters<typeof inspectRobotTool>[0]),
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
      name: 'get_shape_info',
      description:
        "Run + recompute a script, return volume/surfaceArea/bbox for one feature (default: the script's returned shape). " +
        'Pass { file?, code?, feature_id? }.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
          feature_id: {
            type: 'string',
            description: "Feature id to inspect. Defaults to the script's returned shape (falls back to the last captured feature when nothing lowerable is returned).",
          },
        },
      },
    },
    handler: input => getShapeInfoTool(input as Parameters<typeof getShapeInfoTool>[0]),
  },
  {
    definition: {
      name: 'list_topology',
      description: 'List the canonical face names available on a feature (top/bottom/left/right/front/back for box; top/bottom for cylinder; none for sphere or non-primitives) plus the total edge count. Pass { file?, code?, feature_id? }.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          code: { type: 'string' },
          feature_id: { type: 'string' },
        },
      },
    },
    handler: input => listTopologyTool(input as Parameters<typeof listTopologyTool>[0]),
  },
  {
    definition: {
      name: 'get_edges_of',
      description: "Return the boundary edges of a named canonical face on an un-transformed primitive — index, centroid, length, isClosed. Pass { file?, code?, feature_id?, face_name: 'top' | ... }.",
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          code: { type: 'string' },
          feature_id: { type: 'string' },
          face_name: { type: 'string', enum: ['top', 'bottom', 'left', 'right', 'front', 'back'] },
        },
        required: ['face_name'],
      },
    },
    handler: input => getEdgesOfTool(input as unknown as Parameters<typeof getEdgesOfTool>[0]),
  },
  {
    definition: {
      name: 'why_did_this_fail',
      description: "Walk the upstream chain of a failing feature. Returns the diagnostics of the requested feature plus the diagnostics of every upstream feature in topological order (the requested feature is the last entry). Per-code hints are inline on every diagnostic — call list_diagnostic_codes for the full catalogue. Pass { file?, code?, feature_id? }.",
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
      name: 'set_param_value',
      description: 'Edit a param() default value in a kernelCAD script. Returns the modified code as text plus diagnostics from re-evaluating the result. Caller persists the new code via standard file-write tools (this tool has no side effects).',
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
      description: 'Insert a new feature line into a kernelCAD script before the last top-level return statement. Returns the modified code as text plus diagnostics from re-evaluating the result. Side-effect-free. Primitives that accept faceLabels (box, cylinder, extrudeRect, extrudeCircle, extrudePolygon, extrudeRoundedRect) can receive `opts.faceLabels` in the inserted code — use `list_api` to see `featureKindFaceLabels` for the full value schema.',
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
      name: 'add_nurbs_surface',
      description:
        "Insert a nurbsSurface(...) or surfaceFromCurves(...) call into the user's .kcad.ts. The returned Surface is captured but produces no Shape until you chain .thicken(t) or .toShape() (do that via add_feature on the binding name). Pass either { controls, degree, weights?, knots?, periodic? } for direct construction, OR { section_sketch_ids } for skinning. Returns the modified code + diagnostics. Slice-1 limitation: weights are accepted but currently ignored (TColStd_Array2OfReal not exposed in WASM bindings); surfaces are non-rational.",
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Current .kcad.ts source.' },
          controls: {
            type: 'array',
            description: 'Control-point grid for direct construction (controls[u][v] = [x, y, z], mm).',
            items: {
              type: 'array',
              items: { type: 'array', items: { type: 'number' } },
            },
          },
          weights: {
            type: 'array',
            description: 'Optional rational weights, same grid shape as controls. Ignored in slice-1.',
            items: { type: 'array', items: { type: 'number' } },
          },
          degree: {
            type: 'object',
            description: 'Degrees in U and V; each in [1, nU-1] / [1, nV-1].',
            properties: {
              u: { type: 'integer', minimum: 1 },
              v: { type: 'integer', minimum: 1 },
            },
            required: ['u', 'v'],
          },
          knots: {
            type: 'object',
            description: 'Optional explicit knot vectors; missing => clamped uniform inferred.',
            properties: {
              u: { type: 'array', items: { type: 'number' } },
              v: { type: 'array', items: { type: 'number' } },
            },
          },
          periodic: {
            type: 'object',
            description: 'Optional periodic flags per parametric direction.',
            properties: {
              u: { type: 'boolean' },
              v: { type: 'boolean' },
            },
          },
          section_sketch_ids: {
            type: 'array',
            description: 'Existing sketch FeatureIds (2 or more) to skin a surface through, in order.',
            items: { type: 'string' },
          },
          binding_name: {
            type: 'string',
            description: 'JS const name for the new Surface binding (default: surface_<N>).',
          },
        },
        required: ['code'],
      },
    },
    handler: input => addNurbsSurfaceTool(input as unknown as Parameters<typeof addNurbsSurfaceTool>[0]),
  },
  {
    definition: {
      name: 'add_nurbs_curve',
      description:
        "Insert a `nurbsCurve(controlPoints, opts?)` declaration into the user's .kcad.ts immediately before the last top-level return. The returned binding has type Curve3D (peer to Shape / Surface) — consume it via `add_variable_sweep` (spine input) or downstream Curve3D-accepting features. Pass `controlPoints` as a Vec3[] (mm, at least 2 points). Optional NURBS knobs: `degree` (default 3), rational `weights`, explicit `knots`, `closed`. Returns the modified code + diagnostics from re-evaluating. Side-effect-free.",
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          controlPoints: {
            type: 'array',
            description: 'Control points as Vec3 triples in mm; at least 2 entries.',
            items: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
          },
          degree: { type: 'integer', minimum: 1, description: 'Curve degree; default 3 (cubic).' },
          weights: {
            type: 'array',
            description: 'Optional rational weights, one per control point (same length as controlPoints).',
            items: { type: 'number' },
          },
          knots: {
            type: 'array',
            description: 'Optional explicit knot vector; missing => clamped-uniform inferred.',
            items: { type: 'number' },
          },
          closed: { type: 'boolean', description: 'Optional periodic/closed-curve flag.' },
          binding_name: { type: 'string', description: 'JS const name for the new Curve3D binding (default: _curve_<N>).' },
        },
        required: ['code', 'controlPoints'],
      },
    },
    handler: input => addNurbsCurveTool(input as unknown as Parameters<typeof addNurbsCurveTool>[0]),
  },
  {
    definition: {
      name: 'add_surface_from_boundary',
      description:
        "Insert a `surfaceFromBoundary([c1, c2, c3, c4], opts?)` declaration into the user's .kcad.ts immediately before the last top-level return. Builds the shipped filling surface: one NURBS face through 4 boundary Curve3D refs via OCCT BRepOffsetAPI_MakeFilling. The 4 curves must be passed in exact loop order: `curve_bindings[0]` = bottom, `curve_bindings[1]` = right, `curve_bindings[2]` = top, `curve_bindings[3]` = left; adjacent endpoints must coincide within 1e-6 mm or capture emits `feature.surface-from-boundary.corner-mismatch`. The result has type Surface — chain `.thicken(t)` or `.toShape()` via `add_feature` on the returned binding name. `opts.continuity` accepts a single grade ('C0' | 'C1' | 'C2') applied to all 4 edges or a length-4 array per edge; defaults to 'C0'. `opts.sampling` controls NbPtsOnCur (default 15). Validates every `curve_bindings[i]` is declared in the source via regex before inserting (fast structured error vs capture-time stack). Returns the modified code + diagnostics. Side-effect-free.",
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          curve_bindings: {
            type: 'array',
            description: 'Tuple of 4 existing Curve3D variable names (bottom, right, top, left) declared earlier in the source.',
            items: { type: 'string' },
            minItems: 4,
            maxItems: 4,
          },
          continuity: {
            description: "Continuity grade applied to every edge ('C0' | 'C1' | 'C2'), or an array of 4 grades (one per edge). Default 'C0'.",
          },
          sampling: { type: 'integer', minimum: 1, description: 'OCCT NbPtsOnCur sampling parameter (default 15).' },
          binding_name: { type: 'string', description: 'JS const name for the new Surface binding (default: _surface_<N>).' },
        },
        required: ['code', 'curve_bindings'],
      },
    },
    handler: input => addSurfaceFromBoundaryTool(input as unknown as Parameters<typeof addSurfaceFromBoundaryTool>[0]),
  },
  {
    definition: {
      name: 'add_hermite_g2',
      description:
        "Insert a `hermiteG2(a, b)` declaration into the user's .kcad.ts immediately before the last top-level return. Builds a quintic Hermite Curve3D that interpolates two endpoints with matching positions, tangents, and (optional) curvatures — used to bridge two existing curves with G2 continuity. The returned binding has type Curve3D (peer to nurbsCurve / spline3d) — consume it via `add_variable_sweep` (spine input), `add_surface_from_boundary` (boundary curve), or downstream Curve3D-accepting features. Each endpoint is `{ point: Vec3, tangent: Vec3, curvature?: Vec3 }` in mm; tangent magnitude controls how aggressively the curve heads out of the endpoint (typical magnitude ~ chord length). Curvature defaults to [0, 0, 0] which makes the curve G1 only (lifted cubic Hermite). Returns the modified code + diagnostics. Capture-time emits `feature.hermite-g2.degenerate-tangent` if a tangent has magnitude < 1e-12 and `feature.hermite-g2.non-finite-input` on any NaN/Infinity. Side-effect-free.",
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          a: {
            type: 'object',
            description: 'Start endpoint.',
            properties: {
              point: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: 'Endpoint position in mm.' },
              tangent: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: 'First derivative of the curve at this endpoint.' },
              curvature: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: 'Optional second derivative; defaults to [0, 0, 0] (G1-only).' },
            },
            required: ['point', 'tangent'],
          },
          b: {
            type: 'object',
            description: 'End endpoint.',
            properties: {
              point: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
              tangent: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
              curvature: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
            },
            required: ['point', 'tangent'],
          },
          binding_name: { type: 'string', description: 'JS const name for the new Curve3D binding (default: _curve_<N>).' },
        },
        required: ['code', 'a', 'b'],
      },
    },
    handler: input => addHermiteG2Tool(input as unknown as Parameters<typeof addHermiteG2Tool>[0]),
  },
  {
    definition: {
      name: 'add_path_spline',
      description:
        "Insert a `.spline(points, opts?)` call into an existing PathBuilder chain on the named `chain_anchor` variable. The call is injected at the END of the chain, immediately before any `.close()` (or before the statement terminator if `.close()` has not yet been added). `points` is a `Vec2[]` (mm) with at least 2 entries; the path interpolates through every waypoint. `points[0]` must match the current pen position within 1e-6 mm or capture-time emits `feature.path.spline.degenerate-points`. Optional `tension` forwards to the underlying `makeBSplineApproximation` call (tightens or relaxes the smoothing tolerance). Optional `startTangent` / `endTangent` are 2D direction vectors `[x, y]` that constrain the curve's first-derivative direction at the first and last waypoint (magnitude is normalised internally — `[1, 0]` and `[100, 0]` produce the same curve). When either tangent is set the underlying lowerer dispatches through a tangent-constrained interpolator; when both are omitted the existing fast approximation path is used. Use for organic 2D outlines (eyewear brow, ergonomic handle silhouettes, sneaker midsole) authored from measured waypoints. Returns the modified code + diagnostics from re-evaluating. Side-effect-free.",
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          chain_anchor: { type: 'string', description: 'JS identifier of an existing PathBuilder binding (e.g. `const brow = path().moveTo(0,0)`).' },
          points: {
            type: 'array',
            description: 'Waypoints as Vec2 pairs in mm; at least 2 entries; first must match current pen position.',
            items: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
            minItems: 2,
          },
          tension: { type: 'number', description: 'Optional Catmull-Rom-style stiffness; forwarded to the underlying B-spline approximation.' },
          startTangent: {
            type: 'array',
            description: 'Optional [x, y] direction vector at points[0]. Magnitude is normalised internally; direction matters.',
            items: { type: 'number' },
            minItems: 2,
            maxItems: 2,
          },
          endTangent: {
            type: 'array',
            description: 'Optional [x, y] direction vector at points[N-1]. Magnitude is normalised internally; direction matters.',
            items: { type: 'number' },
            minItems: 2,
            maxItems: 2,
          },
          binding_name: { type: 'string', description: 'Reserved for future use; the spline injection mutates the chain anchor in place.' },
        },
        required: ['code', 'chain_anchor', 'points'],
      },
    },
    handler: input => addPathSplineTool(input as unknown as Parameters<typeof addPathSplineTool>[0]),
  },
  {
    definition: {
      name: 'trace_from_image',
      description:
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
      name: 'add_path_nurbs_segment',
      description:
        "Insert a `.nurbsSegment(controlPoints, opts?)` call into an existing PathBuilder chain on the named `chain_anchor` variable. The call is injected at the END of the chain, immediately before any `.close()`. `controlPoints` is a `Vec2[]` (mm) — at least `degree + 1` entries; `controlPoints[0]` must match the current pen position within 1e-6 mm; the pen ends at `controlPoints[N-1]`. Optional `degree` defaults to 3; `weights` for rational NURBS (strictly positive); `knots` for an explicit clamped knot vector (length must equal `controlPoints.length + degree + 1`). Use for explicit B-spline outlines where the control net is the natural mental model (NURBS round-tripping, programmatic profile generation). Returns the modified code + diagnostics. Side-effect-free.",
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          chain_anchor: { type: 'string', description: 'JS identifier of an existing PathBuilder binding.' },
          controlPoints: {
            type: 'array',
            description: 'Control-net vertices as Vec2 pairs in mm; at least degree+1 entries.',
            items: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
          },
          degree: { type: 'integer', minimum: 1, description: 'B-spline degree (default 3).' },
          weights: {
            type: 'array',
            description: 'Optional rational weights (one per control point; strictly positive).',
            items: { type: 'number' },
          },
          knots: {
            type: 'array',
            description: 'Optional explicit knot vector; length must equal controlPoints.length + degree + 1.',
            items: { type: 'number' },
          },
          binding_name: { type: 'string', description: 'Reserved for future use; the segment injection mutates the chain anchor in place.' },
        },
        required: ['code', 'chain_anchor', 'controlPoints'],
      },
    },
    handler: input => addPathNurbsSegmentTool(input as unknown as Parameters<typeof addPathNurbsSegmentTool>[0]),
  },
  {
    definition: {
      name: 'add_path_hermite_g2',
      description:
        "Insert a `.hermiteG2(a, b)` call into an existing PathBuilder chain on the named `chain_anchor` variable. The call is injected at the END of the chain, immediately before any `.close()`. Each endpoint is `{ point: Vec2, tangent: Vec2, curvature?: Vec2 }` in mm. `a.point` must match the current pen position within 1e-6 mm; the pen ends at `b.point`. `curvature` defaults to `[0, 0]` (degrades to G1 / lifted cubic Hermite); pass matching curvatures on both endpoints for G2-continuous blends (eyewear bridge ↔ brow transitions, sneaker midsole transitions). Tangent magnitude is the first derivative, NOT unit length — typical magnitude is the chord length between endpoints. Returns the modified code + diagnostics. Side-effect-free.",
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          chain_anchor: { type: 'string', description: 'JS identifier of an existing PathBuilder binding.' },
          a: {
            type: 'object',
            description: 'Start endpoint; point must match current pen position within 1e-6 mm.',
            properties: {
              point: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
              tangent: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
              curvature: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
            },
            required: ['point', 'tangent'],
          },
          b: {
            type: 'object',
            description: 'End endpoint.',
            properties: {
              point: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
              tangent: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
              curvature: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
            },
            required: ['point', 'tangent'],
          },
          binding_name: { type: 'string', description: 'Reserved for future use; the segment injection mutates the chain anchor in place.' },
        },
        required: ['code', 'chain_anchor', 'a', 'b'],
      },
    },
    handler: input => addPathHermiteG2Tool(input as unknown as Parameters<typeof addPathHermiteG2Tool>[0]),
  },
  {
    definition: {
      name: 'add_variable_sweep',
      description:
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
      name: 'add_sketch_text',
      description: 'Insert a sketch.text(...) call into a kernelCAD script before the last top-level return statement. Returns the modified code as text plus diagnostics from re-evaluating the result. Side-effect-free. The emitted sketch is chainable: pair with subsequent .extrude(...) / cut(...) edits to land an engraved or raised text feature. Default font is the runtime-bundled Liberation Sans; pass `font` as a `.ttf` path to load a custom font.',
      inputSchema: {
        type: 'object',
        properties: {
          code:     { type: 'string', description: 'The .kcad.ts source code.' },
          content:  { type: 'string', description: 'Text content (UTF-8, non-empty, non-whitespace).' },
          size:     { type: 'number', description: 'Glyph cap height in mm (positive finite).' },
          font:     { type: 'string', description: 'Optional logical font name or .ttf file path; defaults to bundled Liberation Sans.' },
          align:    { type: 'string', enum: ['left', 'center', 'right'], description: 'Horizontal alignment relative to position. Default left.' },
          position: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: '[x, y] anchor in mm. Default [0, 0].' },
          rotation: { type: 'number', description: 'CCW rotation in degrees around position. Default 0.' },
          bindAs:   { type: 'string', description: 'Optional local variable name; emits const <bindAs> = sketch.text(...).' },
        },
        required: ['code', 'content', 'size'],
      },
    },
    handler: input => addSketchTextTool(input as unknown as Parameters<typeof addSketchTextTool>[0]),
  },
  {
    definition: {
      name: 'emboss_text',
      description: 'Insert a `<shape>.embossText({ text, face, size, depth, align?, anchor?, rotation?, scaleMode? })` chained call into a kernelCAD script before the last top-level return. Use for engraved brand text on faces (Ray-Ban temple, CE mark, model number). `depth > 0` raises text out of the face; `depth < 0` engraves text into the face. Side-effect-free; returns modified code plus diagnostics from re-evaluating. The emitted feature lowers via replicad drawText → sketchOnFace → extrude → fuse|cut.',
      inputSchema: {
        type: 'object',
        properties: {
          code:        { type: 'string', description: 'The .kcad.ts source code.' },
          target:      { type: 'string', description: 'Variable name of the Shape to chain onto (inserted verbatim).' },
          textContent: { type: 'string', description: 'Text content (UTF-8, non-empty, non-whitespace).' },
          size:        { type: 'number', description: 'Glyph cap height in mm (positive finite).' },
          depth:       { type: 'number', description: 'Signed extrusion depth in mm: positive emboss out, negative engrave in. Must be non-zero.' },
          face:        { type: 'string', description: "Target face — canonical name ('top'/'bottom'/'left'/'right'/'front'/'back') or label." },
          fontFamily:  { type: 'string', description: 'Optional logical font name or .ttf file path; defaults to bundled Liberation Sans.' },
          align:       { type: 'string', enum: ['left', 'center', 'right'], description: 'Horizontal alignment relative to the UV anchor. Default center.' },
          anchorU:     { type: 'number', description: 'U anchor in [0, 1] face-local (0=umin, 0.5=centre, 1=umax). Default 0.5.' },
          anchorV:     { type: 'number', description: 'V anchor in [0, 1] face-local. Default 0.5.' },
          rotation:    { type: 'number', description: 'CCW rotation in degrees, in the face tangent plane. Default 0.' },
          scaleMode:   { type: 'string', enum: ['original', 'native', 'bounds'], description: 'Drawing.sketchOnFace scaling mode. Default original.' },
          bindAs:      { type: 'string', description: 'Optional local variable name; emits `const <bindAs> = <target>.embossText(...);`.' },
        },
        required: ['code', 'target', 'textContent', 'size', 'depth', 'face'],
      },
    },
    handler: input => embossTextTool(input as unknown as Parameters<typeof embossTextTool>[0]),
  },
  {
    definition: {
      name: 'project_curve',
      description: 'Insert a `<shape>.projectCurve({ curve, face, scaleMode?, asEdge? })` chained call into a kernelCAD script. Wraps a 2D closed curve onto a 3D face along the face normal; pair with `.extrude(d)` / `.cut(...)` for engraved logos or label inserts on curved bodies. `asEdge: true` is captured but currently deferred at lower time (BRepProj_Projection not bundled). Side-effect-free; returns modified code plus diagnostics.',
      inputSchema: {
        type: 'object',
        properties: {
          code:            { type: 'string', description: 'The .kcad.ts source code.' },
          target:          { type: 'string', description: 'Variable name of the Shape to chain onto.' },
          curveExpression: { type: 'string', description: 'JS expression returning a closed sketch (e.g. `path().moveTo(0,0).lineTo(2,0).lineTo(2,2).close().build()`). Inserted verbatim as the `curve:` field.' },
          face:            { type: 'string', description: "Target face — canonical name or label." },
          scaleMode:       { type: 'string', enum: ['original', 'native', 'bounds'], description: 'Drawing.sketchOnFace scaling mode. Default original.' },
          asEdge:          { type: 'boolean', description: 'Project as an open edge instead of a closed face-bound sketch. Currently deferred.' },
          bindAs:          { type: 'string', description: 'Optional local variable name; emits `const <bindAs> = <target>.projectCurve(...);`.' },
        },
        required: ['code', 'target', 'curveExpression', 'face'],
      },
    },
    handler: input => projectCurveTool(input as unknown as Parameters<typeof projectCurveTool>[0]),
  },
  {
    definition: {
      name: 'add_pattern_feature',
      description: "Insert a Shape.patternLinear / .patternCircular / .patternGrid call into a kernelCAD script before the last top-level return. Pass structured args (kind + the matching spec object). Returns the modified code plus diagnostics from re-evaluating. Side-effect-free. The pattern feature is a single editable unit; pattern-instance face refs resolve via `<sourceId>_pattern_<i>` on the pattern feature's lineage. Geometric note: pattern is implemented as cumulative boolean union of transformed source copies — additive features (boxes, ribs, fins, spokes) pattern cleanly; patterning a subtractive feature (hole, cutout) only preserves the per-instance void when adjacent bodies are disjoint.",
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
            x: { type: 'object' }, y: { type: 'object' },
          }, required: ['x', 'y'] },
          assign_to: { type: 'string', description: "Optional const-binding name; emits `const <assign_to> = <target>.patternX(...);`. Omit for statement form." },
        },
        required: ['code', 'target', 'kind'],
      },
    },
    handler: input => addPatternFeatureTool(input as unknown as Parameters<typeof addPatternFeatureTool>[0]),
  },
  {
    definition: {
      name: 'remove_feature',
      description: 'Remove a single line from a kernelCAD script identified by a substring match. Returns the modified code plus diagnostics from re-evaluating. Refuses to remove the line containing the return statement. Side-effect-free.',
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
      name: 'list_edges',
      description:
        'List edges of a kernelCAD shape with optional EdgeQuery filter. Returns each edge\'s id, midpoint, direction, length, curveType, convex, dihedralAngleDeg, boundary status, AND a stable `ref` string of the form `@kc[<owner>/edge/<refName>]` suitable for pasting into fillet/chamfer/add_connector. Pass either { file } or { code }; query is an optional EdgeQuery object.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
          feature_id: { type: 'string', description: 'Optional FeatureId to inspect; defaults to last returned shape.' },
          query: { type: 'object', description: 'Optional EdgeQuery filter (atZ, parallel, convex, ofCurveType, etc).' },
        },
      },
    },
    handler: input => listEdgesTool(input as Parameters<typeof listEdgesTool>[0]),
  },
  {
    definition: {
      name: 'list_faces',
      description:
        'List faces of a kernelCAD shape with optional FaceQuery filter. Returns each face\'s id (deprecated), centroid, normal, surfaceType, area, label, AND a stable `ref` string of the form `@kc[<owner>/face/<refName>]` plus a `lineage` struct with canonicalName / labelName / featureKind. Paste the ref into hole/holes/cutout/shell/add_connector/resolve_topo_ref. Pass either { file } or { code }; query is an optional FaceQuery object.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
          feature_id: { type: 'string', description: 'Optional FeatureId to inspect; defaults to last returned shape.' },
          query: { type: 'object', description: 'Optional FaceQuery filter (atZ, parallelTo, ofSurfaceType, etc).' },
        },
      },
    },
    handler: input => listFacesTool(input as Parameters<typeof listFacesTool>[0]),
  },
  {
    definition: {
      name: 'resolve_topo_ref',
      description:
        "Resolve a single topology reference against a kernelCAD script's lowered geometry. Accepts either @kc[<owner>/<kind>/<name>] (single addressed entity, F-surface path) or @kcq[<expr>] (Query DSL form, dispatches through the Q3 evaluator with expect: 'unique'; surfaces query.over-determined when the Query matches multiple). Returns { ok, ref, entity: { kind, hash, path } } on success; on ambiguity returns candidate refs in the diagnostic. Pass either { file } or { code } plus the required { ref } string. For multi-hit inspection, prefer evaluate_query.",
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
          ref: { type: 'string', description: 'Topology reference of the form @kc[owner/kind/name] or @kc[owner/kind/name#modifier].' },
          feature_id: { type: 'string', description: 'Optional FeatureId to resolve against; defaults to the last lowered shape.' },
        },
        required: ['ref'],
      },
    },
    handler: input => resolveTopoRefTool(input as unknown as Parameters<typeof resolveTopoRefTool>[0]),
  },
  {
    definition: {
      name: 'evaluate_query',
      description:
        "Inspect a Query against a kernelCAD script's lowered geometry before consuming it in a feature op. Accepts three input forms: (1) an @kc[<owner>/<kind>/<name>] string ref, (2) an @kcq[<expr>] Query DSL string (face(createdBy(\"id\")), union(...), intersection(...), subtraction(...), withLabel, closestTo, etc.), or (3) a JSON-AST wrapper { ast: { op: '...', ... } } that round-trips Query.toJSON(). Returns { ok: true, entities: [{ kind, ref, handle, snapshot? }], query: { ast } } on success; on diagnostic returns { ok: false, errorCode, errorHint } with the structured query.* code. Pass expect: 'unique' to assert exactly-one and surface query.over-determined on multi-hit / query.empty on no-hit.",
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
          query: { description: 'Query input — string (@kc[...] or @kcq[...]) or JSON-AST object { ast: { op, ... } }.' },
          expect: { type: 'string', enum: ['any', 'unique'], description: "When 'unique', emit query.over-determined on multi-hit and query.empty on no-hit." },
          feature_id: { type: 'string', description: 'Optional FeatureId to resolve against; defaults to the last lowered shape.' },
        },
        required: ['query'],
      },
    },
    handler: input => evaluateQueryTool(input as unknown as Parameters<typeof evaluateQueryTool>[0]),
  },
  {
    definition: {
      name: 'list_face_labels',
      description:
        'List user-applied labels visible in a script: both sketch-segment labels (path().label(\'rim\')) and creating-op faceLabels (box(..., { faceLabels: { ... } })). Each result includes its source so the agent can disambiguate. Lets agents discover the label vocabulary on a shape before referencing labels in fillet/chamfer/shell.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
          feature_id: { type: 'string', description: 'Optional FeatureId; defaults to scanning all features.' },
        },
      },
    },
    handler: input => listFaceLabelsTool(input as Parameters<typeof listFaceLabelsTool>[0]),
  },
  {
    definition: {
      name: 'get_face_lineage',
      description:
        'Walk the HistoryMap of a lowered feature and return the chain of lineage entries that produced a named face ref. Inputs: feature_id ("auto" for last) and ref (string selector "name.slot" or a structured FaceRef / EdgeRef). Returns { chain, usedFallback }. Ships create/modify ops in this slice; split/delete classification is deferred.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
          feature_id: { type: 'string', description: 'Feature id, or "auto" for the last feature.' },
          ref: { description: 'Selector string ("name.slot") or structured FaceRef / EdgeRef.' },
        },
        required: ['feature_id', 'ref'],
      },
    },
    handler: input => getFaceLineageTool(input as unknown as Parameters<typeof getFaceLineageTool>[0]),
  },
  {
    definition: {
      name: 'list_api',
      description:
        'List the kernelCAD script-runtime surface: global functions (box, path, selectEdges, helix, etc), Shape methods (fillet, sweep, lower, etc), Sketch methods (extrude, revolve, sweep), PathBuilder methods, EdgeQuery/FaceQuery key sets, and featureKindFaceLabels (which globals accept opts.faceLabels and valid value shapes). Use this to discover what is callable from a .kcad.ts script.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    handler: input => listApiTool(input as Parameters<typeof listApiTool>[0]),
  },
  {
    definition: {
      name: 'list_diagnostic_codes',
      description:
        'Return the kernelCAD 26-code diagnostic catalogue with hint templates. ' +
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
      name: 'export_model',
      description:
        'Export the script geometry to a file. Pass either { file } or { code } plus a required { output_path } and { format }. ' +
        'Supported formats: stl (binary STL mesh), step (BREP CAD interchange), dxf (planar laser/waterjet profile from a Region or planar face), ' +
        '3mf (slicer-friendly mesh with per-part colors), glb (web-viewer / AR with PBR materials), ' +
        'svg-drawing (third-angle engineering-drawing sheet: front/top/left + isometric views, hidden edges dashed, tangent edges thin, ' +
        'overall bounding-box dimensions, title block; assemblies are drawn with inter-part occlusion). ' +
        'Robot descriptions: urdf (tree-topology robot description), srdf (motion-planning semantics layered over the URDF), sdf-gazebo (SDFormat 1.10 with native ball joints, closed loops, and solved per-link poses). ' +
        'urdf and sdf-gazebo also write one meshes/<part>.stl per link next to output_path (reported in mesh_files) — ship the whole directory to the consumer. ' +
        'STL exports run a watertight verify by default; failures return ok: false with export.mesh.not-watertight ' +
        '(open-edge count + up to 5 crack-cluster locations) but the file is still written so the broken mesh can be inspected. ' +
        'Pass { no_verify: true } to skip the gate. ' +
        'Optional { feature_id } selects which feature to export (default: last). ' +
        'Optional { options } carries per-format options bag (see the kernelcad-mcp skill for the per-format keys: dxf layers/tolerance/unit, 3mf printUnit/embedSource, glb axis/draco). ' +
        'Returns { ok, output_path, byte_count, feature_count, format, mesh_files?, diagnostics }.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
          output_path: { type: 'string', description: 'Destination path for the export file. Required.' },
          format: {
            type: 'string',
            enum: ['stl', 'step', 'dxf', '3mf', 'glb', 'svg-drawing', 'urdf', 'srdf', 'sdf-gazebo'],
            description: 'Output file format. Required.',
          },
          feature_id: { type: 'string', description: 'Optional FeatureId to export; defaults to last.' },
          options: {
            type: 'object',
            description:
              'Optional per-format options bag. Discriminator options.format must equal top-level format. ' +
              'dxf: { layers?, unit?: "mm"|"cm"|"in", tolerance? }. ' +
              '3mf: { printUnit?: "mm"|"cm"|"in", embedSource? }. ' +
              'glb: { axis?: "y-up"|"z-up", draco?: false }. ' +
              'svg-drawing: { sheet?: "a4"|"a3", modelName?, date? }.',
          },
          no_verify: { type: 'boolean', description: 'Skip the STL watertight verify gate.', default: false },
        },
        required: ['output_path', 'format'],
      },
    },
    handler: input => exportModelTool(input as unknown as Parameters<typeof exportModelTool>[0]),
  },
  {
    definition: {
      name: 'export_part',
      description:
        'Export solved-assembly parts as individual binary STL files in their modeled (world-frame) positions. ' +
        'Pass { file } or { code }, plus { part, output_path } for one part or { output_dir } for all parts ' +
        '(files land at <output_dir>/<part>.stl). A watertight verify runs on every exported mesh by default ' +
        'and fails the call with export.mesh.not-watertight (open-edge count + up to 5 crack cluster locations); ' +
        'pass { no_verify: true } only to inspect broken meshes. Unknown part names fail with ' +
        'export.part.not-found listing the valid names. ' +
        'Returns { ok, written: [{ part, output_path, byte_count, watertight }], diagnostics }.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
          part: { type: 'string', description: "Part name for single-part export, or 'all'." },
          output_path: { type: 'string', description: 'Destination .stl path (single-part mode).' },
          output_dir: { type: 'string', description: 'Destination directory (all-parts mode); files are <dir>/<part>.stl.' },
          no_verify: { type: 'boolean', description: 'Skip the watertight verify gate.', default: false },
        },
      },
    },
    handler: input => exportPartTool(input as unknown as Parameters<typeof exportPartTool>[0]),
  },
  {
    definition: {
      name: 'list_part_stats',
      description:
        'List solved-assembly parts with print-prep stats: name, exact bounding box (from the export ' +
        'tessellation), volume (mm^3), surface area (mm^2), and export triangle count. Pass { file } or { code }. ' +
        'Returns { ok, parts: [{ name, bbox, volumeMm3, surfaceAreaMm2, triangleCount }], diagnostics }.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
        },
      },
    },
    handler: input => listPartStatsTool(input as unknown as Parameters<typeof listPartStatsTool>[0]),
  },
  {
    definition: {
      name: 'lookup_cookbook',
      description:
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
      name: 'list_part_categories',
      description:
        'Enumerate the top-level part-catalog categories available locally (and remotely, when partsBaseUrl is configured). The fastest path for an agent to discover what kinds of off-the-shelf parts the bundled catalog covers.',
      inputSchema: { type: 'object', properties: {} },
    },
    handler: () => listPartCategoriesTool(),
  },
  {
    definition: {
      name: 'list_part_families',
      description:
        'Enumerate the part families within a category (e.g. socket-head-cap-screw, deep-groove-ball-bearing). Returns count and up to three exemplar ids per family. Pass { category } to filter; without filters returns every family in the bundled catalog.',
      inputSchema: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Top-level category to filter by.' },
        },
      },
    },
    handler: input => listPartFamiliesTool(input as Parameters<typeof listPartFamiliesTool>[0]),
  },
  {
    definition: {
      name: 'find_part',
      description:
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
      name: 'inspect_step',
      description:
        'Inspect a STEP file without evaluating a script: solid tree (index + best-effort name), ' +
        'per-solid exact bounding box and volume, and detected cylindrical holes ' +
        '(axis origin + direction, diameter, depth, blind/through). Use before placing imported ' +
        'vendor parts to find mounting-hole positions and verify the part-local frame.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .step file (absolute, or relative to cwd).' },
        },
        required: ['file'],
      },
    },
    handler: input => inspectStepTool(input as unknown as Parameters<typeof inspectStepTool>[0]),
  },
  {
    definition: {
      name: 'params_list',
      description:
        'List all parameters declared on the active session, with current values, defaults, and metadata. Read-only.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    handler: () => paramsListTool(),
  },
  {
    definition: {
      name: 'params_update',
      description:
        'Edit one or more session parameters and re-lower the affected records. Validates every edit before applying any (atomic). Returns the updated shape, the list of records that re-lowered, and any soft warnings (e.g., named feature refs that became passthroughs because a boolean param gated their feature off).',
      inputSchema: {
        type: 'object',
        properties: {
          edits: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                value: {},
              },
              required: ['name', 'value'],
            },
          },
        },
        required: ['edits'],
      },
    },
    handler: input => paramsUpdateTool(input as unknown as Parameters<typeof paramsUpdateTool>[0]),
  },
  {
    definition: {
      name: 'solve_sketch',
      description:
        'Solve a 2D sketch constraint set. Side-effect-free: pass { entities, constraints } and receive solved entities plus the original constraints. Entities are POINT, LINE, and CIRCLE records; constraints use the kernelCAD constraint vocabulary.',
      inputSchema: {
        type: 'object',
        properties: {
          entities: {
            type: 'array',
            description: 'Sketch entities to solve. Lines reference point ids; circles reference a center point id.',
            items: { type: 'object' },
          },
          constraints: {
            type: 'array',
            description: 'Constraints to apply to the entities.',
            items: { type: 'object' },
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
        'Append one validated sketch constraint to a constraint list. Side-effect-free: pass { constraints, constraint } and receive the updated list.',
      inputSchema: {
        type: 'object',
        properties: {
          constraints: { type: 'array', items: { type: 'object' } },
          constraint: { type: 'object' },
        },
        required: ['constraint'],
      },
    },
    handler: input => addConstraintTool(input as unknown as Parameters<typeof addConstraintTool>[0]),
  },
  {
    definition: {
      name: 'list_constraints',
      description:
        'List supported sketch constraint types and echo the provided constraint list. Use before add_constraint or solve_sketch to discover the vocabulary.',
      inputSchema: {
        type: 'object',
        properties: {
          constraints: { type: 'array', items: { type: 'object' } },
        },
      },
    },
    handler: input => listConstraintsTool(input as unknown as Parameters<typeof listConstraintsTool>[0]),
  },
  {
    definition: {
      name: 'add_assembly_part_source',
      description:
        'Durably insert `const <binding> = <assembly>.part(partName, shapeExpression, opts?)` before the final top-level return in a kernelCAD source string. Returns modified source plus diagnostics from re-evaluating it. Side-effect-free: caller persists the returned source.',
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
      name: 'add_part_connector_source',
      description:
        'Durably insert `<partBinding>.connector(name, { type, origin, axis?, normal? })` before the final top-level return. Use with the binding returned by add_assembly_part_source. Returns modified source plus diagnostics from re-evaluation. Side-effect-free; distinct from active-session add_connector.',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          part_binding: { type: 'string', description: 'JS identifier bound to an AssemblyPartRef, e.g. "basePart".' },
          name: { type: 'string', description: 'Connector name unique within the part.' },
          type: { type: 'string', enum: ['frame', 'axis', 'planar', 'ball'] },
          origin: { description: 'Origin as [x, y, z] shorthand or structured ConnectorOrigin.' },
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
      name: 'add_mate_source',
      description:
        'Durably insert `<assembly>.mate(name, a, b, type, opts?)` before the final top-level return. Connector refs use "<partName>.<connectorName>". Returns modified source plus diagnostics from re-evaluation. Side-effect-free; distinct from active-session add_mate.',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          assembly_binding: { type: 'string', description: 'JS identifier bound to assembly(...).' },
          name: { type: 'string', description: 'Mate name unique within the assembly.' },
          a: { type: 'string', description: 'Connector ref "<partName>.<connectorName>".' },
          b: { type: 'string', description: 'Connector ref "<partName>.<connectorName>".' },
          type: { type: 'string', enum: ['fastened', 'revolute', 'prismatic', 'cylindrical', 'planar', 'ball', 'pin_slot'] },
          pose: { description: 'Optional mate pose.' },
          limitsDeg: { type: 'array', items: { type: 'number' }, description: 'Optional [minDeg, maxDeg].' },
          limitsMm: { type: 'array', items: { type: 'number' }, description: 'Optional [minMm, maxMm].' },
        },
        required: ['code', 'assembly_binding', 'name', 'a', 'b', 'type'],
      },
    },
    handler: input => addMateSourceTool(input as unknown as Parameters<typeof addMateSourceTool>[0]),
  },
  {
    definition: {
      name: 'add_mate_coupling_source',
      description:
        'Durably insert `<assembly>.coupleMates(driven, { source, ratio, offset? })` before the final top-level return. Returns modified source plus diagnostics from re-evaluation. Pair coupled mates with add_transmission_source so review_cad can see a physical drive path.',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          assembly_binding: { type: 'string', description: 'JS identifier bound to assembly(...).' },
          driven: { type: 'string', description: 'Driven mate name.' },
          source: { type: 'string', description: 'Source mate name.' },
          ratio: { type: 'number', description: 'Driven pose = source pose * ratio + offset.' },
          offset: { type: 'number', description: 'Optional pose offset.' },
        },
        required: ['code', 'assembly_binding', 'driven', 'source', 'ratio'],
      },
    },
    handler: input => addMateCouplingSourceTool(input as unknown as Parameters<typeof addMateCouplingSourceTool>[0]),
  },
  {
    definition: {
      name: 'add_transmission_source',
      description:
        'Durably insert `<assembly>.transmission(name, { kind, sourceMate, drivenMates, path, ... })` before the final top-level return. Supports the current script API kinds direct-horn, link-rod, four-bar, gear-pair, belt, and tendon. Returns modified source plus diagnostics from re-evaluation.',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          assembly_binding: { type: 'string', description: 'JS identifier bound to assembly(...).' },
          name: { type: 'string' },
          kind: { type: 'string', enum: ['direct-horn', 'link-rod', 'four-bar', 'gear-pair', 'belt', 'tendon'] },
          sourceMate: { type: 'string' },
          drivenMates: { type: 'array', items: { type: 'string' } },
          actuator: { type: 'string' },
          input: { type: 'string' },
          output: { type: 'string' },
          path: { type: 'array', items: { type: 'string' } },
          ratio: { type: 'number' },
          notes: { type: 'string' },
        },
        required: ['code', 'assembly_binding', 'name', 'kind', 'sourceMate', 'drivenMates', 'path'],
      },
    },
    handler: input => addTransmissionSourceTool(input as unknown as Parameters<typeof addTransmissionSourceTool>[0]),
  },
  {
    definition: {
      name: 'add_workspace_target_source',
      description:
        'Durably insert `<assembly>.workspace(connectorRef, { reachable, toleranceMm? })` before the final top-level return. Workspace targets are checked by solvedModel validation/review pose-envelope gates. Returns modified source plus diagnostics from re-evaluation.',
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
      name: 'set_scene_return_source',
      description:
        'Replace the final top-level return statement with `return <assembly>.model();` or `return <assembly>.solvedModel(poses, options?);`. Use solvedModel for mate-authored mechanisms so FK and validation run. Returns modified source plus diagnostics from re-evaluation.',
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
      name: 'add_connector',
      description:
        'Register a v0.6 mate-style connector on a named part of the active assembly. Requires a prior evaluate_script that called kcad.assembly(...). Origin accepts a [x, y, z] tuple shorthand, a structured ConnectorOrigin ({ kind: "vec3" | "topology", ... }), or a @kc[<part>/face/<name>] / @kc[<part>/edge/<name>] / @kc[<part>/vertex/<name>] topology ref string (the `#normal` modifier on a face ref yields face-normal). Returns the registered connector\'s { partName, name, type }.',
      inputSchema: {
        type: 'object',
        properties: {
          assembly: { type: 'string', description: 'Assembly name; defaults to the only/first assembly on the active session.' },
          part: { type: 'string', description: 'Part name declared via arm.part(name, ...).' },
          name: { type: 'string', description: 'Connector name (unique within the part).' },
          type: { type: 'string', enum: ['frame', 'axis', 'planar', 'ball'] },
          origin: { description: 'Origin as [x, y, z] (vec3 shorthand), a structured ConnectorOrigin, or a @kc[<part>/face/<name>] topology ref string (face-center default; #normal modifier yields face-normal). @kc[<part>/edge/<name>] maps to edge-axis; @kc[<part>/vertex/<name>] maps to vertex.' },
          axis: { type: 'array', description: 'Optional [x, y, z] axis (axis connectors).' },
          normal: { type: 'array', description: 'Optional [x, y, z] normal (frame / planar connectors).' },
        },
        required: ['part', 'name', 'type', 'origin'],
      },
    },
    handler: input => addConnectorTool(input as unknown as Parameters<typeof addConnectorTool>[0]),
  },
  {
    definition: {
      name: 'add_mate',
      description:
        'Declare a typed mate between two named connectors on the active assembly. Connector refs accept "<partName>.<connectorName>" (legacy) or "@kc[<partName>/connector/<connectorName>]" (preferred). Mate types: fastened, revolute, prismatic, cylindrical, planar, ball, pin_slot. Optional pose and limitsDeg/limitsMm expose articulated intent for solver/review tools.',
      inputSchema: {
        type: 'object',
        properties: {
          assembly: { type: 'string' },
          name: { type: 'string', description: 'Mate name (unique within the assembly).' },
          a: { type: 'string', description: 'Connector ref: "<partName>.<connectorName>" (legacy) or "@kc[<partName>/connector/<connectorName>]".' },
          b: { type: 'string', description: 'Connector ref: "<partName>.<connectorName>" (legacy) or "@kc[<partName>/connector/<connectorName>]".' },
          type: { type: 'string', enum: ['fastened', 'revolute', 'prismatic', 'cylindrical', 'planar', 'ball', 'pin_slot'] },
          pose: { description: 'Optional mate pose: number for scalar mates or [x, y, z] degrees for ball mates.' },
          limitsDeg: { type: 'array', description: 'Optional [minDeg, maxDeg] range for revolute/cylindrical/pin_slot mates.' },
          limitsMm: { type: 'array', description: 'Optional [minMm, maxMm] range for prismatic mates.' },
        },
        required: ['name', 'a', 'b', 'type'],
      },
    },
    handler: input => addMateTool(input as unknown as Parameters<typeof addMateTool>[0]),
  },
  {
    definition: {
      name: 'list_mates',
      description: 'List the mate records declared on the active assembly. Read-only; reads arm.__mates() under the hood. Returns { mates: [{ name, a, b, type, pose?, limitsDeg?, limitsMm? }, ...] }.',
      inputSchema: {
        type: 'object',
        properties: {
          assembly: { type: 'string' },
        },
      },
    },
    handler: input => listMatesTool(input as unknown as Parameters<typeof listMatesTool>[0]),
  },
  {
    definition: {
      name: 'solve_mates',
      description: 'Run the v0.6 mate-graph solver on the active assembly. Returns { status, poses, iterations? } where each pose is a serialized Transform ({ translation, rotateAxis, rotateDeg }). Optional poses overrides mate pose values by mate name.',
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
      description: 'Run the deterministic CAD review loop: evaluate the script, validate the assembly/mate graph, check mate connectors touch modeled material, sample declared mate limits, optionally check interferences at sampled poses, report connector workspace bounds, and return a mechanism fitness verdict for agent self-review. Fitness includes repairMode: none, local-fix, parameter-tune, or topology-redesign.',
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
        'Return the newest inpainting-style review packet the user painted in Studio. ' +
        'Studio writes packets to <scriptPath>.review-paint/latest/ as the user marks regions ' +
        'over the 3D viewport; this tool scans the known kernelCAD-web checkouts and returns the ' +
        'freshest one within a configurable freshness window (default 30 minutes). Returns base64 ' +
        'PNGs of the screenshot + mask in-band so any MCP client can see the marked regions ' +
        'without local-disk Read access. Call this whenever the user says "look at my mark", ' +
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
      description: 'Run an agent CAD design loop over one or more attempt scripts: review each attempt with review_cad, continue past functional attempts that still have unresolved review warnings, return structured repair prompts, and optionally write a Studio-compatible build record JSON for visual replay.',
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
      name: 'get_bend_table',
      description:
        'List every sheetMetalBend in a script with its computed K-factor bend allowance, ' +
        'axis line, angle, radius, and parent sheetMetal thickness + kFactor. Pass { file } or { code }.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          code: { type: 'string' },
        },
      },
    },
    handler: input => getBendTableTool(input as unknown as Parameters<typeof getBendTableTool>[0]) as Promise<unknown>,
  },
  {
    definition: {
      name: 'evaluate_sdf',
      description:
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
];

const toolHandlers = new Map(TOOL_REGISTRY.map(entry => [entry.definition.name, entry.handler]));
const toolDefinitions = new Map(TOOL_REGISTRY.map(entry => [entry.definition.name, entry.definition]));

/**
 * Flat array of all tool definitions, in registry order.
 *
 * Public contract — depended on by kernelCAD-server.
 */
export const TOOLS = TOOL_REGISTRY.map(entry => entry.definition);

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
