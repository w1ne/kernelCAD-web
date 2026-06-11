// tests/unit/capture/rotateAxisAliases.test.ts
//
// .rotateX/.rotateY/.rotateZ are thin aliases over .rotate(axis, degrees,
// pivot?). Verifies record-level equivalence with the axis form, geometric
// equivalence within tolerance after lowering, pivot passthrough, ParamRef
// degrees support, and validation parity (same loud invalid-args).
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { buildModel } from '../../../src/modeling/buildModel';

const TOL = 1e-6;

function expectVecClose(a: readonly number[], b: readonly number[]): void {
  expect(a.length).toBe(b.length);
  for (let i = 0; i < a.length; i++) {
    expect(Math.abs(a[i] - b[i])).toBeLessThan(TOL);
  }
}

describe('Shape.rotateX/rotateY/rotateZ aliases', () => {
  beforeAll(async () => { await initOcct(); });

  it('rotateX captures the identical transform record as rotate([1,0,0], deg)', async () => {
    const alias = await runScript({ code: `return box(10, 20, 30).rotateX(45);`, fileName: 'a.kcad.ts' });
    const axisForm = await runScript({ code: `return box(10, 20, 30).rotate([1, 0, 0], 45);`, fileName: 'b.kcad.ts' });
    expect(alias.records[0].transforms).toEqual(axisForm.records[0].transforms);
  });

  it('rotateY captures the identical transform record as rotate([0,1,0], deg)', async () => {
    const alias = await runScript({ code: `return box(10, 20, 30).rotateY(90);`, fileName: 'a.kcad.ts' });
    const axisForm = await runScript({ code: `return box(10, 20, 30).rotate([0, 1, 0], 90);`, fileName: 'b.kcad.ts' });
    expect(alias.records[0].transforms).toEqual(axisForm.records[0].transforms);
  });

  it('rotateZ captures the identical transform record as rotate([0,0,1], deg)', async () => {
    const alias = await runScript({ code: `return box(10, 20, 30).rotateZ(-43);`, fileName: 'a.kcad.ts' });
    const axisForm = await runScript({ code: `return box(10, 20, 30).rotate([0, 0, 1], -43);`, fileName: 'b.kcad.ts' });
    expect(alias.records[0].transforms).toEqual(axisForm.records[0].transforms);
  });

  it('rotateY(90) lowers to the same geometry as rotate([0,1,0], 90) within tolerance', async () => {
    const alias = await buildModel({
      fileName: 'alias.kcad.ts',
      code: `return box(10, 20, 30).rotateY(90);`,
    });
    const axisForm = await buildModel({
      fileName: 'axis.kcad.ts',
      code: `return box(10, 20, 30).rotate([0, 1, 0], 90);`,
    });
    expect(alias.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const bbA = alias.tailShape!.boundingBox();
    const bbB = axisForm.tailShape!.boundingBox();
    expectVecClose(bbA.min, bbB.min);
    expectVecClose(bbA.max, bbB.max);
    expect(Math.abs(alias.tailShape!.volume() - axisForm.tailShape!.volume())).toBeLessThan(TOL);
    // Sanity: the rotation actually happened (x extent took the box's z size).
    expect(Math.abs((bbA.max[0] - bbA.min[0]) - 30)).toBeLessThan(TOL);
  });

  it('pivot passes through to the underlying rotate', async () => {
    const alias = await runScript({
      code: `return box(10, 10, 10).rotateZ(90, [5, 5, 0]);`,
      fileName: 'a.kcad.ts',
    });
    const axisForm = await runScript({
      code: `return box(10, 10, 10).rotate([0, 0, 1], 90, [5, 5, 0]);`,
      fileName: 'b.kcad.ts',
    });
    expect(alias.records[0].transforms).toEqual(axisForm.records[0].transforms);
  });

  it('degrees accepts a ParamRef (parametric rotation stays symbolic)', async () => {
    const result = await runScript({
      code: `const a = param('tiltDeg', 30); return box(10, 20, 30).rotateX(a);`,
      fileName: 'p.kcad.ts',
    });
    const t = result.records[0].transforms![0] as { op: string; degrees: { paramRef?: unknown } };
    expect(t.op).toBe('rotateAxis');
    expect(t.degrees.paramRef).toBe('tiltDeg');
  });

  it('returns the Shape (chainable) and shares rotate validation', async () => {
    const chained = await runScript({
      code: `return box(5, 5, 5).rotateY(45).translate(1, 2, 3);`,
      fileName: 'c.kcad.ts',
    });
    expect(chained.records[0].transforms).toHaveLength(2);

    let caught: unknown;
    try {
      await runScript({ code: `return box(10, 10, 10).rotateZ(Infinity);`, fileName: 'd.kcad.ts' });
    } catch (e) { caught = e; }
    expect(String(caught)).toMatch(/finite/i);
  });
});
