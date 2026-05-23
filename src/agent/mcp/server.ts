// src/agent/mcp/server.ts
import { createRequire } from 'node:module';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { callMcpTool, TOOLS } from './toolRegistry';
import { callCloudTool, listCloudTools, type CloudMcpOptions } from './cloudClient';

const requireFromHere = createRequire(import.meta.url);
// At source: src/agent/mcp/server.ts → ../../../package.json (3 up)
// At bundle: dist/cli/index.js → ../../package.json (2 up)
function loadPkg(): { version: string } {
  for (const rel of ['../../../package.json', '../../package.json']) {
    try {
      return requireFromHere(rel) as { version: string };
    } catch {
      // try next
    }
  }
  return { version: 'unknown' };
}
const pkg = loadPkg();

export { TOOLS };

export interface McpServerOptions {
  cloud?: boolean;
  cloudOptions?: CloudMcpOptions;
}

export function createMcpServer(options: McpServerOptions = {}): Server {
  const server = new Server(
    { name: 'kernelcad', version: pkg.version },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: options.cloud ? await listCloudTools(options.cloudOptions) : TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    const input = (args ?? {}) as Record<string, unknown>;
    const result = options.cloud
      ? await callCloudTool(name, input, options.cloudOptions)
      : await callMcpTool(name, input);

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    };
  });

  return server;
}

export async function runStdioServer(options: McpServerOptions = {}): Promise<void> {
  const server = createMcpServer(options);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
