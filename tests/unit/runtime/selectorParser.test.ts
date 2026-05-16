// tests/unit/runtime/selectorParser.test.ts
//
// Phase-4 unit tests for the slice-2 selector parser + resolver.

import { describe, it, expect } from 'vitest';
import {
  parseFaceSelector,
  findLineageMatches,
  findFallbackSnapshot,
  resolveBySnapshot,
} from '../../../src/runtime/selectorParser';
import type { HistoryMap } from '../../../src/kernel/naming/evolutionRecord';
import type { FaceSnapshot } from '../../../src/kernel/backends/occt/createdRefs';

const sampleSnap: FaceSnapshot = { centroid: [1, 2, 3], normal: [0, 0, 1], area: 100 };

describe('parseFaceSelector', () => {
  it('parses bare label as collective', () => {
    const p = parseFaceSelector('wall');
    expect(p).toEqual({ kind: 'collective', refName: 'wall' });
  });

  it('parses <name>.<ref> as named', () => {
    const p = parseFaceSelector('mountingBolt.wall');
    expect(p).toEqual({ kind: 'named', featureName: 'mountingBolt', refName: 'wall' });
  });

  it('parses hyphenated ref names', () => {
    const p = parseFaceSelector('mountingBolt.wall-back');
    expect(p).toEqual({ kind: 'named', featureName: 'mountingBolt', refName: 'wall-back' });
  });

  it('parses multi-segment ref names (counterbore-floor)', () => {
    const p = parseFaceSelector('a.counterbore-floor');
    expect(p).toEqual({ kind: 'named', featureName: 'a', refName: 'counterbore-floor' });
  });

  it('parses <name>[i].<ref> with explicit index', () => {
    const p = parseFaceSelector('cornerBolts[2].wall');
    expect(p).toEqual({ kind: 'named', featureName: 'cornerBolts', refName: 'wall', index: 2 });
  });

  it('parses ordinal form hole1.wall', () => {
    const p = parseFaceSelector('hole1.wall');
    expect(p).toEqual({ kind: 'ordinal', featureKind: 'hole', n: 1, refName: 'wall' });
  });

  it('parses ordinal form holes2.wall', () => {
    const p = parseFaceSelector('holes2.wall');
    expect(p).toEqual({ kind: 'ordinal', featureKind: 'holes', n: 2, refName: 'wall' });
  });

  it('parses ordinal form cutout3.floor', () => {
    const p = parseFaceSelector('cutout3.floor');
    expect(p).toEqual({ kind: 'ordinal', featureKind: 'cutout', n: 3, refName: 'floor' });
  });

  it('treats holed.wall as a named feature, not an ordinal (no trailing digit)', () => {
    const p = parseFaceSelector('holed.wall');
    expect(p).toEqual({ kind: 'named', featureName: 'holed', refName: 'wall' });
  });

  it('treats prefix that starts with a kind but has non-digit suffix as named', () => {
    const p = parseFaceSelector('holeFoo.wall');
    expect(p).toEqual({ kind: 'named', featureName: 'holeFoo', refName: 'wall' });
  });
});

describe('findLineageMatches', () => {
  it('matches collective label across multiple lineage entries', () => {
    const map: HistoryMap = new Map();
    map.set('h1', { rootHash: 'h1', rootFeatureId: 'f1', labelName: 'wall' });
    map.set('h2', { rootHash: 'h2', rootFeatureId: 'f2', labelName: 'wall' });
    map.set('h3', { rootHash: 'h3', rootFeatureId: 'f3', labelName: 'floor' });
    const out = findLineageMatches(map, { kind: 'collective', refName: 'wall' });
    expect(out.sort()).toEqual(['h1', 'h2']);
  });

  it('matches named selector by featureName + labelName', () => {
    const map: HistoryMap = new Map();
    map.set('h1', { rootHash: 'h1', rootFeatureId: 'f', labelName: 'wall', featureName: 'a', featureKind: 'hole' });
    map.set('h2', { rootHash: 'h2', rootFeatureId: 'f', labelName: 'wall', featureName: 'b', featureKind: 'hole' });
    const out = findLineageMatches(map, { kind: 'named', featureName: 'a', refName: 'wall' });
    expect(out).toEqual(['h1']);
  });

  it('matches ordinal selector by featureKind + featureOrdinal + labelName', () => {
    const map: HistoryMap = new Map();
    map.set('h1', { rootHash: 'h1', rootFeatureId: 'f', labelName: 'wall', featureKind: 'hole', featureOrdinal: 1 });
    map.set('h2', { rootHash: 'h2', rootFeatureId: 'f', labelName: 'wall', featureKind: 'hole', featureOrdinal: 2 });
    const out = findLineageMatches(map, { kind: 'ordinal', featureKind: 'hole', n: 2, refName: 'wall' });
    expect(out).toEqual(['h2']);
  });

  it('returns empty for ordinal selector when no matching ordinal exists', () => {
    const map: HistoryMap = new Map();
    map.set('h1', { rootHash: 'h1', rootFeatureId: 'f', labelName: 'wall', featureKind: 'hole', featureOrdinal: 1 });
    const out = findLineageMatches(map, { kind: 'ordinal', featureKind: 'hole', n: 5, refName: 'wall' });
    expect(out).toEqual([]);
  });
});

