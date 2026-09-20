import { describe, it, expect } from 'vitest';
import type { ShapeBackend } from '../../../src/kernel/backends/backend';
import { detectCompoundInterferences } from '../../../src/modeling/runtime/detectInterferences';
import type { CompilerDiagnostic } from '../../../src/shared/diagnostics/diagnostic';

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
    expect(r.scope).toBe('compound');
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

  it('skips ignored pairs without measuring them', () => {
    const r = detectCompoundInterferences(
      stubCompound([stubSolid(5), stubSolid(5)]),
      0.01,
      new Set(['solid[0]\tsolid[1]']),
    );
    expect(r.pairs).toHaveLength(0);
    expect(r.comparisonCount).toBe(0);
  });

  it('treats exactly-epsilon overlaps as touching', () => {
    const r = detectCompoundInterferences(stubCompound([stubSolid(0.01), stubSolid(0)]), 0.01, new Set());
    expect(r.pairs).toHaveLength(0);
    expect(r.comparisonCount).toBe(1);
  });

  it('reports a warn diagnostic when the volume probe throws', () => {
    const throwing = {
      boundingBox: () => ({ min: [0, 0, 0] as [number, number, number], max: [10, 10, 10] as [number, number, number] }),
      intersectionVolume: () => { throw new Error('boom'); },
    } as unknown as ShapeBackend;
    const diagnostics: CompilerDiagnostic[] = [];

    const r = detectCompoundInterferences(
      stubCompound([throwing, stubSolid(0)]),
      0.01,
      new Set(),
      diagnostics,
    );

    expect(r.pairs).toHaveLength(0);
    expect(r.comparisonCount).toBe(1);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].code).toBe('feature.kernel-failed');
    expect(diagnostics[0].severity).toBe('warn');
    expect(diagnostics[0].message).toContain('(solid[0], solid[1])');
  });
});
