import { addConnectorTool } from './tools/addConnector';
import { addConstraintTool, listConstraintsTool, solveSketchTool } from './tools/constraints';
import { addFeatureTool } from './tools/addFeature';
import { addSketchTextTool } from './tools/addSketchText';
import { addMateTool } from './tools/addMate';
import { evaluateScriptTool } from './tools/evaluateScript';
import { exportStlTool } from './tools/exportStl';
import { getEdgesOfTool } from './tools/getEdgesOf';
import { getShapeInfoTool } from './tools/getShapeInfo';
import { inspectAssemblyTool } from './tools/inspectAssembly';
import { listApiTool } from './tools/listApi';
import { listDiagnosticCodesTool } from './tools/listDiagnosticCodes';
import { listEdgesTool } from './tools/listEdges';
import { listFaceLabelsTool } from './tools/listFaceLabels';
import { listAssembliesTool } from './tools/listAssemblies';
import { listFacesTool } from './tools/listFaces';
import { listFeaturesTool } from './tools/listFeatures';
import { listMatesTool } from './tools/listMates';
import { listTopologyTool } from './tools/listTopology';
import { lookupCookbookTool } from './tools/lookupCookbook';
import { paramsListTool } from './tools/paramsList';
import { paramsUpdateTool } from './tools/paramsUpdate';
import { removeFeatureTool } from './tools/removeFeature';
import { designLoopTool } from './tools/designLoop';
import { reviewCadTool } from './tools/reviewCad';
import { setParamValueTool } from './tools/setParamValue';
import { solveMatesTool } from './tools/solveMates';
import { validateAssemblyTool } from './tools/validateAssembly';
import { whyDidThisFailTool } from './tools/whyDidThisFail';

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

export const TOOL_REGISTRY: ToolRegistryEntry[] = [
  {
    definition: {
      name: 'evaluate_script',
      description:
        'Run a kernelCAD .kcad.ts script and report pass/fail + feature count + diagnostics. ' +
        'Pass either { file: "<path>" } or { code: "<inline source>" }.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
        },
      },
    },
    handler: input => evaluateScriptTool(input as Parameters<typeof evaluateScriptTool>[0]),
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
        'Evaluate a kernelCAD script and return an agent-facing physical assembly inventory: named parts, bboxes, connectors, mates, disconnected solids, mechanical review facts, and a next-action prompt. Use before design_loop or after a visual rejection to make random/floating geometry explicit.',
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
      name: 'get_shape_info',
      description:
        'Run + recompute a script, return volume/surfaceArea/bbox for one feature (default: last). ' +
        'Pass { file?, code?, feature_id? }.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
          feature_id: {
            type: 'string',
            description: 'Feature id to inspect. Defaults to the last captured feature.',
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
        'List edges of a kernelCAD shape with optional EdgeQuery filter. Returns each edge\'s id, midpoint, direction, length, curveType, convex, dihedralAngleDeg, and boundary status. Use this to discover what edges are available before calling fillet/chamfer. Pass either { file } or { code }; query is an optional EdgeQuery object.',
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
        'List faces of a kernelCAD shape with optional FaceQuery filter. Returns each face\'s id, centroid, normal, surfaceType, area, and label. Use for face introspection before shell/face references. Pass either { file } or { code }; query is an optional FaceQuery object.',
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
        'Return the kernelCAD 24-code diagnostic catalogue with hint templates. ' +
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
      name: 'export_stl',
      description:
        'Export the script geometry to a binary STL file. Pass either { file } or { code } plus a required { output_path }. ' +
        'Optional { feature_id } selects which feature to export (default: last). ' +
        'Returns { ok, output_path, byte_count, feature_count, diagnostics }. ' +
        'feature_count is the total features in the script, not the count contributing to the exported shape. ' +
        'The STL file is written server-side; suitable for passing directly to slicers, simulators, and viewers.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
          output_path: { type: 'string', description: 'Destination path for the binary STL file. Required.' },
          feature_id: { type: 'string', description: 'Optional FeatureId to export; defaults to last.' },
        },
        required: ['output_path'],
      },
    },
    handler: input => exportStlTool(input as unknown as Parameters<typeof exportStlTool>[0]),
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
      name: 'add_connector',
      description:
        'Register a v0.6 mate-style connector on a named part of the active assembly. Requires a prior evaluate_script that called kcad.assembly(...). Origin accepts a [x, y, z] tuple shorthand or a structured ConnectorOrigin ({ kind: "vec3" | "topology", ... }). Returns the registered connector\'s { partName, name, type }.',
      inputSchema: {
        type: 'object',
        properties: {
          assembly: { type: 'string', description: 'Assembly name; defaults to the only/first assembly on the active session.' },
          part: { type: 'string', description: 'Part name declared via arm.part(name, ...).' },
          name: { type: 'string', description: 'Connector name (unique within the part).' },
          type: { type: 'string', enum: ['frame', 'axis', 'planar', 'ball'] },
          origin: { description: 'Origin as [x, y, z] (vec3 shorthand) or a structured ConnectorOrigin.' },
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
        'Declare a typed mate between two named connectors on the active assembly. Connector refs are "<partName>.<connectorName>". Mate types: fastened, revolute, prismatic, cylindrical, planar, ball, pin_slot. Optional pose and limitsDeg/limitsMm expose articulated intent for solver/review tools.',
      inputSchema: {
        type: 'object',
        properties: {
          assembly: { type: 'string' },
          name: { type: 'string', description: 'Mate name (unique within the assembly).' },
          a: { type: 'string', description: 'Connector ref "<partName>.<connectorName>".' },
          b: { type: 'string', description: 'Connector ref "<partName>.<connectorName>".' },
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
      name: 'validate_assembly',
      description: 'Run the mate-aware assembly validator (validateAssemblyWithMates) on the active assembly. Returns { status, diagnostics, partCount, jointCount } where diagnostics carry per-code hints agents use to recover.',
      inputSchema: {
        type: 'object',
        properties: {
          assembly: { type: 'string' },
        },
      },
    },
    handler: input => validateAssemblyTool(input as unknown as Parameters<typeof validateAssemblyTool>[0]),
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
          epsilonMm3: { type: 'number', description: 'Interference volume threshold in mm^3. Default 0.01.' },
          trackConnectors: {
            type: 'array',
            description: 'Optional connector refs such as ["gripper-plate.tool-tip"] to limit connector workspace reporting.',
            items: { type: 'string' },
          },
        },
      },
    },
    handler: input => reviewCadTool(input as unknown as Parameters<typeof reviewCadTool>[0]),
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
                      description: 'Required checklist entries: main-object-count, proportions-match-reference, required-visible-features, no-stray-or-floating-geometry, canonical-views-physically-coherent.',
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
];

const toolHandlers = new Map(TOOL_REGISTRY.map(entry => [entry.definition.name, entry.handler]));

export const TOOLS = TOOL_REGISTRY.map(entry => entry.definition);

export async function callMcpTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  const handler = toolHandlers.get(name);
  if (!handler) throw new Error(`Unknown tool: ${name}`);
  return handler(input);
}
