import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderCommand } from '../../../src/agent/cli/commands/render';
import { DEFAULT_RENDER_BASE_URL } from '../../../src/agent/render/headlessRender';

describe('render base-url single source of truth', () => {
  it('render and render inspect both default --base-url to the shared constant', () => {
    const cmd = renderCommand();
    const baseOpt = cmd.options.find(o => o.long === '--base-url');
    expect(baseOpt?.defaultValue).toBe(DEFAULT_RENDER_BASE_URL);
    const inspect = cmd.commands.find(c => c.name() === 'inspect');
    const inspectOpt = inspect?.options.find(o => o.long === '--base-url');
    expect(inspectOpt?.defaultValue).toBe(DEFAULT_RENDER_BASE_URL);
  });

  it('no port literal outside the constant definition', () => {
    const renderSrc = readFileSync('src/agent/cli/commands/render.ts', 'utf8');
    expect(renderSrc.includes('5173')).toBe(false);
    const headlessSrc = readFileSync('src/agent/render/headlessRender.ts', 'utf8');
    expect(headlessSrc.match(/5173/g) ?? []).toHaveLength(1); // DEFAULT_RENDER_BASE_URL only
  });
});
