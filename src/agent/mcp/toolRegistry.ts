// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { evaluateScriptTool } from './tools/evaluateScript';
import { diffScriptsTool } from './tools/diffScripts';
import { evaluateSdfTool } from './tools/evaluateSdf';
import { exportTool } from './tools/export';
import { listApiTool } from './tools/listApi';
import { listDiagnosticCodesTool } from './tools/listDiagnosticCodes';
import { designLoopTool } from './tools/designLoop';
import { reviewCadTool } from './tools/reviewCad';
import { reviewPaintPeekLatestTool } from './tools/reviewPaint';
import { setParamValueTool } from './tools/setParamValue';
import { whyDidThisFailTool } from './tools/whyDidThisFail';
import { flattenPatternTool } from './tools/flattenPattern';
import { verifyTool } from './tools/verify';
import { inspectTool } from './tools/inspect';
import { queryTool } from './tools/query';
import { TOOL_ANNOTATIONS } from './toolAnnotations';
import { TOOL_OUTPUT_SCHEMAS } from './toolOutputSchemas';
import { captureAnimationTool } from './tools/captureAnimation';
import { renderPreviewTool } from './tools/renderPreview';
import { catalogToolEntries } from './registry/catalogTools';
import { geometryAuthoringToolEntries } from './registry/geometryAuthoringTools';
import { sketchAssemblyToolEntries } from './registry/sketchAssemblyTools';
import type { McpToolDefinition, ToolRegistryEntry } from './registry/types';
export { runClosedLoop } from '../loop/closedLoop.js';
export { buildRepairPrompt } from '../loop/repairPrompt.js';
export * from '../loop/types.js';
export type { McpToolDefinition } from './registry/types';

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
  ...geometryAuthoringToolEntries,
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
  ...catalogToolEntries,
  ...sketchAssemblyToolEntries,
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
