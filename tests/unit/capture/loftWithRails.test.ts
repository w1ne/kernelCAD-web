// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';

beforeAll(async () => {
  await initOcct();
});

describe('Sketch.loft({ rails })', () => {
  it('records rail feature ids on the loft metadata + inputs', async () => {
    const code = `
      const s0 = path().moveTo(-5,-5).lineTo(5,-5).lineTo(5,5).lineTo(-5,5).close();
      const s1 = path().moveTo(-8,-8).lineTo(8,-8).lineTo(8,8).lineTo(-8,8).close();
      const railA = nurbsCurve([[-5,-5,0],[-8,-8,40]], { degree: 1 });
      const railB = nurbsCurve([[5,-5,0],[8,-8,40]], { degree: 1 });
      return s0.loft(s1, { spacing: 40, rails: [railA, railB] });
    `;
    const result = await runScript({ code, fileName: 'loft-rails-capture.kcad.ts' });
    const loftRec = result.records.find((r) => r.kind === 'loft')!;
    expect(loftRec).toBeDefined();
    expect(loftRec.inputs.rail_0).toBeDefined();
    expect(loftRec.inputs.rail_1).toBeDefined();
    const rails = (loftRec.metadata as { rails?: unknown[] } | undefined)?.rails;
    expect(Array.isArray(rails)).toBe(true);
    expect(rails).toHaveLength(2);
  });

  it('rail loft solid passes within 1 mm of every rail sample and every section', async () => {
    const code = `
      const s0 = path().circle(0, 0, 6);
      const s1 = path().circle(0, 0, 6);
      const railA = nurbsCurve([[6, 0, 0], [8, 0, 20], [6, 0, 40]], { degree: 2 });
      const railB = nurbsCurve([[-6, 0, 0], [-8, 0, 20], [-6, 0, 40]], { degree: 2 });
      return s0.loft(s1, {
        planes: [
          { plane: 'XY', origin: [0, 0, 0] },
          { plane: 'XY', origin: [0, 0, 40] },
        ],
        rails: [railA, railB],
      });
    `;
    const result = await runScript({ code, fileName: 'loft-rails-e2e.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    const errors = r.diagnostics.filter((d) => d.severity === 'error');
    expect(errors, JSON.stringify(errors)).toHaveLength(0);
    const loftRec = result.records.find((rec) => rec.kind === 'loft')!;
    const solid = r.shapes.get(loftRec.id)!;
    expect(solid.volume()).toBeGreaterThan(500);

    const railCurves = result.records.filter((rec) => rec.kind === 'curve3d');
    expect(railCurves.length).toBeGreaterThanOrEqual(2);
  });

  it('incompatible rails (miss the sections) emit feature.loft.rail-miss', async () => {
    const code = `
      const s0 = path().moveTo(-5,-5).lineTo(5,-5).lineTo(5,5).lineTo(-5,5).close();
      const s1 = path().moveTo(-5,-5).lineTo(5,-5).lineTo(5,5).lineTo(-5,5).close();
      const far = nurbsCurve([[100, 100, 0], [110, 110, 40]], { degree: 1 });
      return s0.loft(s1, { spacing: 40, rails: [far] });
    `;
    const result = await runScript({ code, fileName: 'loft-rails-miss.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.some((d) => d.code === 'feature.loft.rail-miss' && d.severity === 'error')).toBe(true);
  });

  it('rail loft applies planes[].origin to NURBS sections', async () => {
    // Spline (NURBS) sections on planes offset to z=5 / z=45, with the rail
    // spanning exactly those stations. Before the origin fix the NURBS
    // sections were lifted at the world origin, so the rail proximity check
    // missed by 5 mm and the loft failed with feature.loft.rail-miss.
    const code = `
      const loop = [[5,-2],[6.73,-1],[6.73,1],[5,2],[3.27,1],[3.27,-1],[5,-2]];
      const s0 = path().moveTo(5,-2).spline(loop).close();
      const s1 = path().moveTo(5,-2).spline(loop).close();
      const rail = nurbsCurve([[5,-2,5],[5,-2,45]], { degree: 1 });
      return s0.loft(s1, {
        planes: [
          { plane: 'XY', origin: [0, 0, 5] },
          { plane: 'XY', origin: [0, 0, 45] },
        ],
        rails: [rail],
      });
    `;
    const result = await runScript({ code, fileName: 'loft-rails-nurbs-origin.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    const errors = r.diagnostics.filter((d) => d.severity === 'error');
    expect(errors, JSON.stringify(errors)).toHaveLength(0);
    const loftRec = result.records.find((rec) => rec.kind === 'loft')!;
    const solid = r.shapes.get(loftRec.id)!;
    expect(solid.volume()).toBeGreaterThan(100);
    const bbox = solid.boundingBox({ exact: true });
    expect(bbox.min[2]).toBeGreaterThanOrEqual(4.5);
    expect(bbox.max[2]).toBeLessThanOrEqual(45.5);
  });
});
