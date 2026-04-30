// src/mcp/server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { evaluateScriptTool } from './tools/evaluateScript';
import { listFeaturesTool } from './tools/listFeatures';
import { getShapeInfoTool } from './tools/getShapeInfo';
import { listTopologyTool } from './tools/listTopology';
import { getEdgesOfTool } from './tools/getEdgesOf';
import { whyDidThisFailTool } from './tools/whyDidThisFail';
import { setParamValueTool } from './tools/setParamValue';
import { addFeatureTool } from './tools/addFeature';
import { removeFeatureTool } from './tools/removeFeature';

const TOOLS = [
  {
    name: 'evaluate_script',
    description:
      'Run a kernelCAD .kcad.ts script and report pass/fail + feature count + diagnostics. ' +
      'Pass either { file: "<path>" } or { code: "<inline source>" }.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
        code: { type: 'string', description: 'Inline kernelCAD script source.' },
      },
    },
  },
  {
    name: 'list_features',
    description:
      'List the features captured by a kernelCAD script — kind, id, params, inputs, ' +
      'transforms count, suppression. Pass either { file } or { code }.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
        code: { type: 'string', description: 'Inline kernelCAD script source.' },
      },
    },
  },
  {
    name: 'get_shape_info',
    description:
      'Run + recompute a script, return volume/surfaceArea/bbox for one feature (default: last). ' +
      'Pass { file?, code?, feature_id? }.',
    inputSchema: {
      type: 'object' as const,
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
  {
    name: 'list_topology',
    description: 'List the canonical face names available on a feature (top/bottom/left/right/front/back for box; top/bottom for cylinder; none for sphere or non-primitives) plus the total edge count. Pass { file?, code?, feature_id? }.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        file: { type: 'string' },
        code: { type: 'string' },
        feature_id: { type: 'string' },
      },
    },
  },
  {
    name: 'get_edges_of',
    description: "Return the boundary edges of a named canonical face on an un-transformed primitive — index, centroid, length, isClosed. Mirrors ForgeCAD's edgesOf(). Pass { file?, code?, feature_id?, face_name: 'top' | ... }.",
    inputSchema: {
      type: 'object' as const,
      properties: {
        file: { type: 'string' },
        code: { type: 'string' },
        feature_id: { type: 'string' },
        face_name: { type: 'string', enum: ['top', 'bottom', 'left', 'right', 'front', 'back'] },
      },
      required: ['face_name'],
    },
  },
  {
    name: 'why_did_this_fail',
    description: "Return the focused diagnostic view of one feature — its health, its own diagnostics, the upstream chain (each upstream feature's id/kind/health), and human-readable hints for known diagnostic codes. Use when fillet/chamfer/shell errors and the agent needs the dependency context. Pass { file?, code?, feature_id? }.",
    inputSchema: {
      type: 'object' as const,
      properties: {
        file: { type: 'string' },
        code: { type: 'string' },
        feature_id: { type: 'string' },
      },
    },
  },
  {
    name: 'set_param_value',
    description: 'Edit a param() default value in a kernelCAD script. Returns the modified code as text plus diagnostics from re-evaluating the result. Caller persists the new code via standard file-write tools (this tool has no side effects).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        code: { type: 'string', description: 'The .kcad.ts source code.' },
        param_name: { type: 'string', description: 'The string literal name of the param (first arg to param()).' },
        new_value: { description: 'The new default value — number for numeric params, string for expressions.' },
      },
      required: ['code', 'param_name', 'new_value'],
    },
  },
  {
    name: 'add_feature',
    description: 'Insert a new feature line into a kernelCAD script before the last top-level return statement. Returns the modified code as text plus diagnostics from re-evaluating the result. Side-effect-free.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        code: { type: 'string', description: 'The .kcad.ts source code.' },
        feature_code: { type: 'string', description: 'Single-statement source line to insert (e.g. `const hole = cylinder(5, 2).translate(10, 10, -1);`).' },
      },
      required: ['code', 'feature_code'],
    },
  },
  {
    name: 'remove_feature',
    description: 'Remove a single line from a kernelCAD script identified by a substring match. Returns the modified code plus diagnostics from re-evaluating. Refuses to remove the line containing the return statement. Side-effect-free.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        code: { type: 'string', description: 'The .kcad.ts source code.' },
        match: { type: 'string', description: 'A substring that uniquely identifies the line to remove (e.g. `const hole = cylinder(5,`).' },
      },
      required: ['code', 'match'],
    },
  },
];

export function createMcpServer(): Server {
  const server = new Server(
    { name: 'kernelcad', version: '0.11.0-alpha.1' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    const input = (args ?? {}) as Record<string, unknown>;

    let result: unknown;
    switch (name) {
      case 'evaluate_script':
        result = await evaluateScriptTool(
          input as Parameters<typeof evaluateScriptTool>[0],
        );
        break;
      case 'list_features':
        result = await listFeaturesTool(
          input as Parameters<typeof listFeaturesTool>[0],
        );
        break;
      case 'get_shape_info':
        result = await getShapeInfoTool(
          input as Parameters<typeof getShapeInfoTool>[0],
        );
        break;
      case 'list_topology':
        result = await listTopologyTool(input as Parameters<typeof listTopologyTool>[0]);
        break;
      case 'get_edges_of':
        result = await getEdgesOfTool(input as unknown as Parameters<typeof getEdgesOfTool>[0]);
        break;
      case 'why_did_this_fail':
        result = await whyDidThisFailTool(input as Parameters<typeof whyDidThisFailTool>[0]);
        break;
      case 'set_param_value':
        result = await setParamValueTool(input as unknown as Parameters<typeof setParamValueTool>[0]);
        break;
      case 'add_feature':
        result = await addFeatureTool(input as unknown as Parameters<typeof addFeatureTool>[0]);
        break;
      case 'remove_feature':
        result = await removeFeatureTool(input as unknown as Parameters<typeof removeFeatureTool>[0]);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    };
  });

  return server;
}

export async function runStdioServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
