import { describe, it, expect } from 'vitest';
import type { ShapeBackend } from '../../../src/kernel/backends/backend';
import { detectCompoundInterferences } from '../../../src/modeling/runtime/detectInterferences';

function stubSolid(volumeMm3: number, max: [number, number, number] = [10, 10, 10]) {
  return {
    boundingBox: () => ({ min: [0, 0, 0] as [number, number, number], max }),
    intersectionVolume: () => volumeMm3,
  } as unknown as ShapeBackend;
}

function stubCompound(solids: ShapeBackend[]): ShapeBackend {
  return { solidComponents: () => solids } as unknown as ShapeBackend;
}

describe('detectCompoundInterferences', () => {
  it('reports a pair above epsilon with solid[i] names', () => {
    const r = detectCompoundInterferences(stubCompound([stubSolid(5), stubSolid(0)]), 0.01, new Set());
    expect(r.partCount).toBe(2);
    expect(r.pairs).toHaveLength(1);
    expect(r.pairs[0]).toEqual({ a: 'solid[0]', b: 'solid[1]', volumeMm3: 5 });
  });

  it('ignores sub-epsilon intersections', () => {
    const r = detectCompoundInterferences(stubCompound([stubSolid(0.001), stubSolid(0)]), 0.01, new Set());
    expect(r.pairs).toHaveLength(0);
    expect(r.comparisonCount).toBe(1);
  });

  it('skips pairs whose bounding boxes do not overlap', () => {
    const r = detectCompoundInterferences(
      stubCompound([stubSolid(5), stubSolid(5, [-1, -1, -1])]),
      0.01,
      new Set(),
    );
    expect(r.pairs).toHaveLength(0);
    expect(r.comparisonCount).toBe(0);
  });
});
