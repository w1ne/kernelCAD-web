import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('static gallery landing page', () => {
  it('copies MCP client install one-liners instead of the raw server command', () => {
    const html = readFileSync(path.resolve(__dirname, '../site/index.html'), 'utf8');

    expect(html).toContain('claude mcp add kernelcad -- npx -y kernelcad mcp');
    expect(html).toContain('codex mcp add kernelcad -- npx -y kernelcad mcp');
    expect(html).not.toContain("wireCopyButton('mcp-btn', 'kernelcad mcp')");
  });

  it('renders gallery tiles with rotating model-viewer elements', () => {
    const html = readFileSync(path.resolve(__dirname, '../site/index.html'), 'utf8');

    expect(html).toContain('<model-viewer');
    expect(html).toContain('auto-rotate');
    expect(html).toContain('rotation-per-second="20deg"');
    expect(html).toContain('src="${entry.modelUrl}"');
    expect(html).toContain('poster="${entry.posterUrl}"');

    const css = readFileSync(path.resolve(__dirname, '../site/style.css'), 'utf8');
    expect(css).toMatch(/\.gallery-tile \.tile-viewer[\s\S]*pointer-events:\s*none/);
  });
});
