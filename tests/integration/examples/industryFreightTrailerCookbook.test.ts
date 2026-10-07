// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Freight-trailer roof solar-battery cookbook must evaluate on the agent
// path (evaluate_script), not only as markdown.
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

describe('freight trailer roof solar cookbook evaluates green', () => {
  it('packs roof cabinets on a keep-out and kingpin/bogie balance rule', async () => {
    const code = snippetBody('freight-trailer-roof-solar-batteries');
    expect(code).toMatch(/const rowCount = param\('rowCount'/);
    expect(code).toMatch(/const columnCount = param\('columnCount'/);
    expect(code).toMatch(/const gapAlong = param\('gapAlong'/);
    expect(code).toMatch(/const sideMargin = param\('sideMargin'/);
    expect(code).toContain('kingpinLoadShare');
    expect(code).toContain('layoutNote');
    expect(code.indexOf("const gapAlong = param('gapAlong'")).toBeLessThan(code.indexOf('animationView({'));
    expect(code).toContain('solvedModel');
    const r = await evaluateScriptTool({ code });
    expect(r.mechanism, JSON.stringify(r.diagnostics?.slice(0, 8))).toBe('real');
    expect(r.ok, JSON.stringify(r.diagnostics?.slice(0, 8))).toBe(true);
    expect(r.parts?.names).toEqual(expect.arrayContaining([
      'chassis',
      'landing-legs',
      'bogie',
      'box-body',
      'wheel-axle0-right',
      'wheel-axle1-left',
      'pack-r0-c0',
      'pack-r6-c2',
    ]));
  }, 300_000);
});
