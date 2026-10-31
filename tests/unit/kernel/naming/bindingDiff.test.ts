// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { BindingFingerprint, SelectionRecord } from '../../../../src/shared/intent/selectionRecord';
import { diffSelectionBindings } from '../../../../src/kernel/naming/bindingDiff';

const top = (over: Partial<BindingFingerprint> = {}): BindingFingerprint => ({
  entityKind: 'face', geomType: 'PLANE', producer: 'box_1', role: 'top',
  direction: [0, 0, 1], size: 1000, centroid: [0, 0, 10], ...over,
});

const selection = (
  fingerprints: BindingFingerprint[],
  over: Partial<SelectionRecord> = {},
): SelectionRecord => ({
  consumerFeatureId: 'fillet_2',
  selectorText: 'q.face({ parallel: "Z" })',
  syntax: 'query',
  fingerprints,
  partDiagonal: 100,
  ...over,
});

describe('diffSelectionBindings (S6)', () => {
  it('omits unchanged selectors', () => {
    expect(diffSelectionBindings([selection([top()])], [selection([top()])])).toEqual([]);
  });

  it('reports a moved binding with its delta', () => {
    const changes = diffSelectionBindings(
      [selection([top()])],
      [selection([top({ size: 1200 })])],
    );
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      consumerFeatureId: 'fillet_2',
      verdict: 'moved',
      occurrence: 0,
    });
    expect(changes[0]!.pairs[0]!.deltas.sizeRelative).toBeCloseTo(0.2);
  });

  it('reports a re-bound selector as changed and names old and new producers', () => {
    const changes = diffSelectionBindings(
      [selection([top()])],
      [selection([top({ producer: 'box_2' })])],
    );
    expect(changes).toHaveLength(1);
    expect(changes[0]!.verdict).toBe('changed');
    expect(changes[0]!.pairs[0]).toMatchObject({
      reasons: ['producing feature box_1 -> box_2'],
      before: { producer: 'box_1' },
      after: { producer: 'box_2' },
    });
  });

  it('pairs duplicate selectors by occurrence', () => {
    const before = selection([top()], { consumerFeatureId: 'a' });
    const afterMoved = selection([top({ size: 1200 })], { consumerFeatureId: 'a' });
    const changes = diffSelectionBindings(
      [before, { ...before, consumerFeatureId: 'b' }],
      [afterMoved, { ...afterMoved, consumerFeatureId: 'b' }],
    );
    expect(changes.map((c) => c.consumerFeatureId)).toEqual(['a', 'b']);
    expect(changes.every((c) => c.occurrence === 0)).toBe(true);
  });
});
