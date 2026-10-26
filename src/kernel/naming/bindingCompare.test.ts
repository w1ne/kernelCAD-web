// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { BindingFingerprint, SelectionRecord } from '../../shared/intent/selectionRecord';
import { compareFingerprints, compareSelections } from './bindingCompare';

const top = (over: Partial<BindingFingerprint> = {}): BindingFingerprint => ({
  entityKind: 'face', geomType: 'PLANE', producer: 'box_1', role: 'top',
  direction: [0, 0, 1], size: 1000, centroid: [0, 0, 10], ...over,
});
const DIAG = 100;

const tilted = (deg: number): [number, number, number] => {
  const r = (deg * Math.PI) / 180;
  return [Math.sin(r), 0, Math.cos(r)];
};

describe('compareFingerprints', () => {
  it('is silent for an identical entity', () => {
    expect(compareFingerprints(top(), top(), DIAG).verdict).toBe('same');
  });

  it('is silent for sub-threshold drift', () => {
    const r = compareFingerprints(top(), top({ size: 1005, centroid: [0, 0, 10.005], direction: tilted(0.5) }), DIAG);
    expect(r.verdict).toBe('same');
  });

  it('reports moved for a resize or shift of the same face', () => {
    expect(compareFingerprints(top(), top({ size: 1200 }), DIAG).verdict).toBe('moved');
    expect(compareFingerprints(top(), top({ centroid: [0, 0, 12] }), DIAG).deltas.centroidMm).toBeCloseTo(2);
  });

  it('reports moved for a 1 to 10 degree direction change', () => {
    const r = compareFingerprints(top(), top({ direction: tilted(5) }), DIAG);
    expect(r.verdict).toBe('moved');
    expect(r.deltas.angleDeg).toBeCloseTo(5);
  });

  it('reports changed for a direction change above 10 degrees and for a flip', () => {
    expect(compareFingerprints(top(), top({ direction: tilted(15) }), DIAG).verdict).toBe('changed');
    expect(compareFingerprints(top(), top({ direction: [0, 0, -1] }), DIAG).verdict).toBe('changed');
  });

  it('reports changed for another producer, kind, type or name', () => {
    expect(compareFingerprints(top(), top({ producer: 'extrude_2' }), DIAG).verdict).toBe('changed');
    expect(compareFingerprints(top(), top({ geomType: 'CYLINDRE' }), DIAG).verdict).toBe('changed');
    expect(compareFingerprints(top(), top({ entityKind: 'edge' }), DIAG).verdict).toBe('changed');
    expect(compareFingerprints(top(), top({ role: 'bottom' }), DIAG).verdict).toBe('changed');
  });

  it('scales the centroid tolerance to the part', () => {
    const shifted = top({ centroid: [0, 0, 10.5] });
    expect(compareFingerprints(top(), shifted, 100).verdict).toBe('moved');
    expect(compareFingerprints(top(), shifted, 2000).verdict).toBe('same');
  });

  it('treats an edge tangent as an axis, not a signed direction', () => {
    const e = (d: [number, number, number]): BindingFingerprint => ({
      entityKind: 'edge', geomType: 'LINE', direction: d, size: 10, centroid: [0, 0, 0],
    });
    expect(compareFingerprints(e([1, 0, 0]), e([-1, 0, 0]), DIAG).verdict).toBe('same');
  });

  it('reports a radius change above 1 percent as moved, never changed', () => {
    const c = (radius: number): BindingFingerprint => ({
      entityKind: 'face', geomType: 'CYLINDRE', direction: [1, 0, 0], radius, size: 100, centroid: [0, 0, 0],
    });
    expect(compareFingerprints(c(5), c(5.2), DIAG).verdict).toBe('moved');
    expect(compareFingerprints(c(5), c(50), DIAG).verdict).toBe('moved');
  });
});

describe('compareSelections', () => {
  const sel = (fingerprints: BindingFingerprint[]): SelectionRecord => ({
    consumerFeatureId: 'fillet_2', selectorText: 'q', syntax: 'query', fingerprints, partDiagonal: DIAG,
  });

  it('pairs by identity then nearest centroid', () => {
    const a = top({ centroid: [0, 0, 10] });
    const b = top({ centroid: [0, 0, 20] });
    const pairs = compareSelections(sel([a, b]), sel([top({ centroid: [0, 0, 20.5] }), top({ centroid: [0, 0, 10.2] })]));
    expect(pairs.map(p => p.comparison.verdict)).toEqual(['moved', 'moved']);
    expect(pairs[0]!.after!.centroid[2]).toBeCloseTo(10.2);
  });

  it('pairs a re-bound entity so old and new are both named', () => {
    const pairs = compareSelections(sel([top()]), sel([top({ role: 'bottom', direction: [0, 0, -1], centroid: [0, 0, 0] })]));
    expect(pairs).toHaveLength(1);
    expect(pairs[0]!.comparison.verdict).toBe('changed');
    expect(pairs[0]!.before!.role).toBe('top');
    expect(pairs[0]!.after!.role).toBe('bottom');
  });

  it('reports vanished and newly selected entities as changed', () => {
    expect(compareSelections(sel([top()]), sel([]))[0]!.comparison.verdict).toBe('changed');
    expect(compareSelections(sel([]), sel([top()]))[0]!.comparison.verdict).toBe('changed');
  });
});
