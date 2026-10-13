import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('agent-readable MCP installation discovery', () => {
  it('is discoverable from the homepage and robots without a layout change', () => {
    expect(read('index.html')).toContain('<link rel="alternate" type="text/plain" href="/llms.txt"');
    expect(read('robots.txt')).toContain('https://kernelcad.com/llms.txt');
    expect(read('_headers')).toContain('/llms.txt\n  Content-Type: text/plain; charset=utf-8');
  });

  it('provides supported host setup, package skill provenance and connection verification', () => {
    const guide = read('llms.txt');
    expect(guide).toContain('# kernelCAD');
    expect(guide).toContain('look at kernelcad.com and install the mcp');
    expect(guide).toContain('claude mcp add --transport http --scope user kernelcad https://mcp.kernelcad.com/mcp');
    expect(guide).toContain('codex mcp add kernelcad --url https://mcp.kernelcad.com/mcp');
    expect(guide).toContain('"mcpServers"');
    expect(guide).toContain('"url": "https://mcp.kernelcad.com/mcp"');
    expect(guide).toContain('Node.js >=22.12.0');
    expect(guide).toContain('kernelcad@<version> skill install');
    expect(guide).toContain('metadata.version');
    expect(guide).toContain('lookup_api');
    expect(guide).toContain('new session');
    expect(guide).toContain('configured');
    expect(guide).toContain('connected');
  });
});
