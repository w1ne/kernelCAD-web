// tests/unit/intent/hermiteG2.test.ts
//
// NURBS Slice C Task 1: type-level guards for the hermiteG2(a, b) endpoint
// + container metadata. The lowerer for hermiteG2 ships in Task 5 — it
// solves the quintic Hermite system in JS and forwards 6 control points to
// Slice B's existing curve3d lowerer, so this guard fences the agent input
// before any math runs.

import { describe, it, expect } from 'vitest';
import {
  isHermiteG2Endpoint,
  isHermiteG2Metadata,
  type HermiteG2Endpoint,
  type HermiteG2Metadata,
} from '../../../src/shared/intent/hermiteG2Record';

describe('HermiteG2Endpoint', () => {
  it('accepts the minimal { point, tangent } pair', () => {
    const e: HermiteG2Endpoint = { point: [0, 0, 0], tangent: [1, 0, 0] };
    expect(isHermiteG2Endpoint(e)).toBe(true);
  });

  it('accepts curvature + weight', () => {
    const e: HermiteG2Endpoint = {
      point: [0, 0, 0],
      tangent: [1, 0, 0],
      curvature: [0, 1, 0],
      weight: 1.2,
    };
    expect(isHermiteG2Endpoint(e)).toBe(true);
  });

  it('rejects non-3D or non-finite vectors', () => {
    expect(isHermiteG2Endpoint({ point: [0, 0], tangent: [1, 0, 0] })).toBe(false);
    expect(isHermiteG2Endpoint({ point: [0, 0, NaN], tangent: [1, 0, 0] })).toBe(false);
    expect(isHermiteG2Endpoint({ point: [0, 0, 0], tangent: [1, 0, Infinity] })).toBe(false);
    expect(isHermiteG2Endpoint({
      point: [0, 0, 0], tangent: [1, 0, 0], curvature: [0, 0],
    })).toBe(false);
  });

  it('rejects non-positive or non-finite weight', () => {
    const base = { point: [0, 0, 0] as [number, number, number], tangent: [1, 0, 0] as [number, number, number] };
    expect(isHermiteG2Endpoint({ ...base, weight: 0 })).toBe(false);
    expect(isHermiteG2Endpoint({ ...base, weight: -1 })).toBe(false);
    expect(isHermiteG2Endpoint({ ...base, weight: NaN })).toBe(false);
  });

  it('rejects missing required fields', () => {
    expect(isHermiteG2Endpoint({ point: [0, 0, 0] })).toBe(false);
    expect(isHermiteG2Endpoint({ tangent: [1, 0, 0] })).toBe(false);
  });

  it('rejects non-object input', () => {
    expect(isHermiteG2Endpoint(null)).toBe(false);
    expect(isHermiteG2Endpoint('endpoint')).toBe(false);
    expect(isHermiteG2Endpoint([0, 0, 0])).toBe(false);
  });
});

describe('HermiteG2Metadata', () => {
  it('accepts a well-formed pair of endpoints', () => {
    const m: HermiteG2Metadata = {
      endA: { point: [0, 0, 0], tangent: [1, 0, 0] },
      endB: { point: [10, 0, 0], tangent: [1, 0, 0] },
    };
    expect(isHermiteG2Metadata(m)).toBe(true);
  });

  it('accepts endpoints with mismatched curvature + weight', () => {
    const m: HermiteG2Metadata = {
      endA: { point: [0, 0, 0], tangent: [1, 0, 0], curvature: [0, 1, 0], weight: 1 },
      endB: { point: [10, 0, 0], tangent: [0, 1, 0], curvature: [-1, 0, 0], weight: 2.5 },
    };
    expect(isHermiteG2Metadata(m)).toBe(true);
  });

  it('rejects when either endpoint is malformed', () => {
    expect(isHermiteG2Metadata({
      endA: { point: [0, 0, 0], tangent: [1, 0, 0] },
      endB: { point: [10, 0], tangent: [1, 0, 0] },
    })).toBe(false);
    expect(isHermiteG2Metadata({
      endA: { tangent: [1, 0, 0] },
      endB: { point: [10, 0, 0], tangent: [1, 0, 0] },
    })).toBe(false);
  });

  it('rejects non-object input', () => {
    expect(isHermiteG2Metadata(null)).toBe(false);
    expect(isHermiteG2Metadata('hermite')).toBe(false);
  });
});
