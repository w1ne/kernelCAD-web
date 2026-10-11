// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// threadedRod / threadedHole / bezier proofs on the real kernel: the modelled
// rod is ONE valid solid at the analytic volume (section area × length), it
// unions / subtracts / exports STEP, the cosmetic forms carry the thread spec,
// and a cosmetic tapped hole interferes with the rod while a modelled one
// clears it. The slow exact-clearance proof of the modelled fit lives in
// modeledThreadProofs.test.ts (KERNELCAD_SLOW_GEOMETRY_TESTS=1).
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct, type OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { buildModel } from '../../../src/modeling/buildModel';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { checkInterference } from '../../../src/agent/script-runtime/checkInterference';
import { externalThreadSectionArea, isoThreadInfo } from '../../../src/modeling/threads';
import { brepValid } from '../../threadGeometryHelpers';

beforeAll(async () => {
  await initOcct();
}, 60_000);

async function build(code: string) {
  const m = await buildModel({ fileName: 'thread.kcad.ts', code });
  expect(m.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return m;
}

describe('threadedRod', () => {
  it('M6 × 20 is one valid solid at section area × length, within the thread envelope', async () => {
    const t0 = performance.now();
    const m = await build(`return threadedRod({ spec: 'M6', length: 20 });`);
    const ms = performance.now() - t0;
    const shape = m.tailShape as unknown as OcctBackend;
    expect(brepValid(shape)).toBe(true);
    const expected = externalThreadSectionArea(isoThreadInfo('M6'), 0) * 20;
    expect(Math.abs(shape.volume() - expected) / expected).toBeLessThan(5e-4);
    const bb = shape.boundingBox({ exact: true });
    expect(bb.min[2]).toBeCloseTo(0, 6);
    expect(bb.max[2]).toBeCloseTo(20, 6);
    expect(bb.max[0]).toBeLessThan(3.01);
    expect(bb.max[0]).toBeGreaterThan(2.95);
    // One sweep, no core boolean — that is what keeps it fast.
    expect(m.records.map((r) => r.kind)).toEqual(['sketch', 'sweep']);
    expect(ms).toBeLessThan(30_000);
  }, 60_000);

  it('chamfers both ends down to the root and stays one valid solid', async () => {
    const m = await build(`return threadedRod({ spec: 'M4', length: 6, chamfer: true });`);
    const shape = m.tailShape as unknown as OcctBackend;
    expect(brepValid(shape)).toBe(true);
    const plain = externalThreadSectionArea(isoThreadInfo('M4'), 0) * 6;
    expect(shape.volume()).toBeLessThan(plain - 0.2);
    expect(shape.volume()).toBeGreaterThan(plain - 3);
  }, 60_000);

  it('clearance thins the thread; cosmetic is a major-diameter cylinder carrying the spec', async () => {
    const thin = await build(`return threadedRod({ spec: 'M3', length: 3, clearance: 0.05 });`);
    expect((thin.tailShape as unknown as OcctBackend).volume())
      .toBeCloseTo(externalThreadSectionArea(isoThreadInfo('M3'), 0.05) * 3, 2);

    const cos = await build(`return threadedRod({ spec: 'M8', length: 10, cosmetic: true });`);
    expect((cos.tailShape as unknown as OcctBackend).volume()).toBeCloseTo(Math.PI * 16 * 10, 6);
    const rec = cos.records.find((r) => r.kind === 'cylinder')!;
    expect((rec.metadata as { thread?: { spec: string; modeled: boolean } }).thread).toMatchObject({ spec: 'M8x1.25', modeled: false });
  }, 60_000);

  it('unions onto and subtracts from other bodies', async () => {
    const u = await build(`return cylinder(4, 6).union(threadedRod({ spec: 'M5', length: 4 }).translate(0, 0, 4));`);
    expect(brepValid(u.tailShape as unknown as OcctBackend)).toBe(true);
    const rod = externalThreadSectionArea(isoThreadInfo('M5'), 0) * 4;
    expect((u.tailShape as unknown as OcctBackend).volume()).toBeCloseTo(Math.PI * 36 * 4 + rod, 2);

    const s = await build(`return box(10, 10, 4).translate(-5, -5, 0).subtract(threadedRod({ spec: 'M5', length: 6 }).translate(0, 0, -1));`);
    expect(brepValid(s.tailShape as unknown as OcctBackend)).toBe(true);
    expect((s.tailShape as unknown as OcctBackend).volume()).toBeCloseTo(400 - rod, 2);
  }, 90_000);

  it('exports one manifold solid to STEP', async () => {
    const step = await runAndExport({ code: `return threadedRod({ spec: 'M3', length: 5 });`, fileName: 'rod.kcad.ts', format: 'step' });
    expect(step.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(new TextDecoder().decode(step.bytes).match(/MANIFOLD_SOLID_BREP/g)?.length).toBe(1);
  }, 60_000);

  it('rejects a bad spec, length or clearance with feature.invalid-args', async () => {
    const bad = async (code: string, re: RegExp) => {
      await expect(buildModel({ fileName: 'bad.kcad.ts', code })).rejects.toMatchObject({
        code: 'feature.invalid-args',
        message: expect.stringMatching(re),
      });
    };
    await bad(`return threadedRod({ spec: 'M9', length: 5 });`, /M9x<pitch>/);
    await bad(`return threadedRod({ spec: 'M6', length: 0 });`, /opts\.length/);
    await bad(`return threadedRod({ spec: 'M6', length: 5, clearance: 0.5 });`, /pitch \/ 10/);
    await bad(`return threadedRod({ spec: 'M6', length: 5, pitch: 1 });`, /opts\.pitch/);
  }, 60_000);
});

describe('Shape.threadedHole', () => {
  it('cosmetic: drills the ISO minor diameter and records the thread on the hole', async () => {
    const m = await build(`return box(20, 20, 10).threadedHole('top', { u: 0, v: 0, spec: 'M6', depth: 8 });`);
    const hole = m.records.find((r) => r.kind === 'hole')!;
    expect(hole.params.threadPitch?.evaluated).toBe(1);
    const D1 = isoThreadInfo('M6').minorDiameter;
    const volume = (m.tailShape as unknown as OcctBackend).volume();
    expect(volume).toBeCloseTo(4000 - Math.PI * (D1 / 2) ** 2 * 8, 0);
    // Exactly the hole it stands for.
    const same = await build(`return box(20, 20, 10).hole('top', { u: 0, v: 0, diameter: 6, depth: 8, thread: { pitch: 1 } });`);
    expect(volume).toBeCloseTo((same.tailShape as unknown as OcctBackend).volume(), 9);
  }, 60_000);

  it('a cosmetic tapped hole interferes with a threadedRod (the control for the modelled fit)', async () => {
    const out = await checkInterference({
      fileName: 'fit.kcad.ts',
      code: `
        const arm = assembly('fit');
        arm.part('rod', threadedRod({ spec: 'M3', length: 4 }));
        arm.part('nut', box(6, 6, 2).translate(-3, -3, 0).threadedHole({ atZ: 2, byNormal: 'Z' }, { u: 0, v: 0, spec: 'M3', depth: 'through' }), { at: [0, 0, 1] });
        return arm.model();`,
    });
    expect(out.pairs).toHaveLength(1);
    expect(out.pairs[0].volumeMm3).toBeGreaterThan(1);
  }, 90_000);
});

describe('Bézier helpers', () => {
  it('path().bezierTo / quadraticTo are exact Bézier segments', async () => {
    const m = await build(`
      return path().moveTo(0, 0).lineTo(20, 0)
        .bezierTo([20, 10], [0, 10], [0, 20])
        .quadraticTo([-10, 10], [0, 0])
        .close().extrude(2);`);
    // Green's theorem on the exact curves: 266.67 mm² × 2 mm.
    expect((m.tailShape as unknown as OcctBackend).volume()).toBeCloseTo(533.3333, 3);
  }, 60_000);

  it('bezier(points) is a Curve3D on the Bézier polynomial and sweeps as a smooth rail', async () => {
    const m = await build(`
      const c = bezier([[0, 0, 0], [0, 0, 30], [30, 0, 30], [40, 10, 60]]);
      const mid = c.pointAt(0.5);
      if (Math.abs(mid[0] - 16.25) > 1e-6 || Math.abs(mid[1] - 1.25) > 1e-6 || Math.abs(mid[2] - 30) > 1e-6) {
        throw new Error('bezier midpoint ' + mid.join(','));
      }
      return path().circle(0, 0, 2).sweep(c.sample(48), { spine: 'smooth' });`);
    expect((m.tailShape as unknown as OcctBackend).volume()).toBeGreaterThan(800);
  }, 60_000);
});
