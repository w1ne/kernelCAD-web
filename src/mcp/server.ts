// src/mcp/server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { evaluateScriptTool } from './tools/evaluateScript';
import { listFeaturesTool } from './tools/listFeatures';
import { getShapeInfoTool } from './tools/getShapeInfo';

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
