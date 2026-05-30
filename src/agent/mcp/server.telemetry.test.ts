import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Capture what the dispatch handler records.
const records: Array<{ toolName: string; outcome: string; mode: string }> = [];
vi.mock('../../shared/telemetry', () => ({
  recordToolCall: (r: { toolName: string; outcome: string; mode: string }) => records.push(r),
  maybeShowFirstRunNotice: () => {},
  flushTelemetry: async () => {},
}));
// Make local dispatch deterministic.
vi.mock('./toolRegistry', () => ({
  TOOLS: [],
  callMcpTool: vi.fn(async (name: string) => {
    if (name === 'boom') throw new Error('kernel exploded');
    return { ok: true };
  }),
}));

beforeEach(() => { records.length = 0; });
afterEach(() => { vi.clearAllMocks(); });

async function invoke(server: unknown, name: string) {
  const method = (CallToolRequestSchema.shape.method as { value: string }).value;
  const handler = (server as { _requestHandlers: Map<string, (req: unknown) => Promise<unknown>> })
    ._requestHandlers.get(method)!;
  return handler({ method, params: { name, arguments: {} } });
}

describe('MCP dispatch telemetry', () => {
  it('records ok outcome for a successful local tool call', async () => {
    const { createMcpServer } = await import('./server');
    const server = createMcpServer();
    await invoke(server, 'extrude');
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ toolName: 'extrude', outcome: 'ok', mode: 'local' });
  });

  it('records error outcome and rethrows when the tool fails', async () => {
    const { createMcpServer } = await import('./server');
    const server = createMcpServer();
    await expect(invoke(server, 'boom')).rejects.toThrow('kernel exploded');
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ toolName: 'boom', outcome: 'error', mode: 'local' });
  });
});
