// src/agent/mcp/server.ts
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { callMcpTool, TOOLS } from './toolRegistry';
import { recordToolCall, maybeShowFirstRunNotice, flushTelemetry } from '../../shared/telemetry';

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
const SESSION_ID = randomUUID();

export { TOOLS };

export function createMcpServer(): Server {
  const server = new Server(
    { name: 'kernelcad', version: pkg.version },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    const input = (args ?? {}) as Record<string, unknown>;
    const startedAt = Date.now();
    try {
      const result = await callMcpTool(name, input);
      recordToolCall({ toolName: name, mode: 'local', outcome: 'ok', durationMs: Date.now() - startedAt, sessionId: SESSION_ID });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      recordToolCall({ toolName: name, mode: 'local', outcome: 'error', durationMs: Date.now() - startedAt, sessionId: SESSION_ID });
      throw err;
    }
  });

  return server;
}

export async function runStdioServer(): Promise<void> {
  maybeShowFirstRunNotice();
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  const flush = () => { void flushTelemetry(); };
  process.once('beforeExit', flush);
  process.once('SIGINT', () => { flush(); process.exit(0); });
  process.once('SIGTERM', () => { flush(); process.exit(0); });
  await server.connect(transport);
}
