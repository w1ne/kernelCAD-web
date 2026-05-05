// tests/unit/backends/occt/createdRefs.test.ts
//
// Phase-1 unit tests for the slice-2 created-refs subsystem:
//   - captureAllFaceSnapshots correctness on box (6 planar faces) and
//     cylinder (1 cylindrical + 2 planar caps).
//   - applyCreatedRefs writes the five new FaceLineage fields and preserves
//     pre-existing fields (canonicalName, rootFeatureId).

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../../src/backends/occt/occtBackend';
import {
  captureAllFaceSnapshots,
  applyCreatedRefs,
  faceHashOf,
  type CreatedRefSpec,
} from '../../../../src/backends/occt/createdRefs';
import type { HistoryMap, FaceLineage } from '../../../../src/naming/evolutionRecord';

describe('captureAllFaceSnapshots', () => {
  beforeAll(async () => { await initOcct(); });

  it('captures one snapshot per face on a 10×10×10 box (6 planar faces)', () => {
    const box = OcctBackend.box(10, 10, 10);
    const snapshots = captureAllFaceSnapshots(box.getReplicadShape().faces);
    expect(snapshots.size).toBe(6);
    // Each snapshot has finite centroid + normal + area > 99 (face area = 10×10 = 100).
    for (const snap of snapshots.values()) {
      expect(Number.isFinite(snap.centroid[0])).toBe(true);
      expect(Number.isFinite(snap.centroid[1])).toBe(true);
      expect(Number.isFinite(snap.centroid[2])).toBe(true);
      const nLen = Math.hypot(snap.normal[0], snap.normal[1], snap.normal[2]);
      expect(nLen).toBeCloseTo(1.0, 3);
      expect(snap.area).toBeGreaterThan(99);
      expect(snap.area).toBeLessThan(101);
    }
  });

  it('emits unit normals (length ≈ 1) for every face', () => {
    const box = OcctBackend.box(20, 30, 40);
    const snapshots = captureAllFaceSnapshots(box.getReplicadShape().faces);
    for (const snap of snapshots.values()) {
      const len = Math.hypot(snap.normal[0], snap.normal[1], snap.normal[2]);
      expect(len).toBeGreaterThan(0.999);
      expect(len).toBeLessThan(1.001);
    }
  });

  it('keys snapshots by face hash (matches faceHashOf)', () => {
    const box = OcctBackend.box(5, 5, 5);
    const faces = box.getReplicadShape().faces;
    const snapshots = captureAllFaceSnapshots(faces);
    for (const face of faces) {
      const h = faceHashOf(face);
      expect(snapshots.has(h)).toBe(true);
    }
  });
});

describe('applyCreatedRefs', () => {
  beforeAll(async () => { await initOcct(); });

  it('writes labelName + snapshot + featureId + featureKind onto a fresh lineage', () => {
    const box = OcctBackend.box(10, 10, 10);
    const faces = box.getReplicadShape().faces;
    const snapshots = captureAllFaceSnapshots(faces);
    const firstHash = Array.from(snapshots.keys())[0];
    const firstSnapshot = snapshots.get(firstHash)!;

    const map: HistoryMap = new Map();
    const refs: CreatedRefSpec[] = [
      { faceHash: firstHash, refName: 'wall', snapshot: firstSnapshot },
    ];
    applyCreatedRefs(map, refs, 'feature-42', 'hole', 'mountingBolt', undefined);

    const lineage = map.get(firstHash);
    expect(lineage).toBeDefined();
    expect(lineage!.labelName).toBe('wall');
    expect(lineage!.featureId).toBe('feature-42');
    expect(lineage!.featureKind).toBe('hole');
    expect(lineage!.featureName).toBe('mountingBolt');
    expect(lineage!.featureOrdinal).toBeUndefined();
    expect(lineage!.snapshot).toEqual(firstSnapshot);
    expect(lineage!.rootFeatureId).toBe('feature-42');
    expect(lineage!.rootHash).toBe(firstHash);
  });

  it('writes featureOrdinal when no name is given', () => {
    const box = OcctBackend.box(10, 10, 10);
    const faces = box.getReplicadShape().faces;
    const snapshots = captureAllFaceSnapshots(faces);
    const firstHash = Array.from(snapshots.keys())[0];

    const map: HistoryMap = new Map();
    const refs: CreatedRefSpec[] = [
      { faceHash: firstHash, refName: 'wall', snapshot: snapshots.get(firstHash)! },
    ];
    applyCreatedRefs(map, refs, 'feature-7', 'hole', undefined, 2);

    const lineage = map.get(firstHash)!;
    expect(lineage.featureName).toBeUndefined();
    expect(lineage.featureOrdinal).toBe(2);
  });

  it('preserves pre-existing canonicalName and rootHash on an existing lineage', () => {
    const box = OcctBackend.box(10, 10, 10);
    const faces = box.getReplicadShape().faces;
    const snapshots = captureAllFaceSnapshots(faces);
    const firstHash = Array.from(snapshots.keys())[0];

    const map: HistoryMap = new Map();
    const existing: FaceLineage = {
      rootHash: 'original-root-hash',
      rootFeatureId: 'box-1',
      canonicalName: 'top',
    };
    map.set(firstHash, existing);

    const refs: CreatedRefSpec[] = [
      { faceHash: firstHash, refName: 'wall', snapshot: snapshots.get(firstHash)! },
    ];
    applyCreatedRefs(map, refs, 'hole-feature', 'hole', undefined, 1);

    const lineage = map.get(firstHash)!;
    // Pre-existing fields preserved:
    expect(lineage.canonicalName).toBe('top');
    expect(lineage.rootHash).toBe('original-root-hash');
    // featureId / featureKind point at the labelling op, not the originating primitive:
    expect(lineage.rootFeatureId).toBe('box-1');           // unchanged
    expect(lineage.featureId).toBe('hole-feature');
    expect(lineage.featureKind).toBe('hole');
    // labelName + snapshot updated:
    expect(lineage.labelName).toBe('wall');
    expect(lineage.snapshot).toEqual(snapshots.get(firstHash));
  });

  it('handles multiple specs in one call', () => {
    const box = OcctBackend.box(10, 10, 10);
    const faces = box.getReplicadShape().faces;
    const snapshots = captureAllFaceSnapshots(faces);
    const hashes = Array.from(snapshots.keys());
    expect(hashes.length).toBeGreaterThanOrEqual(3);

    const map: HistoryMap = new Map();
    const refs: CreatedRefSpec[] = [
      { faceHash: hashes[0], refName: 'wall', snapshot: snapshots.get(hashes[0])! },
      { faceHash: hashes[1], refName: 'floor', snapshot: snapshots.get(hashes[1])! },
      { faceHash: hashes[2], refName: 'wall-back', snapshot: snapshots.get(hashes[2])! },
    ];
    applyCreatedRefs(map, refs, 'f', 'hole', 'hole1', undefined);

    expect(map.get(hashes[0])!.labelName).toBe('wall');
    expect(map.get(hashes[1])!.labelName).toBe('floor');
    expect(map.get(hashes[2])!.labelName).toBe('wall-back');
  });
});
