import { addConstraintTool, listConstraintsTool, solveSketchTool } from './tools/constraints';
import { addFeatureTool } from './tools/addFeature';
import { evaluateScriptTool } from './tools/evaluateScript';
import { exportStlTool } from './tools/exportStl';
import { getEdgesOfTool } from './tools/getEdgesOf';
import { getShapeInfoTool } from './tools/getShapeInfo';
import { listApiTool } from './tools/listApi';
import { listDiagnosticCodesTool } from './tools/listDiagnosticCodes';
import { listEdgesTool } from './tools/listEdges';
import { listFaceLabelsTool } from './tools/listFaceLabels';
import { listAssembliesTool } from './tools/listAssemblies';
import { listFacesTool } from './tools/listFaces';
import { listFeaturesTool } from './tools/listFeatures';
import { listTopologyTool } from './tools/listTopology';
import { lookupCookbookTool } from './tools/lookupCookbook';
import { paramsListTool } from './tools/paramsList';
import { paramsUpdateTool } from './tools/paramsUpdate';
import { removeFeatureTool } from './tools/removeFeature';
import { setParamValueTool } from './tools/setParamValue';
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
      description: 'Insert a new feature line into a kernelCAD script before the last top-level return statement. Returns the modified code as text plus diagnostics from re-evaluating the result. Side-effect-free. Primitives that accept faceLabels (box, cylinder, extrudeRect, extrudeCircle, extrudePolygon, extrudeRoundedRect, revolveRect) can receive `opts.faceLabels` in the inserted code — use `list_api` to see `featureKindFaceLabels` for the full value schema.',
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
];

const toolHandlers = new Map(TOOL_REGISTRY.map(entry => [entry.definition.name, entry.handler]));

export const TOOLS = TOOL_REGISTRY.map(entry => entry.definition);

export async function callMcpTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  const handler = toolHandlers.get(name);
  if (!handler) throw new Error(`Unknown tool: ${name}`);
  return handler(input);
}
