import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '../../../src/agent/mcp/server';

// Use the real SDK client so discovery caches and validates lookup_api outputSchema.
describe('stdio structured content SDK roundtrip', () => {
  it('initializes at the package version and calls lookup_api with its advertised output schema', async () => {
    const pkg = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'));
    const server = createMcpServer();
    const client = new Client({ name: 'stdio-structured-content-test', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);
      expect(client.getServerVersion()).toEqual({ name: 'kernelcad', version: pkg.version });
      const { tools } = await client.listTools();
      expect(tools.find(tool => tool.name === 'lookup_api')?.outputSchema).toBeDefined();
      const result = await client.callTool({ name: 'lookup_api', arguments: {} });
      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toMatchObject({
        globals: expect.any(Array), shapeMethods: expect.any(Array),
      });
      expect(result.content).toEqual([
        { type: 'text', text: JSON.stringify(result.structuredContent, null, 2) },
      ]);
    } finally {
      await client.close();
      await server.close();
    }
  });
});
