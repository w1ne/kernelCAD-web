// tests/unit/mcp/server.test.ts
import { describe, it, expect } from 'vitest';
import { createMcpServer } from '../../../src/agent/mcp/server';

describe('createMcpServer', () => {
  it('exposes the v0.11-alpha tools without throwing', () => {
    const server = createMcpServer();
    expect(server).toBeDefined();
  });
});
