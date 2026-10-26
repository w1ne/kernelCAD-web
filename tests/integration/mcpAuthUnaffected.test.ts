import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// The Studio sign-in gate must never wrap or import the MCP connect route or
// the agent MCP client — MCP authenticates via its own OAuth / Bearer token.
describe('MCP path is independent of the web sign-in gate', () => {
  it('agent MCP client does not depend on useSession', () => {
    const src = readFileSync('src/agent/mcp/cloudClient.ts', 'utf8');
    expect(src).not.toMatch(/useSession/);
  });
});
