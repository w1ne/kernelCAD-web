// src/agent/mcp/server.ts
import { createRequire } from 'node:module';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { callMcpTool, TOOLS } from './toolRegistry';
import {
  callCloudTool,
  listCloudTools,
  listCloudResources,
  readCloudResource,
  type CloudMcpOptions,
} from './cloudClient';

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
  // Slice C (2026-05-24): in cloud mode the bridge proxies resources/* to
  // the hosted gateway so Claude Desktop can read the kernelcad-authoring
  // SKILL.md on connection. Local-only mode has no resources to expose.
  const capabilities: { tools: object; resources?: object } = { tools: {} };
  if (options.cloud) {
    capabilities.resources = {};
  }

  const server = new Server(
    { name: 'kernelcad', version: pkg.version },
    { capabilities },
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

  if (options.cloud) {
    // Proxy the local stdio client's resources/list to the hosted gateway.
    // A 404 from the gateway is mapped by listCloudResources() to an empty
    // list so Claude Desktop tolerates servers that haven't shipped the
    // resources endpoints yet.
    server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: await listCloudResources(options.cloudOptions),
    }));

    // Proxy resources/read to the hosted gateway. The hosted gateway returns
    // the MCP contract shape ({ contents: [{ uri, mimeType, text }] }) so we
    // pass the array through unchanged.
    server.setRequestHandler(ReadResourceRequestSchema, async (req) => ({
      contents: await readCloudResource(req.params.uri, options.cloudOptions),
    }));
  }

  return server;
}

export async function runStdioServer(options: McpServerOptions = {}): Promise<void> {
  const server = createMcpServer(options);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
