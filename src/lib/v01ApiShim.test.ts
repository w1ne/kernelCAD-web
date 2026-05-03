import { describe, it, expect, beforeAll } from 'vitest';
import * as replicad from 'replicad';
import { initOcct } from '../backends/occt/occtBackend';
import { createV01ApiGlobals, unwrapV01Shape } from './v01ApiShim';

beforeAll(async () => {
  await initOcct();
});

function countFaces(shape: unknown): number {
  const raw = unwrapV01Shape(shape) as { faces?: ArrayLike<unknown> };
  return raw.faces ? Array.from(raw.faces).length : 0;
}

describe('v01ApiShim — fillet/chamfer face refs', () => {
  it('box(50,50,8).fillet(2, { face: "top" }) produces filleted top edges (≥ 10 faces)', () => {
    const { box } = createV01ApiGlobals(replicad);
    const shape = (box(50, 50, 8) as { fillet: (r: number, f: { face: string }) => unknown })
      .fillet(2, { face: 'top' });
    // Box has 6 faces; rounded top adds 4 cylindrical fillet faces — total ≥ 10.
    expect(countFaces(shape)).toBeGreaterThanOrEqual(10);
  });

  it('full v0.2 demo script runs end-to-end without throwing', () => {
    const { box, cylinder } = createV01ApiGlobals(replicad);
    const plate = box(50, 50, 8) as { subtract: (s: unknown) => unknown };
    const hole = (cylinder(10, 6) as { translate: (x: number, y: number, z: number) => unknown })
      .translate(25, 25, -1);
    const carved = plate.subtract(hole) as { fillet: (r: number, f: { face: string }) => unknown };
    expect(() => carved.fillet(1.5, { face: 'top' })).not.toThrow();
  });

  it('rotated shape + canonical face throws clear deferred-feature error', () => {
    const { box } = createV01ApiGlobals(replicad);
    const rotated = (box(20, 20, 20) as { rotate: (axis: number[], deg: number) => unknown })
      .rotate([1, 0, 0], 30);
    expect(() =>
      (rotated as { fillet: (r: number, f: { face: string }) => unknown })
        .fillet(2, { face: 'top' })
    ).toThrow(/canonical face refs.*rotated.*deferred/i);
  });

  it('raw EdgeFinder filter passes through unchanged', () => {
    const { box } = createV01ApiGlobals(replicad);
    const finder = (e: replicad.EdgeFinder) => e.inPlane('XY', 8);
    const shape = (box(20, 20, 8) as { fillet: (r: number, f: unknown) => unknown })
      .fillet(1, finder);
    expect(countFaces(shape)).toBeGreaterThanOrEqual(6);
  });
});
