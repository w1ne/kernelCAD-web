// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The geometry-snapshot fallback of a `<name>.<ref>` / `<kind><N>.<ref>`
// selector must use the snapshot of the face that was asked for. It used to
// take the first snapshot of ANY face of the feature, so `pocket.typo`
// silently bound to an unrelated face of `pocket`.

import { describe, it, expect } from 'vitest';
import type { FaceLineage, HistoryMap } from './evolutionRecord';
import {
  availableRefNames,
  findFallbackLineage,
  findFallbackSnapshot,
  notResolvableHint,
  parseFaceSelector,
} from './selectorParser';

const snap = (z: number) => ({ centroid: [0, 0, z] as [number, number, number], normal: [0, 0, 1] as [number, number, number], area: 96 });

function lineage(labelName: string, z: number, extra: Partial<FaceLineage> = {}): FaceLineage {
  return { rootHash: `r${z}`, rootFeatureId: 'box1', labelName, snapshot: snap(z), surfaceType: 'PLANE', ...extra };
}

const map: HistoryMap = new Map([
  ['w1', lineage('wall', 17, { featureName: 'pocket', featureKind: 'cutout', featureOrdinal: 1 })],
  ['f1', lineage('floor', 15, { featureName: 'pocket', featureKind: 'cutout', featureOrdinal: 1 })],
  ['h1', lineage('wall', 3, { featureKind: 'hole', featureOrdinal: 1, surfaceType: 'CYLINDRE' })],
]);

describe('selector snapshot fallback', () => {
  it('takes the snapshot of the requested ref, not the first face of the feature', () => {
    expect(findFallbackSnapshot(map, parseFaceSelector('pocket.floor'))?.centroid[2]).toBe(15);
    expect(findFallbackSnapshot(map, parseFaceSelector('pocket.wall'))?.centroid[2]).toBe(17);
    expect(findFallbackLineage(map, parseFaceSelector('hole1.wall'))?.surfaceType).toBe('CYLINDRE');
  });

  it('has no fallback for a ref the feature never created', () => {
    expect(findFallbackSnapshot(map, parseFaceSelector('pocket.nosuch'))).toBeNull();
    expect(findFallbackSnapshot(map, parseFaceSelector('hole1.floor'))).toBeNull();
    expect(findFallbackSnapshot(map, parseFaceSelector('cutout2.wall'))).toBeNull();
    expect(findFallbackSnapshot(map, parseFaceSelector('wall'))).toBeNull();
  });

  it('lists the refs a feature carries for the not-resolvable hint', () => {
    expect(availableRefNames(map, parseFaceSelector('pocket.nosuch'))).toEqual(['floor', 'wall']);
    expect(availableRefNames(map, parseFaceSelector('hole1.top'))).toEqual(['wall']);
    expect(availableRefNames(map, parseFaceSelector('other.floor'))).toEqual([]);
    expect(notResolvableHint('pocket.nosuch', ['floor', 'wall'])).toContain('floor, wall');
    expect(notResolvableHint('other.floor', [])).toContain('consumed by an upstream op');
  });
});
