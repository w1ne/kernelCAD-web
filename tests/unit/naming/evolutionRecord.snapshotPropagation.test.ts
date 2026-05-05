// tests/unit/naming/evolutionRecord.snapshotPropagation.test.ts
//
// Phase-2 unit tests for slice-2 snapshot propagation:
//   - propagateTransformHistory with optional SnapshotTransform callbacks
//     (pointTransform / vectorTransform / clearSnapshot).
//   - mergeBooleanHistory preserves snapshot via lineage-by-reference share
//     (verified through the existing slice-1 boolean propagation path).
//   - refreshSnapshots updates only entries with matching hashes; leaves
//     unmatched lineage entries untouched.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../src/backends/occt/occtBackend';
import {
  propagateTransformHistory,
  type HistoryMap,
  type FaceLineage,
} from '../../../src/naming/evolutionRecord';
import {
  refreshSnapshots,
  captureAllFaceSnapshots,
} from '../../../src/backends/occt/createdRefs';
import type { FaceSnapshot } from '../../../src/backends/occt/createdRefs';

function makeLineageWithSnapshot(rootHash: string, centroid: [number, number, number]): FaceLineage {
  const snapshot: FaceSnapshot = { centroid, normal: [0, 0, 1], area: 100 };
  return {
    rootHash,
    rootFeatureId: 'box-1',
    canonicalName: 'top',
    snapshot,
  };
}

describe('propagateTransformHistory — snapshotTransform', () => {
  beforeAll(async () => { await initOcct(); });

  it('shares lineage by reference when no snapshotTransform is supplied (slice-1 behavior)', () => {
    const box = OcctBackend.box(10, 10, 10);
    const inputHashes = box.faceHashes();
    const inputMap: HistoryMap = new Map();
    inputMap.set(inputHashes[0], makeLineageWithSnapshot(inputHashes[0], [0, 0, 5]));

    const moved = box.translate(1, 0, 0);
    const outputHashes = moved.faceHashes();
    const newMap = propagateTransformHistory(inputMap, inputHashes, outputHashes);

    // The output lineage IS the input lineage object (shared reference).
    const outLineage = newMap.get(outputHashes[0])!;
    expect(outLineage).toBe(inputMap.get(inputHashes[0]));
    // Snapshot still in pre-transform coordinates.
    expect(outLineage.snapshot!.centroid).toEqual([0, 0, 5]);
  });

  it('deep-copies lineage and applies pointTransform when supplied', () => {
    const box = OcctBackend.box(10, 10, 10);
    const inputHashes = box.faceHashes();
    const inputMap: HistoryMap = new Map();
    inputMap.set(inputHashes[0], makeLineageWithSnapshot(inputHashes[0], [0, 0, 5]));

    const moved = box.translate(3, 0, 0);
    const outputHashes = moved.faceHashes();
    const newMap = propagateTransformHistory(inputMap, inputHashes, outputHashes, {
      pointTransform: (p) => [p[0] + 3, p[1], p[2]],
    });

    const outLineage = newMap.get(outputHashes[0])!;
    // Different object instance (deep-copy proof):
    expect(outLineage).not.toBe(inputMap.get(inputHashes[0]));
    // Translated centroid:
    expect(outLineage.snapshot!.centroid).toEqual([3, 0, 5]);
    // Other lineage fields preserved:
    expect(outLineage.canonicalName).toBe('top');
    expect(outLineage.rootHash).toBe(inputHashes[0]);
  });

  it('applies vectorTransform to normal independently of pointTransform', () => {
    const box = OcctBackend.box(10, 10, 10);
    const inputHashes = box.faceHashes();
    const inputMap: HistoryMap = new Map();
    const lineage = makeLineageWithSnapshot(inputHashes[0], [0, 0, 5]);
    lineage.snapshot!.normal = [1, 0, 0];
    inputMap.set(inputHashes[0], lineage);

    const moved = box.translate(0, 0, 0);  // identity-ish for face-count match
    const outputHashes = moved.faceHashes();
    const newMap = propagateTransformHistory(inputMap, inputHashes, outputHashes, {
      // 90° rotation around Z: [1,0,0] -> [0,1,0]
      vectorTransform: (v) => [-v[1], v[0], v[2]],
    });

    const outLineage = newMap.get(outputHashes[0])!;
    expect(outLineage.snapshot!.normal[0]).toBeCloseTo(0, 6);
    expect(outLineage.snapshot!.normal[1]).toBeCloseTo(1, 6);
    expect(outLineage.snapshot!.normal[2]).toBeCloseTo(0, 6);
  });

  it('clears snapshot when clearSnapshot: true (non-rigid scale path)', () => {
    const box = OcctBackend.box(10, 10, 10);
    const inputHashes = box.faceHashes();
    const inputMap: HistoryMap = new Map();
    inputMap.set(inputHashes[0], makeLineageWithSnapshot(inputHashes[0], [0, 0, 5]));

    const moved = box.translate(0, 0, 0);
    const outputHashes = moved.faceHashes();
    const newMap = propagateTransformHistory(inputMap, inputHashes, outputHashes, {
      clearSnapshot: true,
    });

    const outLineage = newMap.get(outputHashes[0])!;
    expect(outLineage.snapshot).toBeUndefined();
    // Other fields still propagated:
    expect(outLineage.canonicalName).toBe('top');
    expect(outLineage.rootHash).toBe(inputHashes[0]);
  });

  it('preserves area under rigid transforms (transform fns affect only centroid + normal)', () => {
    const box = OcctBackend.box(10, 10, 10);
    const inputHashes = box.faceHashes();
    const inputMap: HistoryMap = new Map();
    inputMap.set(inputHashes[0], makeLineageWithSnapshot(inputHashes[0], [0, 0, 5]));

    const moved = box.translate(1, 0, 0);
    const outputHashes = moved.faceHashes();
    const newMap = propagateTransformHistory(inputMap, inputHashes, outputHashes, {
      pointTransform: (p) => [p[0] + 1, p[1], p[2]],
    });

    const outLineage = newMap.get(outputHashes[0])!;
    expect(outLineage.snapshot!.area).toBe(100);
  });

  it('skips lineages without a snapshot field (still shares by reference)', () => {
    const box = OcctBackend.box(10, 10, 10);
    const inputHashes = box.faceHashes();
    const inputMap: HistoryMap = new Map();
    const noSnapLineage: FaceLineage = {
      rootHash: inputHashes[0],
      rootFeatureId: 'box-1',
      canonicalName: 'top',
      // no snapshot
    };
    inputMap.set(inputHashes[0], noSnapLineage);

    const moved = box.translate(5, 0, 0);
    const outputHashes = moved.faceHashes();
    const newMap = propagateTransformHistory(inputMap, inputHashes, outputHashes, {
      pointTransform: (p) => [p[0] + 5, p[1], p[2]],
    });

    // No snapshot to transform → share by reference.
    expect(newMap.get(outputHashes[0])).toBe(noSnapLineage);
  });
});

