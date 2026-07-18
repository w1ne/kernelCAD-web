import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderCommand } from '../../../src/agent/cli/commands/render';

describe('render base-url provisioning contract', () => {
  // `--base-url` must NOT carry a default: commander would materialize it on
  // every invocation, which sends resolveRenderBaseUrl() down the `explicit`
  // lane and permanently bypasses the bundled static player. Leaving it
  // undefined is what makes headless rendering work without `npm run dev`.
  it('render and render inspect both leave --base-url undefined by default', () => {
    const cmd = renderCommand();
    const baseOpt = cmd.options.find(o => o.long === '--base-url');
    expect(baseOpt).toBeDefined();
    expect(baseOpt?.defaultValue).toBeUndefined();
    const inspect = cmd.commands.find(c => c.name() === 'inspect');
    const inspectOpt = inspect?.options.find(o => o.long === '--base-url');
    expect(inspectOpt).toBeDefined();
    expect(inspectOpt?.defaultValue).toBeUndefined();
  });

  it('both render paths provision their base URL through resolveRenderBaseUrl', () => {
    const renderSrc = readFileSync('src/agent/cli/commands/render.ts', 'utf8');
    expect(renderSrc).toContain('resolveRenderBaseUrl');
    // renderScript + renderInspectBundle each wrap headlessRender.
    expect(renderSrc.match(/withRenderBase\(input\.baseUrl/g) ?? []).toHaveLength(2);
    // The ephemeral static-player server must be torn down on every exit path.
    expect(renderSrc).toContain('await surface.close()');
  });

  it('no port literal outside the constant definition', () => {
    const renderSrc = readFileSync('src/agent/cli/commands/render.ts', 'utf8');
    expect(renderSrc.includes('5173')).toBe(false);
    const headlessSrc = readFileSync('src/agent/render/headlessRender.ts', 'utf8');
    expect(headlessSrc.match(/5173/g) ?? []).toHaveLength(1); // DEFAULT_RENDER_BASE_URL only
  });
});
