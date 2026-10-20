// tests/unit/api/polygonMethods.test.ts
//
// 2D polygon fillet + side/front/plan mask-prism helpers and the
// extrudeRoundedRect axis option. Bounds are measured from the lowered
// OCCT shape, so an orientation bug cannot pass on capture metadata alone.

import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { buildModel } from '../../../src/composition/buildModel';
import { filletPolygon } from '../../../src/modeling/apiPolygonMethods';

beforeAll(async () => { await initOcct(); }, 60_000);

function bounds(shape: unknown) {
  return (shape as OcctBackend).boundingBox();
}

function expectBounds(
  actual: { min: [number, number, number]; max: [number, number, number] },
  min: [number, number, number],
  max: [number, number, number],
) {
  for (let i = 0; i < 3; i++) {
    expect(actual.min[i]).toBeCloseTo(min[i], 6);
    expect(actual.max[i]).toBeCloseTo(max[i], 6);
  }
}

describe('filletPolygon', () => {
  const square = [[0, 0], [40, 0], [40, 20], [0, 20]] as const;

  it('rounds every corner and stays inside the original bounds', () => {
    const round = filletPolygon(square, 4);
    expect(round.length).toBeGreaterThan(square.length);
    for (const [x, y] of round) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(40);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(20);
    }
    // A filleted corner moves the sharp point off the outline: no point may
    // sit exactly on the original (40, 0) corner.
    expect(round.some(([x, y]) => Math.hypot(x - 40, y) < 1e-9)).toBe(false);
  });

  it('handles clockwise winding the same as counter-clockwise', () => {
    const cw = [...square].reverse() as [number, number][];
    const a = filletPolygon(square, 3, { segments: 6 });
    const b = filletPolygon(cw, 3, { segments: 6 });
    const key = (p: [number, number]) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
    expect(new Set(a.map(key))).toEqual(new Set(b.map(key)));
  });

  it('clamps an oversized radius instead of crossing adjacent edges', () => {
    const round = filletPolygon([[0, 0], [10, 0], [10, 10], [0, 10]], 100);
    for (const [x, y] of round) {
      expect(x).toBeGreaterThanOrEqual(-1e-6);
      expect(x).toBeLessThanOrEqual(10 + 1e-6);
      expect(y).toBeGreaterThanOrEqual(-1e-6);
      expect(y).toBeLessThanOrEqual(10 + 1e-6);
    }
  });

  it('returns the polygon unchanged at radius 0 and rejects bad input', () => {
    expect(filletPolygon(square, 0)).toEqual(square.map(([x, y]) => [x, y]));
    expect(() => filletPolygon([[0, 0], [1, 1]], 1)).toThrow(/at least 3/);
    expect(() => filletPolygon(square, -1)).toThrow(/radius/);
  });
});

describe('mask prism helpers', () => {
  it('prismSide centres the (s, z) polygon through Y', async () => {
    const model = await buildModel({
      code: `return prismSide([[0,0],[100,0],[100,50],[0,50]], 100);`,
      fileName: 'prism-side.kcad.ts',
    });
    expectBounds(bounds(model.rootShape), [0, -100, 0], [100, 100, 50]);
  }, 60_000);

  it('prismSideY spans exactly y0..y1', async () => {
    const model = await buildModel({
      code: `return prismSideY([[0,0],[100,0],[100,50],[0,50]], 20, 80);`,
      fileName: 'prism-side-y.kcad.ts',
    });
    expectBounds(bounds(model.rootShape), [0, 20, 0], [100, 80, 50]);
  }, 60_000);

  it('prismFront maps (y, z) and spans x0..x1', async () => {
    const model = await buildModel({
      code: `return prismFront([[0,0],[50,0],[50,20],[0,20]], -10, 30);`,
      fileName: 'prism-front.kcad.ts',
    });
    expectBounds(bounds(model.rootShape), [-10, 0, 0], [30, 50, 20]);
  }, 60_000);

  it('prismPlan maps (x, y) and spans z0..z1', async () => {
    const model = await buildModel({
      code: `return prismPlan([[0,0],[20,0],[20,10],[0,10]], 5, 15);`,
      fileName: 'prism-plan.kcad.ts',
    });
    expectBounds(bounds(model.rootShape), [0, 0, 5], [20, 10, 15]);
  }, 60_000);
});

describe('extrudeRoundedRect axis option', () => {
  const opts = { twistAngle: 0 } as const;
  it('default z keeps width X and height Y, sweeping +Z', () => {
    const s = OcctBackend.extrudeRoundedRect(40, 20, 5, 10, opts);
    expectBounds(s.boundingBox(), [-20, -10, 0], [20, 10, 10]);
  });
  it('axis x puts width on Y and height on Z, sweeping +X', () => {
    const s = OcctBackend.extrudeRoundedRect(40, 20, 5, 10, { ...opts, axis: 'x' });
    expectBounds(s.boundingBox(), [0, -20, -10], [10, 20, 10]);
  });
  it('axis y puts width on X and height on Z, sweeping +Y', () => {
    const s = OcctBackend.extrudeRoundedRect(40, 20, 5, 10, { ...opts, axis: 'y' });
    expectBounds(s.boundingBox(), [-20, 0, -10], [20, 10, 10]);
  });
});
