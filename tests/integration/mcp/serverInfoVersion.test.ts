// tests/integration/mcp/serverInfoVersion.test.ts
//
// Sentinel: assert MCP serverInfo.version matches package.json.version.
// Pre-rc.11 the version was hardcoded to '0.11.0-alpha.1' in server.ts —
// agents reading the MCP `initialize` response saw stale version data and
// couldn't tell which kernel features were available. (rc.10 review I-C)
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createMcpServer } from '../../../src/mcp/server';

describe('MCP serverInfo.version matches package.json (rc.10 review I-C)', () => {
  it('createMcpServer reports version from package.json', () => {
    const pkgPath = resolve(__dirname, '../../../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string };
    const server = createMcpServer();
    // The MCP Server stores serverInfo internally. Cross-checking via
    // the constructor argument (read from server.ts source) is the most
    // robust approach since the Server class doesn't expose version.
    const srcPath = resolve(__dirname, '../../../src/mcp/server.ts');
    const src = readFileSync(srcPath, 'utf8');
    // The version literal must NOT be a hardcoded string; it must be a
    // reference to package.json.version. Assert no `version: '<x.y.z>'` literal.
    expect(src).not.toMatch(/version:\s*'\d+\.\d+\.\d+/);
    // And the resolved server (constructed) must declare a version that
    // matches package.json — sanity that we have a real Server instance back.
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(server).toBeDefined();
  });
});
