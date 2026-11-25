// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Rounded sheet-metal blank: the folded B-rep is valid and the flat pattern
// (including the DXF cut layer) recovers the authored arc corners. The outer
// `Region` wire is a sampled polyline, so the test bounds every sampled point
// by the sampler's chord tolerance and matches the enclosed area analytically.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { isTopologicallyValid } from '../../../../src/kernel/backends/occt/edgeFeatureValidity';
import { runScript } from '../../../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { flattenPatternWithHoles } from '../../../../src/modeling/sheetMetalFlatPattern';
import { ARC_CHORD_TOL_MM } from '../../../../src/kernel/backends/occt/flatBlankOutline';
import { exportDxf } from '../../../../src/kernel/backends/occt/exportDxf';
import { importDxfText } from '../../../../src/kernel/import/importDxf';
import type { Vec2 } from '../../../../src/shared/intent/region';

const SOURCE = `
  const profile = path()
    .moveTo(10, 0).lineTo(90, 0)
    .tangentArc(100, 10).lineTo(100, 50)
    .tangentArc(90, 60).lineTo(10, 60)
    .tangentArc(0, 50).lineTo(0, 10)
    .tangentArc(10, 0).close();
  return sheetMetal(profile, { thickness: 2, kFactor: 0.38 }).bend({ atX: 50 }, 90, 3);
`;

const EXACT_AREA = 100 * 60 - (4 - Math.PI) * 10 * 10;

function polygonArea(poly: readonly Vec2[]): number {
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[(i + 1) % poly.length];
    area += x0 * y1 - x1 * y0;
  }
  return area / 2;
}

function distanceToRoundedRect(p: Vec2, w: number, h: number, r: number): number {
  const dx = Math.max(Math.abs(p[0] - w / 2) - (w / 2 - r), 0);
  const dy = Math.max(Math.abs(p[1] - h / 2) - (h / 2 - r), 0);
  return Math.abs(Math.hypot(dx, dy) - r);
}

describe('flattenPattern — rounded blank with a bend', () => {
  beforeAll(async () => { await initOcct(); });

  it('folds to a valid solid and recovers the arc corners in the flat pattern', async () => {
    const run = await runScript({ code: SOURCE, fileName: 'rounded-blank-bend.kcad.ts' });
    const built = await new RecomputeEngine(new OcctLowerer()).run(run.records, { paramTable: run.paramTable });
    const errors = built.diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toEqual([]);

    const terminalId = run.records[run.records.length - 1]!.id;
    const terminal = built.shapes.get(terminalId);
    expect(terminal).toBeInstanceOf(OcctBackend);
    const occt = terminal as OcctBackend;
    expect(isTopologicallyValid(occt.getReplicadShape().wrapped)).toBe(true);

    // One 90° bend of the 60 mm-wide sheet: the K-factor arc replaces a flat
    // strip, so the folded volume exceeds the blank volume by the sector
    // minus that strip. Computed from the same angle / radius / K-factor.
    const bendAllowance = (Math.PI / 2) * (0.38 * 2 + 3);
    const sectorVolume = (Math.PI / 2) * 60 * 2 * (3 + 2 / 2);
    const expectedVolume = EXACT_AREA * 2 - bendAllowance * 60 * 2 + sectorVolume;
    expect(occt.volume()).toBeCloseTo(expectedVolume, 0);

    const region = await flattenPatternWithHoles(run.records, terminalId, built.shapes, run.paramTable);
    expect(region.bendLines).toHaveLength(1);
    expect(region.bendLines[0].start[0]).toBeCloseTo(50, 6);
    expect(region.bendLines[0].angle).toBeCloseTo(90, 6);
    expect(region.holes).toEqual([]);

    for (const [index, point] of region.outer.entries()) {
      expect(distanceToRoundedRect(point, 100, 60, 10)).toBeLessThanOrEqual(1e-9);
      // Chords cut inside the arc; the midpoint carries the sampled sagitta.
      const next = region.outer[(index + 1) % region.outer.length];
      const midpoint: Vec2 = [(point[0] + next[0]) / 2, (point[1] + next[1]) / 2];
      expect(distanceToRoundedRect(midpoint, 100, 60, 10)).toBeLessThanOrEqual(ARC_CHORD_TOL_MM + 1e-9);
    }
    const xs = region.outer.map((p) => p[0]);
    const ys = region.outer.map((p) => p[1]);
    expect(Math.min(...xs)).toBeCloseTo(0, 6);
    expect(Math.max(...xs)).toBeCloseTo(100, 6);
    expect(Math.min(...ys)).toBeCloseTo(0, 6);
    expect(Math.max(...ys)).toBeCloseTo(60, 6);
    expect(polygonArea(region.outer)).toBeCloseTo(EXACT_AREA, 0);

    // The DXF cut layer carries the same sampled outline and the bend line.
    const text = new TextDecoder().decode(exportDxf({ kind: 'region', region }, { format: 'dxf' }));
    expect(text).toContain('LWPOLYLINE');
    expect(text).toContain('BEND');
    expect(text).toContain(`90\n${region.outer.length}\n`);
    // Round-trip the cut contour alone: the DXF reader treats the open bend
    // line as a profile, so export the region with its bend layer removed.
    const cutOnly = { ...region, bendLines: [] };
    const imported = importDxfText(
      new TextDecoder().decode(exportDxf({ kind: 'region', region: cutOnly }, { format: 'dxf' })),
    );
    const cutRegion = imported.regions[0];
    expect(cutRegion).toBeDefined();
    const cutOuter: Vec2[] = cutRegion.commands
      .filter((c): c is Extract<typeof c, { kind: 'moveTo' | 'lineTo' }> => c.kind === 'moveTo' || c.kind === 'lineTo')
      .map((c) => [c.x.evaluated, c.y.evaluated]);
    expect(cutOuter.length).toBeGreaterThanOrEqual(region.outer.length);
    expect(Math.abs(polygonArea(cutOuter))).toBeCloseTo(Math.abs(polygonArea(region.outer)), 3);
    for (const point of cutOuter) {
      expect(distanceToRoundedRect(point, 100, 60, 10)).toBeLessThanOrEqual(ARC_CHORD_TOL_MM + 1e-5);
    }
  }, 120_000);
});