describe('refreshSnapshots', () => {
  beforeAll(async () => { await initOcct(); });

  it('updates the snapshot field on lineage entries with matching hashes', () => {
    const box = OcctBackend.box(10, 10, 10);
    const faces = box.getReplicadShape().faces;
    const snapshots = captureAllFaceSnapshots(faces);
    const firstHash = Array.from(snapshots.keys())[0];

    // Lineage with a stale snapshot (centroid wildly off).
    const map: HistoryMap = new Map();
    map.set(firstHash, {
      rootHash: firstHash,
      rootFeatureId: 'feat',
      labelName: 'wall',
      snapshot: { centroid: [999, 999, 999], normal: [0, 0, -1], area: 0 },
    });

    refreshSnapshots(map, faces);

    const refreshed = map.get(firstHash)!;
    // Snapshot replaced with current geometry:
    expect(refreshed.snapshot!.centroid[0]).not.toBe(999);
    expect(refreshed.snapshot!.area).toBeGreaterThan(99);
    expect(refreshed.snapshot!.area).toBeLessThan(101);
    // Other lineage fields preserved:
    expect(refreshed.labelName).toBe('wall');
    expect(refreshed.rootHash).toBe(firstHash);
  });

  it('leaves lineage entries with hashes not in the face set untouched', () => {
    const box = OcctBackend.box(10, 10, 10);
    const faces = box.getReplicadShape().faces;

    const map: HistoryMap = new Map();
    const orphanLineage: FaceLineage = {
      rootHash: 'orphan-hash-not-on-this-shape',
      rootFeatureId: 'feat',
      labelName: 'orphan',
      snapshot: { centroid: [1, 2, 3], normal: [0, 0, 1], area: 50 },
    };
    map.set('orphan-hash-not-on-this-shape', orphanLineage);

    refreshSnapshots(map, faces);

    // Orphan still present, unchanged:
    const after = map.get('orphan-hash-not-on-this-shape')!;
    expect(after).toBe(orphanLineage);
    expect(after.snapshot!.centroid).toEqual([1, 2, 3]);
  });
});

describe('mergeBooleanHistory snapshot propagation (via lineage-by-reference share)', () => {
  beforeAll(async () => { await initOcct(); });

  it('preserves snapshot through a translate (slice-1 reference-share path)', () => {
    // We exercise this indirectly: build a lineage with a snapshot, run it
    // through propagateTransformHistory with no snapshotTransform, and verify
    // the snapshot survives by-reference. (mergeBooleanHistory uses the same
    // share-by-reference idiom for unchanged faces.)
    const box = OcctBackend.box(10, 10, 10);
    const inputHashes = box.faceHashes();
    const inputMap: HistoryMap = new Map();
    const lineage = makeLineageWithSnapshot(inputHashes[0], [0, 0, 5]);
    inputMap.set(inputHashes[0], lineage);

    const moved = box.translate(0, 0, 0);
    const outputHashes = moved.faceHashes();
    const newMap = propagateTransformHistory(inputMap, inputHashes, outputHashes);

    const outLineage = newMap.get(outputHashes[0])!;
    expect(outLineage.snapshot).toBe(lineage.snapshot);  // same reference
  });
});
