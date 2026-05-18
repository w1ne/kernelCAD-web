// tests/unit/intent/coonsPatch.test.ts
//
// NURBS Slice C Task 1: type-level guard for the surfaceFromBoundary (Coons
// patch) capture metadata. Mirrors the Slice B guard tests in spirit — the
// guard never touches OCCT; it just fences malformed agent inputs before
// the lazy lowerer touches the WASM bindings.

import { describe, it, expect } from 'vitest';
import {
  isCoonsPatchMetadata,
  type CoonsPatchMetadata,
} from '../../../src/shared/intent/coonsPatchRecord';
import {
  isFilletContinuity,
} from '../../../src/shared/intent/filletContinuityRecord';
import type { FeatureId } from '../../../src/shared/intent/types';

const fid = (s: string) => s as FeatureId;
const fref = (id: string) => ({ kind: 'feature' as const, id: fid(id) });

describe('CoonsPatchMetadata', () => {
  it('accepts a minimal 4-curve patch with default C0 continuity', () => {
    const m: CoonsPatchMetadata = {
      curveRefs: [fref('c1'), fref('c2'), fref('c3'), fref('c4')],
      continuity: 'C0',
    };
    expect(isCoonsPatchMetadata(m)).toBe(true);
  });

  it('accepts uvDegree + neighbors', () => {
    const m: CoonsPatchMetadata = {
      curveRefs: [fref('c1'), fref('c2'), fref('c3'), fref('c4')],
      continuity: 'C2',
      uvDegree: { u: 3, v: 5 },
      neighbors: { bottom: fref('s_below'), top: fref('s_above') },
    };
    expect(isCoonsPatchMetadata(m)).toBe(true);
  });

  it('rejects fewer or more than 4 curve refs', () => {
    expect(isCoonsPatchMetadata({
      curveRefs: [fref('c1'), fref('c2'), fref('c3')],
      continuity: 'C0',
    })).toBe(false);
    expect(isCoonsPatchMetadata({
      curveRefs: [fref('c1'), fref('c2'), fref('c3'), fref('c4'), fref('c5')],
      continuity: 'C0',
    })).toBe(false);
  });

  it('rejects malformed FeatureRef entries', () => {
    expect(isCoonsPatchMetadata({
      curveRefs: ['c1', 'c2', 'c3', 'c4'],
      continuity: 'C0',
    })).toBe(false);
    expect(isCoonsPatchMetadata({
      curveRefs: [fref('c1'), null, fref('c3'), fref('c4')],
      continuity: 'C0',
    })).toBe(false);
  });

  it('rejects unknown continuity values', () => {
    expect(isCoonsPatchMetadata({
      curveRefs: [fref('c1'), fref('c2'), fref('c3'), fref('c4')],
      continuity: 'C5',
    })).toBe(false);
    // G-grades belong on Shape.fillet, not on Coons-patch boundaries
    // (no neighbour surface = G/C indistinguishable).
    expect(isCoonsPatchMetadata({
      curveRefs: [fref('c1'), fref('c2'), fref('c3'), fref('c4')],
      continuity: 'G2',
    })).toBe(false);
  });

  it('rejects out-of-range or non-integer uvDegree entries', () => {
    const base = {
      curveRefs: [fref('c1'), fref('c2'), fref('c3'), fref('c4')],
      continuity: 'C0' as const,
    };
    expect(isCoonsPatchMetadata({ ...base, uvDegree: { u: 0, v: 3 } })).toBe(false);
    expect(isCoonsPatchMetadata({ ...base, uvDegree: { u: 3, v: 9 } })).toBe(false);
    expect(isCoonsPatchMetadata({ ...base, uvDegree: { u: 2.5, v: 3 } })).toBe(false);
    expect(isCoonsPatchMetadata({ ...base, uvDegree: { u: 3 } })).toBe(false);
  });

  it('rejects unknown neighbour keys', () => {
    const base = {
      curveRefs: [fref('c1'), fref('c2'), fref('c3'), fref('c4')],
      continuity: 'C0' as const,
    };
    expect(isCoonsPatchMetadata({
      ...base,
      neighbors: { sideways: fref('s_side') },
    })).toBe(false);
  });

  it('rejects non-object input', () => {
    expect(isCoonsPatchMetadata(null)).toBe(false);
    expect(isCoonsPatchMetadata('coons')).toBe(false);
    expect(isCoonsPatchMetadata(42)).toBe(false);
  });
});

describe('isFilletContinuity', () => {
  it('accepts G1 and G2', () => {
    expect(isFilletContinuity('G1')).toBe(true);
    expect(isFilletContinuity('G2')).toBe(true);
  });

  it('rejects C-grades, lowercase, undefined, and non-string input', () => {
    expect(isFilletContinuity('C2')).toBe(false);
    expect(isFilletContinuity('g2')).toBe(false);
    expect(isFilletContinuity(undefined)).toBe(false);
    expect(isFilletContinuity(null)).toBe(false);
    expect(isFilletContinuity(2)).toBe(false);
  });
});
