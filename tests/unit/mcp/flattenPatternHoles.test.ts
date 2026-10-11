// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// flatten_pattern dropped every hole drilled in the blank (holes: [] while
// the folded solid had four Ø5.5 bores), and the DXF flat pattern lost them
// too. As the first call in a fresh process it also failed with "sketch
// construction failed: oppencascade has not been loaded".

import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { flattenPatternTool } from '../../../src/agent/mcp/tools/flattenPattern';
import { runAndExport } from '../../../src/agent/script-runtime/export';

const BRACKET = `
const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 50).lineTo(0, 50).close();
let b = sheetMetal(s, { thickness: 2, kFactor: 0.4 });
b = b.holes({ byNormal: 'Z' }, { positions: [{ u: -30, v: -12 }, { u: -30, v: 12 }, { u: 35, v: -12 }, { u: 35, v: 12 }], diameter: 5.5, depth: 'through' });
b = b.cutout(path().moveTo(-5, -3).lineTo(5, -3).lineTo(5, 3).lineTo(-5, 3).close(), { face: { byNormal: 'Z' }, depth: 2 });
b = b.bend({ atX: 60 }, 90, 2);
return b;
`;

type Pt = [number, number];
const centre = (loop: Pt[]): Pt => [
  loop.reduce((a, p) => a + p[0], 0) / loop.length,
  loop.reduce((a, p) => a + p[1], 0) / loop.length,
];
const span = (loop: Pt[]): Pt => [
  Math.max(...loop.map((p) => p[0])) - Math.min(...loop.map((p) => p[0])),
  Math.max(...loop.map((p) => p[1])) - Math.min(...loop.map((p) => p[1])),
];

describe('flatten_pattern includes the blank holes and cutouts', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('returns the four Ø5.5 holes and the 10 x 6 cutout in blank coordinates', async () => {
    const out = await flattenPatternTool({ code: BRACKET });
    expect(out.ok, JSON.stringify(out.diagnostics)).toBe(true);
    const holes = out.region!.holes as Pt[][];
    expect(holes).toHaveLength(5);
    const round = holes.filter((h) => Math.abs(span(h)[0] - 5.5) < 0.05);
    expect(round.map(centre).map(([x, y]) => [Math.round(x), Math.round(y)]).sort())
      .toEqual([[20, 13], [20, 37], [85, 13], [85, 37]].sort());
    for (const h of round) expect(span(h)[1]).toBeCloseTo(5.5, 1);
    const slot = holes.find((h) => Math.abs(span(h)[0] - 10) < 0.01)!;
    expect(span(slot)[1]).toBeCloseTo(6, 6);
    expect(centre(slot)[0]).toBeCloseTo(50, 6);
    expect(centre(slot)[1]).toBeCloseTo(25, 6);
    expect(out.region!.bendLines).toHaveLength(1);
  }, 120_000);

  it('the DXF flat pattern carries the same inner loops', async () => {
    const r = await runAndExport({ code: BRACKET, fileName: 'bracket.kcad.ts', format: 'dxf' });
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const text = new TextDecoder().decode(r.bytes);
    // Outer outline + 5 inner loops on the cut layer.
    expect(text.match(/LWPOLYLINE/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
  }, 120_000);

  it('works as the first call in a fresh process (OCCT initialised by the tool)', () => {
    const tsx = join(process.cwd(), 'node_modules/.bin/tsx');
    const dir = mkdtempSync(join(tmpdir(), 'kernelcad-flatten-cold-'));
    const file = join(dir, 'cold.mts');
    const tool = join(process.cwd(), 'src/agent/mcp/tools/flattenPattern.ts');
    writeFileSync(file, `
      import { flattenPatternTool } from ${JSON.stringify(tool)};
      const out = await flattenPatternTool({ code: ${JSON.stringify(BRACKET)} });
      console.log(JSON.stringify({ ok: out.ok, holes: out.region?.holes.length ?? -1, codes: out.diagnostics.map((d) => d.code) }));
      process.exit(0);
    `);
    try {
      const stdout = execFileSync(tsx, [file], { cwd: process.cwd(), encoding: 'utf8', timeout: 120_000 });
      const line = stdout.trim().split('\n').pop()!;
      expect(JSON.parse(line)).toEqual({ ok: true, holes: 5, codes: [] });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 150_000);
});
