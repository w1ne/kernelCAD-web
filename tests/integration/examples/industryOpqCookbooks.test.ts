// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Industry O/P/Q chain cookbooks must evaluate on the agent path
// (evaluate_script), not only as markdown.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';

function snippetBody(id: string): string {
  const md = readFileSync(`cookbook/snippets/${id}.md`, 'utf8');
  return md.split('```typescript')[1].split('```')[0];
}

beforeAll(async () => {
  await initOcct();
}, 60_000);

describe('industry O/P/Q chain cookbooks evaluate green', () => {
  it('planetary-gearbox-shop-release is a fastened pitch pose, not a spinning mesh', async () => {
    const code = snippetBody('planetary-gearbox-shop-release');
    expect(code).toContain('planetaryToothCompatibility');
    expect(code).not.toContain('coupleMates');
    expect(code).not.toContain('animationView');
    expect(code).not.toContain("'cylindrical'");
    const r = await evaluateScriptTool({ code });
    expect(r.ok, JSON.stringify(r.diagnostics?.slice(0, 8))).toBe(true);
    expect(r.mechanism, JSON.stringify(r.diagnostics?.slice(0, 8))).toBe('real');
    expect(r.parts?.names.sort()).toEqual([
      'carrier',
      'cover',
      'housing',
      'planet-1',
      'planet-2',
      'planet-3',
      'ring',
      'sun',
      'sun-shaft',
    ]);
  }, 180_000);

  it('clamshell enclosure release pack is mechanism=real with param-backed lid swing', async () => {
    const code = snippetBody('clamshell-enclosure-release-pack');
    expect(code).toMatch(/const lidDeg = param\('lidDeg'/);
    expect(code.indexOf("const lidDeg = param('lidDeg'")).toBeLessThan(code.indexOf('animationView({'));
    const r = await evaluateScriptTool({ code });
    expect(r.mechanism, JSON.stringify(r.diagnostics?.slice(0, 8))).toBe('real');
    expect(r.ok, JSON.stringify(r.diagnostics?.slice(0, 8))).toBe(true);
    expect(r.parts?.names.sort()).toEqual(['base-shell', 'lid-shell']);
  }, 180_000);

  it('nema shaft spur drive stack evaluates with the stack parts', async () => {
    const code = snippetBody('nema-shaft-spur-drive-stack');
    expect(code).toContain("'cylindrical'");
    expect(code).not.toContain('animationView');
    expect(code).not.toContain('coupleMates');
    const r = await evaluateScriptTool({ code });
    expect(r.ok, JSON.stringify(r.diagnostics?.slice(0, 8))).toBe(true);
    expect(r.mechanism, JSON.stringify(r.diagnostics?.slice(0, 6))).toBe('real');
    expect(r.parts?.names.sort()).toEqual([
      'drive-bearing',
      'drive-shaft',
      'gear',
      'idler-bearing',
      'idler-shaft',
      'motor',
      'pinion',
      'plate',
    ]);
  }, 180_000);

  it('tslot frame corner evaluates with rails, gusset, and screws', async () => {
    const code = snippetBody('tslot-frame-fastener-bom');
    expect(code).not.toContain('helix(');
    const r = await evaluateScriptTool({ code });
    expect(r.ok, JSON.stringify(r.diagnostics?.slice(0, 8))).toBe(true);
    expect(r.mechanism, JSON.stringify(r.diagnostics?.slice(0, 6))).toBe('real');
    expect(r.parts?.names.sort()).toEqual([
      'gusset',
      'rail',
      'screw-1',
      'screw-2',
      'upright',
    ]);
  }, 180_000);
});
