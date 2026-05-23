import { describe, it, expect } from 'vitest';
import { measure } from '../../../src/agent/shopcheck/measure';
import type { Region } from '../../../src/shared/intent/region';

function bracketRegion(holes: number[][][] = []): Region {
  return {
    plane: { origin: [0, 0, 0], normal: [0, 0, 1] },
    outer: [[0, 0], [50, 0], [50, 25], [0, 25]],
    holes: holes as [number, number][][],
    bendLines: [],
  };
}

describe('measure (Slice E)', () => {
  it('extracts a single circular hole from a 4-vertex hole polygon', () => {
    const region = bracketRegion([
      [[10, 10], [12, 10], [12, 12], [10, 12]],
    ]);
    const b = measure(region, { thickness: 3.175, kFactor: 0.38, bends: [] }, 'bracket');
    expect(b.holes).toHaveLength(1);
    expect(b.holes[0].diameter).toBeCloseTo(2, 0);
    expect(b.holes[0].ref).toBe('@kc[bracket/face/top/hole/0]');
  });

  it('emits @kc[<part>] as the partRef', () => {
    const b = measure(bracketRegion(), { thickness: 1, kFactor: 0.38, bends: [] }, 'bracket');
    expect(b.partRef).toBe('@kc[bracket]');
  });

  it('emits an @kc ref for each bend with the source bend ordinal', () => {
    const region: Region = {
      plane: { origin: [0, 0, 0], normal: [0, 0, 1] },
      outer: [[0, 0], [50, 0], [50, 25], [0, 25]],
      holes: [],
      bendLines: [{ start: [25, 0], end: [25, 25], angle: 90, radius: 1, ordinal: 0 }],
    };
    const b = measure(region, {
      thickness: 1.5, kFactor: 0.38,
      bends: [{ ordinal: 0, featureId: 'f1', angle: 90, radius: 1, bendAllowance: 0, axisOrigin: [25, 0, 0], axisDirection: [0, 1, 0] }],
    }, 'bracket');
    expect(b.bends).toHaveLength(1);
    // TopoKind doesn't yet include 'bend'; using face + segments ['bend', '<ordinal>']
    expect(b.bends[0].ref).toBe('@kc[bracket/face/bend/0]');
    expect(b.bends[0].radius).toBe(1);
    expect(b.bends[0].angle).toBe(90);
  });

  it('computes aabb from the outer polygon', () => {
    const b = measure(bracketRegion(), { thickness: 1, kFactor: 0.38, bends: [] }, 'bracket');
    expect(b.aabb.min).toEqual([0, 0]);
    expect(b.aabb.max).toEqual([50, 25]);
  });

  it('reports a slot when a hole polygon has aspect ratio >= 2', () => {
    const region = bracketRegion([
      [[10, 10], [30, 10], [30, 12], [10, 12]],
    ]);
    const b = measure(region, { thickness: 1, kFactor: 0.38, bends: [] }, 'bracket');
    expect(b.slots).toHaveLength(1);
    expect(b.slots[0].width).toBeCloseTo(2, 0);
    expect(b.slots[0].length).toBeCloseTo(20, 0);
    expect(b.slots[0].ref).toMatch(/^@kc\[bracket\/face\/top\/slot\/\d+\]$/);
  });
});
