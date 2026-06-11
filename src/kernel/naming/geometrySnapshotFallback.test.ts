// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { findByGeometrySnapshot } from './geometrySnapshotFallback';
import { DEFAULT_SNAPSHOT_TOLERANCE } from '../backends/occt/createdRefs';
import type { HistoryMap } from './evolutionRecord';

describe('findByGeometrySnapshot', () => {
  const target = { centroid: [10, 10, 5] as [number, number, number], normal: [0, 0, 1] as [number, number, number], area: 100 };

  it('returns the single hash whose lineage.snapshot matches within tol', () => {
    const map: HistoryMap = new Map();
    map.set('h1', { rootHash: 'h1', rootFeatureId: 'f1', snapshot: target, surfaceType: 'PLANE' });
    map.set('h2', { rootHash: 'h2', rootFeatureId: 'f1', snapshot: { centroid: [0, 0, 0], normal: [1, 0, 0], area: 50 }, surfaceType: 'PLANE' });
    expect(findByGeometrySnapshot(map, target, 'PLANE', DEFAULT_SNAPSHOT_TOLERANCE).matches).toEqual(['h1']);
  });

  it('rejects matches whose surfaceType differs', () => {
    const map: HistoryMap = new Map();
    map.set('h1', { rootHash: 'h1', rootFeatureId: 'f1', snapshot: target, surfaceType: 'CYLINDRE' });
    expect(findByGeometrySnapshot(map, target, 'PLANE', DEFAULT_SNAPSHOT_TOLERANCE).matches).toEqual([]);
  });

  it('returns multiple hashes when two faces match within tolerance', () => {
    const map: HistoryMap = new Map();
    map.set('h1', { rootHash: 'h1', rootFeatureId: 'f1', snapshot: target, surfaceType: 'PLANE' });
    map.set('h2', { rootHash: 'h2', rootFeatureId: 'f1', snapshot: target, surfaceType: 'PLANE' });
    expect(findByGeometrySnapshot(map, target, 'PLANE', DEFAULT_SNAPSHOT_TOLERANCE).matches.sort()).toEqual(['h1', 'h2']);
  });

  it('returns empty when centroid drift exceeds tol', () => {
    const map: HistoryMap = new Map();
    const drifted = { centroid: [10, 10, 99] as [number, number, number], normal: [0, 0, 1] as [number, number, number], area: 100 };
    map.set('h1', { rootHash: 'h1', rootFeatureId: 'f1', snapshot: drifted, surfaceType: 'PLANE' });
    expect(findByGeometrySnapshot(map, target, 'PLANE', DEFAULT_SNAPSHOT_TOLERANCE).matches).toEqual([]);
  });

  it('returns empty when area relative-error exceeds tol', () => {
    const map: HistoryMap = new Map();
    const big = { centroid: [10, 10, 5] as [number, number, number], normal: [0, 0, 1] as [number, number, number], area: 200 };
    map.set('h1', { rootHash: 'h1', rootFeatureId: 'f1', snapshot: big, surfaceType: 'PLANE' });
    expect(findByGeometrySnapshot(map, target, 'PLANE', DEFAULT_SNAPSHOT_TOLERANCE).matches).toEqual([]);
  });
});
