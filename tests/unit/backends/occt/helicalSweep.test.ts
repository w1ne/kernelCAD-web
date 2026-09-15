// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `sweep(helix(...), { spine: 'helix' })` — exact-helix screw sweep for thread
// profiles. Required-suite checks, kept short: one M3 ISO 60° V ridge over two
// turns must build as a VALID solid (OCCT BRepCheck) whose volume equals the
// analytic screw-sweep volume θ·∫∫ r dA, plus orientation, axis, ParamRef and
// rejection behaviour. The full M3–M12 sweep and the boolean-robustness proof
// run in tests/integration/modeling/modeledThreadProofs.test.ts.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, type OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { analyticHelicalSweepVolume } from '../../../../src/kernel/backends/occt/helicalSweep';
import { isoExternalRidgeProfile, isoMinorRadius } from '../../../../src/kernel/backends/occt/isoThread';
import { brepValid, ridgeScript } from '../../../threadGeometryHelpers';

async function lowerTail(code: string) {
  const run = await runScript({ code, fileName: 'thread.kcad.ts' });
  const r = await new RecomputeEngine(createOcctLowerer(run.session)).run(run.records, { paramTable: run.paramTable });
  const tail = run.records[run.records.length - 1];
  return { run, result: r, shape: r.shapes.get(tail.id) as OcctBackend | undefined };
}

describe("Sketch.sweep(helix(), { spine: 'helix' })", () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('M3 ISO V ridge is a valid solid with the analytic volume', async () => {
    const turns = 2;
    const code = ridgeScript(3, 0.5, turns);
    const { result, shape } = await lowerTail(code);
    expect(result.diagnostics.filter((x) => x.severity === 'error')).toHaveLength(0);
    expect(brepValid(shape!)).toBe(true);

    const analytic = analyticHelicalSweepVolume(isoExternalRidgeProfile(3, 0.5), isoMinorRadius(3, 0.5), turns);
    expect(Math.abs(shape!.volume() - analytic) / analytic).toBeLessThan(1e-4);
  });

  it('builds a valid solid from a clockwise profile too', async () => {
    const pts = [...isoExternalRidgeProfile(3, 0.5)].reverse();
    const code = `
      const p = path().moveTo(${pts[0][0]}, ${pts[0][1]})${pts.slice(1).map(([x, y]) => `.lineTo(${x}, ${y})`).join('')}.close();
      return p.sweep(helix({ radius: ${isoMinorRadius(3, 0.5)}, pitch: 0.5, turns: 1 }), { spine: 'helix' });
    `;
    const { shape } = await lowerTail(code);
    expect(brepValid(shape!)).toBe(true);
    const analytic = analyticHelicalSweepVolume(pts, isoMinorRadius(3, 0.5), 1);
    expect(Math.abs(shape!.volume() - analytic) / analytic).toBeLessThan(1e-4);
  });

  it('keeps the helix on the requested axis and start angle', async () => {
    // A 0.5 mm square profile on an X-axis helix of radius 5: every point stays
    // within radius 5 ± 0.25 of the X axis and the sweep advances along +X.
    const code = `
      const sq = path().moveTo(-0.25, -0.25).lineTo(0.25, -0.25).lineTo(0.25, 0.25).lineTo(-0.25, 0.25).close();
      return sq.sweep(helix({ radius: 5, pitch: 2, turns: 3, axis: 'X', startAngle: 1 }), { spine: 'helix' });
    `;
    const { shape } = await lowerTail(code);
    const bb = shape!.boundingBox({ exact: true });
    expect(bb.min[0]).toBeGreaterThan(-0.3);
    expect(bb.max[0]).toBeLessThan(6.3);
    expect(Math.max(-bb.min[1], bb.max[1], -bb.min[2], bb.max[2])).toBeLessThan(5.26);
    expect(Math.abs(shape!.volume() - analyticHelicalSweepVolume([[-0.25, -0.25], [0.25, -0.25], [0.25, 0.25], [-0.25, 0.25]], 5, 3))).toBeLessThan(1e-3);
  });

  it('follows ParamRef helix dimensions at lower time', async () => {
    const code = `
      const r = param('r', 4);
      const sq = path().moveTo(-0.2, -0.2).lineTo(0.2, -0.2).lineTo(0.2, 0.2).lineTo(-0.2, 0.2).close();
      return sq.sweep(helix({ radius: r, pitch: 1, turns: 2 }), { spine: 'helix' });
    `;
    const run = await runScript({ code, fileName: 'p.kcad.ts' });
    const square: Array<[number, number]> = [[-0.2, -0.2], [0.2, -0.2], [0.2, 0.2], [-0.2, 0.2]];
    for (const radius of [4, 9]) {
      run.paramTable.set('r', radius);
      const r = await new RecomputeEngine(createOcctLowerer(run.session)).run(run.records, { paramTable: run.paramTable });
      const shape = r.shapes.get(run.records[run.records.length - 1].id)!;
      expect(shape.volume()).toBeCloseTo(analyticHelicalSweepVolume(square, radius, 2), 4);
    }
  });

  it('rejects a profile whose axial extent reaches the pitch (turns would overlap)', async () => {
    const code = `
      const tall = path().moveTo(0, -0.6).lineTo(0.5, -0.6).lineTo(0.5, 0.6).lineTo(0, 0.6).close();
      return tall.sweep(helix({ radius: 3, pitch: 1, turns: 2 }), { spine: 'helix' });
    `;
    const { result } = await lowerTail(code);
    const err = result.diagnostics.find((x) => x.severity === 'error')!;
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toMatch(/spans 1\.2000 mm along the axis but the pitch is 1 mm/);
  });

  it('rejects a profile that crosses the helix axis', async () => {
    const code = `
      const wide = path().moveTo(-4, -0.2).lineTo(0.5, -0.2).lineTo(0.5, 0.2).lineTo(-4, 0.2).close();
      return wide.sweep(helix({ radius: 3, pitch: 1, turns: 2 }), { spine: 'helix' });
    `;
    const { result } = await lowerTail(code);
    const err = result.diagnostics.find((x) => x.severity === 'error')!;
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toMatch(/crosses the helix axis/);
  });

  it("rejects spine: 'helix' on a rail that did not come from helix()", async () => {
    await expect(
      runScript({
        code: `return path().moveTo(0, 0).lineTo(1, 0).lineTo(1, 1).close().sweep([[0, 0, 0], [0, 0, 10]], { spine: 'helix' });`,
        fileName: 'bad.kcad.ts',
      }),
    ).rejects.toThrow(/needs the unmodified array returned by helix/);
    await expect(
      runScript({
        code: `const rail = helix({ radius: 3, pitch: 1, turns: 2 }).map((p) => [p[0] + 1, p[1], p[2]]);
               return path().moveTo(0, 0).lineTo(0.2, 0).lineTo(0.2, 0.2).close().sweep(rail, { spine: 'helix' });`,
        fileName: 'bad2.kcad.ts',
      }),
    ).rejects.toThrow(/needs the unmodified array returned by helix/);
  });
});
