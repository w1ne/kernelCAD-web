// Q1 — Edge-level lineage parity with FaceLineage.
//
// Unit-level verification that EdgeLineage exposes the same featureId /
// featureName / featureKind slots FaceLineage already carries (per Slice F),
// and that propagateEdgeTransformHistory either preserves input lineage by
// reference (the default, "pure transform" path) or stamps a fresh
// feature-emitting feature-id onto cloned lineage entries (the "feature
// emits a new edge" path) when the caller passes outputFeatureId.
//
// Reality-vs-plan note: the plan's queryEdgeLineage.test.ts assumes an
// `evaluateScript` test helper and a populated `shape.edgeHistoryMap` on the
// OCCT backend. Neither exists in develop today — `EdgeHistoryMap` is a
// declared type with zero population sites. Q1 therefore lands the type
// surface + propagation helper as a foundation for Q3's evaluator and a
// future edge-history slice that wires per-op edge tracking through the OCCT
// backend. The unit tests below exercise exactly that surface.

import { describe, it, expect } from 'vitest';
import {
  propagateEdgeTransformHistory,
  type EdgeHistoryMap,
  type EdgeLineage,
} from './evolutionRecord';

describe('EdgeLineage parity slots — Q1', () => {
  it('accepts featureId / featureName / featureKind on construction', () => {
    const lineage: EdgeLineage = {
      rootHash: 'h1',
      rootFeatureId: 'box-1',
      labelName: 'top-front',
      featureId: 'fillet-2',
      featureName: 'rim',
      featureKind: 'fillet',
    };
    expect(lineage.featureId).toBe('fillet-2');
    expect(lineage.featureName).toBe('rim');
    expect(lineage.featureKind).toBe('fillet');
  });

  it('parity slots are optional — minimal lineage still compiles', () => {
    const minimal: EdgeLineage = { rootHash: 'h2', rootFeatureId: 'box-1' };
    expect(minimal.featureId).toBeUndefined();
    expect(minimal.featureName).toBeUndefined();
    expect(minimal.featureKind).toBeUndefined();
  });
});

describe('propagateEdgeTransformHistory — Q1', () => {
  function makeInputMap(): EdgeHistoryMap {
    const map: EdgeHistoryMap = new Map();
    map.set('e1', { rootHash: 'e1', rootFeatureId: 'box-1' });
    map.set('e2', { rootHash: 'e2', rootFeatureId: 'box-1', labelName: 'top-front' });
    return map;
  }

  it('throws when input and output edge counts disagree (caller bug guard)', () => {
    const input = makeInputMap();
    expect(() =>
      propagateEdgeTransformHistory(input, ['e1', 'e2'], ['o1']),
    ).toThrow(/edge count mismatch/);
  });

  it('default path (no outputFeatureId): preserves input lineage by reference', () => {
    const input = makeInputMap();
    const out = propagateEdgeTransformHistory(input, ['e1', 'e2'], ['o1', 'o2']);
    expect(out.size).toBe(2);
    // Identity preservation — pure transforms must not introduce a feature-id
    // stamp; downstream consumers walk back through rootFeatureId.
    expect(out.get('o1')).toBe(input.get('e1'));
    expect(out.get('o2')).toBe(input.get('e2'));
  });

  it('feature-stamp path: clones lineage and writes featureId on every output edge', () => {
    const input = makeInputMap();
    const out = propagateEdgeTransformHistory(
      input,
      ['e1', 'e2'],
      ['o1', 'o2'],
      'fillet-2',
      'fillet',
      'rim',
    );
    expect(out.size).toBe(2);
    expect(out.get('o1')).not.toBe(input.get('e1'));
    expect(out.get('o1')!.featureId).toBe('fillet-2');
    expect(out.get('o1')!.featureKind).toBe('fillet');
    expect(out.get('o1')!.featureName).toBe('rim');
    // Root provenance must survive the stamp — featureId is layered on top.
    expect(out.get('o1')!.rootFeatureId).toBe('box-1');
    expect(out.get('o1')!.rootHash).toBe('e1');
    // labelName must survive too.
    expect(out.get('o2')!.labelName).toBe('top-front');
  });

  it('feature-stamp path: featureKind and featureName remain optional', () => {
    const input = makeInputMap();
    const out = propagateEdgeTransformHistory(
      input,
      ['e1', 'e2'],
      ['o1', 'o2'],
      'fillet-2',
    );
    expect(out.get('o1')!.featureId).toBe('fillet-2');
    expect(out.get('o1')!.featureKind).toBeUndefined();
    expect(out.get('o1')!.featureName).toBeUndefined();
  });

  it('missing-input-lineage entries skip output emission (sparse-map tolerant)', () => {
    const input: EdgeHistoryMap = new Map();
    input.set('e1', { rootHash: 'e1', rootFeatureId: 'box-1' });
    // e2 deliberately absent from the input map.
    const out = propagateEdgeTransformHistory(input, ['e1', 'e2'], ['o1', 'o2']);
    expect(out.size).toBe(1);
    expect(out.has('o1')).toBe(true);
    expect(out.has('o2')).toBe(false);
  });
});
