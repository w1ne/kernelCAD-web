// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A cut made after .bend() must reach the flat-pattern DXF. Cuts that open
// the still-flat base are merged from the folded solid's flat top plane. Cuts
// that land on a folded flange cannot be projected by XY and must refuse,
// never disappear.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../../src/composition/runScript';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { flattenPatternWithHoles } from '../../../../src/modeling/sheetMetalFlatPattern';
import { runAndExport } from '../../../../src/agent/script-runtime/export';
import type { Vec2 } from '../../../../src/shared/intent/region';

const POST_BEND_BASE_CUTS = `
const profile = path().moveTo(0, 0).lineTo(110, 0).lineTo(110, 60).lineTo(0, 60).close();
return sheetMetal(profile, { thickness: 2, kFactor: 0.38 })
  .bend({ atX: 55 }, 90, 3)
  .subtract(cylinder(20, 2.2).translate(20, 15, -5))
  .subtract(cylinder(20, 2.2).translate(20, 45, -5));
`;

const PRE_AND_POST_BEND_CUTS = `
const profile = path().moveTo(0, 0).lineTo(110, 0).lineTo(110, 60).lineTo(0, 60).close();
return sheetMetal(profile, { thickness: 2, kFactor: 0.38 })
  .holes({ byNormal: 'Z' }, { positions: [{ u: -30, v: 0 }], diameter: 5, depth: 'through' })
  .bend({ atX: 55 }, 90, 3)
  .subtract(cylinder(20, 2.2).translate(20, 15, -5));
`;

const POST_BEND_FLANGE_CUT = `
const profile = path().moveTo(0, 0).lineTo(110, 0).lineTo(110, 60).lineTo(0, 60).close();
return sheetMetal(profile, { thickness: 2, kFactor: 0.38 })
  .bend({ atX: 55 }, 90, 3)
  .subtract(cylinder(20, 2.2).rotateY(90).translate(50, 30, 30));
`;

const centre = (loop: Vec2[]): Vec2 => [
  loop.reduce((a, p) => a + p[0], 0) / loop.length,
  loop.reduce((a, p) => a + p[1], 0) / loop.length,
];
const span = (loop: Vec2[]): Vec2 => [
  Math.max(...loop.map((p) => p[0])) - Math.min(...loop.map((p) => p[0])),
  Math.max(...loop.map((p) => p[1])) - Math.min(...loop.map((p) => p[1])),
];

describe('flattenPattern — post-bend cuts', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('carries two post-bend holes on the flat base into the flat pattern', async () => {
    const r = await runScript({ code: POST_BEND_BASE_CUTS, fileName: 'post-bend.kcad.ts' });
    const last = r.records[r.records.length - 1];
    const built = await new RecomputeEngine(new OcctLowerer()).run(r.records, { paramTable: r.paramTable });
    const region = await flattenPatternWithHoles(r.records, last.id, built.shapes, r.paramTable);

    expect(region.holes).toHaveLength(2);
    expect(region.holes.map(centre).map(([x, y]) => [Math.round(x), Math.round(y)]).sort())
      .toEqual([[20, 15], [20, 45]].sort());
    for (const hole of region.holes) {
      expect(span(hole)[0]).toBeCloseTo(4.4, 1);
      expect(span(hole)[1]).toBeCloseTo(4.4, 1);
    }
    expect(region.bendLines).toHaveLength(1);
    const xs = region.outer.map((p) => p[0]);
    const ys = region.outer.map((p) => p[1]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(110, 3);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(60, 3);
  }, 120_000);

  it('keeps a pre-bend hole once when a post-bend hole is added', async () => {
    const r = await runScript({ code: PRE_AND_POST_BEND_CUTS, fileName: 'mixed.kcad.ts' });
    const last = r.records[r.records.length - 1];
    const built = await new RecomputeEngine(new OcctLowerer()).run(r.records, { paramTable: r.paramTable });
    const region = await flattenPatternWithHoles(r.records, last.id, built.shapes, r.paramTable);

    expect(region.holes).toHaveLength(2);
    expect(region.holes.map(centre).map(([x, y]) => [Math.round(x), Math.round(y)]).sort())
      .toEqual([[20, 15], [25, 30]].sort());
  }, 120_000);

  it('writes the post-bend holes as cut loops in the DXF', async () => {
    const out = await runAndExport({ code: POST_BEND_BASE_CUTS, fileName: 'post-bend.kcad.ts', format: 'dxf' });
    expect(out.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const text = new TextDecoder().decode(out.bytes);
    // Outer blank + two holes at least; the bend line may add its own record.
    expect(text.match(/LWPOLYLINE/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  }, 120_000);

  it('refuses a post-bend cut on a folded flange instead of dropping it', async () => {
    const r = await runScript({ code: POST_BEND_FLANGE_CUT, fileName: 'flange-cut.kcad.ts' });
    const last = r.records[r.records.length - 1];
    const built = await new RecomputeEngine(new OcctLowerer()).run(r.records, { paramTable: r.paramTable });
    await expect(flattenPatternWithHoles(r.records, last.id, built.shapes, r.paramTable))
      .rejects.toMatchObject({ code: 'feature.flattenPattern.post-bend-geometry' });

    const out = await runAndExport({ code: POST_BEND_FLANGE_CUT, fileName: 'flange-cut.kcad.ts', format: 'dxf' });
    expect(out.diagnostics.map((d) => d.code)).toContain('feature.flattenPattern.post-bend-geometry');
  }, 120_000);
});