describe('findFallbackSnapshot', () => {
  it('returns the named feature snapshot when present', () => {
    const map: HistoryMap = new Map();
    map.set('h1', { rootHash: 'h1', rootFeatureId: 'f', featureName: 'a', snapshot: sampleSnap });
    const result = findFallbackSnapshot(map, { kind: 'named', featureName: 'a', refName: 'wall' });
    expect(result).toEqual(sampleSnap);
  });

  it('returns null when no lineage entry matches the name', () => {
    const map: HistoryMap = new Map();
    map.set('h1', { rootHash: 'h1', rootFeatureId: 'f', featureName: 'b', snapshot: sampleSnap });
    const result = findFallbackSnapshot(map, { kind: 'named', featureName: 'a', refName: 'wall' });
    expect(result).toBeNull();
  });

  it('returns null for collective form (no fallback for unnamed selectors)', () => {
    const map: HistoryMap = new Map();
    map.set('h1', { rootHash: 'h1', rootFeatureId: 'f', labelName: 'wall', snapshot: sampleSnap });
    const result = findFallbackSnapshot(map, { kind: 'collective', refName: 'wall' });
    expect(result).toBeNull();
  });
});

describe('resolveBySnapshot', () => {
  it('returns the matching face hash when one entry matches all three tolerances', () => {
    const map: HistoryMap = new Map();
    map.set('h1', { rootHash: 'h1', rootFeatureId: 'f',
      snapshot: { centroid: [10, 20, 30], normal: [0, 0, 1], area: 100 } });
    map.set('h2', { rootHash: 'h2', rootFeatureId: 'f',
      snapshot: { centroid: [-10, 20, 30], normal: [0, 0, 1], area: 100 } });
    const out = resolveBySnapshot(map, { centroid: [10, 20, 30], normal: [0, 0, 1], area: 100 });
    expect(out).toEqual(['h1']);
  });

  it('returns multiple matches when tolerance encompasses both', () => {
    const map: HistoryMap = new Map();
    map.set('h1', { rootHash: 'h1', rootFeatureId: 'f',
      snapshot: { centroid: [10, 20, 30], normal: [0, 0, 1], area: 100 } });
    map.set('h2', { rootHash: 'h2', rootFeatureId: 'f',
      snapshot: { centroid: [10.001, 20.001, 30], normal: [0, 0, 1], area: 100 } });
    const out = resolveBySnapshot(map, { centroid: [10, 20, 30], normal: [0, 0, 1], area: 100 });
    expect(out.sort()).toEqual(['h1', 'h2']);
  });

  it('rejects matches outside centroid tolerance', () => {
    const map: HistoryMap = new Map();
    map.set('h1', { rootHash: 'h1', rootFeatureId: 'f',
      snapshot: { centroid: [10, 20, 30], normal: [0, 0, 1], area: 100 } });
    const out = resolveBySnapshot(map, { centroid: [10, 20, 35], normal: [0, 0, 1], area: 100 });
    expect(out).toEqual([]);
  });

  it('rejects matches outside normal tolerance (different normal)', () => {
    const map: HistoryMap = new Map();
    map.set('h1', { rootHash: 'h1', rootFeatureId: 'f',
      snapshot: { centroid: [10, 20, 30], normal: [1, 0, 0], area: 100 } });
    const out = resolveBySnapshot(map, { centroid: [10, 20, 30], normal: [0, 0, 1], area: 100 });
    expect(out).toEqual([]);
  });

  it('rejects matches outside area tolerance', () => {
    const map: HistoryMap = new Map();
    map.set('h1', { rootHash: 'h1', rootFeatureId: 'f',
      snapshot: { centroid: [10, 20, 30], normal: [0, 0, 1], area: 100 } });
    const out = resolveBySnapshot(map, { centroid: [10, 20, 30], normal: [0, 0, 1], area: 200 });
    expect(out).toEqual([]);
  });
});
