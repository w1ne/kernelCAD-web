import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

describe('public kernel distribution boundary', () => {
  it('contains no product source, app entry points or product deployment workflows', () => {
    for (const path of ['src/studio', 'src/funnel', 'src/ui', 'src/server', 'src/index.css',
      'site', 'functions', 'workers', 'index.html', 'vite.config.ts', 'vite.studio.config.ts',
      'vite.mcp-viewer.config.ts', 'vite.pricing-island.config.ts', 'vite.docs-island.config.ts',
      'playwright.config.ts', 'playwright.mesh.config.ts', 'tsconfig.site.json', 'tsr.config.json']) {
      expect(existsSync(path), path).toBe(false);
    }
    for (const name of readdirSync('.github/workflows')) {
      const source = readFileSync(`.github/workflows/${name}`, 'utf8');
      expect(name).not.toMatch(/^deploy/);
      expect(source, name).not.toMatch(/cloudflare\/wrangler-action|actions\/deploy-pages|npm run test:e2e/);
    }
  });

  it('packages the generic CLI and player without publishing the product UI', () => {
    expect(pkg.bin.kernelcad).toBe('dist/cli/index.js');
    expect(pkg.files).toContain('dist/cli');
    expect(pkg.files).toContain('dist/headless-player');
    expect(Object.keys(pkg.exports)).not.toContain('./studio');
    expect(Object.keys(pkg.exports)).not.toContain('./studio.css');
    expect(pkg.files.join('\n')).not.toMatch(/studio|mcp-viewer|index\.css/);
    expect(Object.values(pkg.scripts).join('\n')).not.toMatch(/build:studio|site:build|build:mcp-viewer|tsr generate|test:e2e/);
  });

  it('builds the player from public generic components', () => {
    const config = readFileSync('vite.player.config.ts', 'utf8');
    expect(config).toContain('src/render-player/headless-player');
    expect(existsSync('src/render-player/headless-player/main.tsx')).toBe(true);
    expect(readFileSync('tsconfig.node.json', 'utf8')).not.toContain('"vite.config.ts"');
    const vitest = readFileSync('vitest.config.ts', 'utf8');
    expect(vitest).not.toMatch(/tests\/funnel|tests\/integration\/studio|site\/|workers\//);
  });
});
