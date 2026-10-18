import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// The agent MCP client authenticates via its own OAuth / Bearer token and must
// never depend on any web sign-in gate.
describe('MCP path is independent of web sign-in state', () => {
  it('agent MCP client does not depend on useSession', () => {
    const src = readFileSync('src/agent/mcp/cloudClient.ts', 'utf8');
    expect(src).not.toMatch(/useSession/);
  });
});
