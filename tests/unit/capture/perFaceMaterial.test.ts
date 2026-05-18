// tests/unit/capture/perFaceMaterial.test.ts
//
// Slice A of per-face PBR material assignment. Covers:
//   1. Authoring surface: Shape.material({ face, ... }) mutates
//      metadata.materialByLabel (NOT metadata.material), accumulates across
//      calls, and remains chainable with .color() / whole-shape .material().
//   2. Bridge serializer: materialByFaceId round-trips through JSON.
//   3. End-to-end resolution: a box with `faceLabels: { lid: 'top', base: 'bottom' }`
//      and two `.material({ face: ... })` calls produces a `materialByFaceId`
//      map with the matching face indices populated to the correct PBR
//      records.
//   4. No-match diagnostic: `.material({ face: 'nope' })` against a label
//      that isn't declared upstream emits the `feature.material.face-label-no-match`
//      soft warning and falls back to the shape default.

import { describe, it, expect, beforeAll } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { meshFeaturesPerFeature } from '../../../src/modeling/capture/featureMeshing';
import {
  serializeForBridge,
  rehydrateFromBridge,
} from '../../../src/modeling/capture/featureMeshSerialize';
import type { FeatureMesh } from '../../../src/modeling/capture/featureMeshing';

beforeAll(async () => {
  await initOcct();
});

describe('Shape.material({ face, ... }) — capture-time', () => {
  it('mutates metadata.materialByLabel and leaves metadata.material untouched', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10, false, { faceLabels: { lid: 'top' } });
    const t = s.material({ face: 'lid', baseColor: '#0a0a0a', clearcoat: 1 });
    expect(t).toBe(s); // chainable
    const record = session.getRecords().find(r => r.id === s.id)!;
    expect(record.metadata?.material).toBeUndefined();
    expect(record.metadata?.materialByLabel).toEqual({
      lid: { baseColor: '#0a0a0a', clearcoat: 1 },
    });
  });

  it('accumulates per-face entries across multiple calls; last write wins on same label', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10, false, {
      faceLabels: { lid: 'top', base: 'bottom' },
    });
    s.material({ face: 'lid', baseColor: '#0a0a0a' });
    s.material({ face: 'base', baseColor: '#cccccc', roughness: 0.8 });
    // Overwrite the lid material — last write wins.
    s.material({ face: 'lid', baseColor: '#1a1a1a', clearcoat: 0.5 });
    const record = session.getRecords().find(r => r.id === s.id)!;
    expect(record.metadata?.materialByLabel).toEqual({
      lid: { baseColor: '#1a1a1a', clearcoat: 0.5 },
      base: { baseColor: '#cccccc', roughness: 0.8 },
    });
  });

  it('composes with whole-shape .material({baseColor}) as default for unmatched faces', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10, false, { faceLabels: { lid: 'top' } });
    s.material({ baseColor: '#cccccc' }); // whole-shape default
    s.material({ face: 'lid', baseColor: '#0a0a0a' });
    const record = session.getRecords().find(r => r.id === s.id)!;
    expect(record.metadata?.material).toEqual({ baseColor: '#cccccc' });
    expect(record.metadata?.materialByLabel).toEqual({
      lid: { baseColor: '#0a0a0a' },
    });
  });

  it('rejects empty/non-string face label at capture time', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10);
    expect(() => s.material({ face: '', baseColor: '#fff' })).toThrow(
      /non-empty string label/,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => s.material({ face: 123 as any, baseColor: '#fff' })).toThrow(
      /non-empty string label/,
    );
  });
});

describe('Bridge serializer — materialByFaceId round-trip', () => {
  it('serializes and rehydrates materialByFaceId', () => {
    const baseFace = {
      vertices: new Float32Array([0, 0, 0]),
      indices: new Uint32Array([0]),
      normals: new Float32Array([0, 0, 1]),
      faceId: 0,
    };
    const mesh: FeatureMesh = {
      featureId: 'box_1',
      featureKind: 'box',
      predecessors: [],
      faces: [baseFace],
      materialByFaceId: {
        0: { baseColor: '#0a0a0a', clearcoat: 1 },
        3: { baseColor: '#cccccc', roughness: 0.8 },
      },
    };
    const serialized = serializeForBridge(mesh);
    expect(serialized.materialByFaceId).toEqual({
      0: { baseColor: '#0a0a0a', clearcoat: 1 },
      3: { baseColor: '#cccccc', roughness: 0.8 },
    });
    // Survives a JSON pass (Playwright bridge transport).
    const restored = rehydrateFromBridge(JSON.parse(JSON.stringify(serialized)));
    expect(restored.materialByFaceId?.[0]).toEqual({
      baseColor: '#0a0a0a',
      clearcoat: 1,
    });
    expect(restored.materialByFaceId?.[3]).toEqual({
      baseColor: '#cccccc',
      roughness: 0.8,
    });
  });

  it('omits materialByFaceId when not set', () => {
    const baseFace = {
      vertices: new Float32Array([0, 0, 0]),
      indices: new Uint32Array([0]),
      normals: new Float32Array([0, 0, 1]),
      faceId: 0,
    };
    const mesh: FeatureMesh = {
      featureId: 'box_1',
      featureKind: 'box',
      predecessors: [],
      faces: [baseFace],
    };
    const serialized = serializeForBridge(mesh);
    expect(serialized.materialByFaceId).toBeUndefined();
  });
});

describe('meshFeaturesPerFeature — per-face material resolution', () => {
  it('resolves face labels to face indices and populates materialByFaceId', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10, false, {
      faceLabels: { lid: 'top', base: 'bottom' },
    });
    s.material({ face: 'lid', baseColor: '#0a0a0a', clearcoat: 1 });
    s.material({ face: 'base', baseColor: '#ffffff' });

    const records = session.getRecords();
    const { features, perFaceMaterialWarnings } = await meshFeaturesPerFeature(records);
    expect(perFaceMaterialWarnings).toBeUndefined();

    const boxMesh = features.find(f => f.featureId === s.id)!;
    expect(boxMesh.materialByFaceId).toBeDefined();
    const entries = Object.entries(boxMesh.materialByFaceId!);
    // Two labels declared, both should resolve.
    expect(entries).toHaveLength(2);

    // The two PBR records should both appear as values, keyed by some pair of
    // face-index integers in the box's 6-face set.
    const pbrValues = entries.map(([, v]) => v);
    expect(pbrValues).toContainEqual({ baseColor: '#0a0a0a', clearcoat: 1 });
    expect(pbrValues).toContainEqual({ baseColor: '#ffffff' });

    // The two indices must be distinct and within [0, 5] (box has 6 faces).
    const indices = entries.map(([k]) => Number(k));
    expect(indices[0]).not.toBe(indices[1]);
    for (const idx of indices) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThanOrEqual(5);
    }
  });

  it('surfaces a soft warning when face label does not resolve and continues the build', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    // Box has NO faceLabels declared upstream.
    const s = kcad.box(10, 10, 10);
    s.material({ face: 'rim', baseColor: '#0a0a0a' });

    const records = session.getRecords();
    const { features, perFaceMaterialWarnings } = await meshFeaturesPerFeature(records);

    // Build still succeeded — feature is present.
    const boxMesh = features.find(f => f.featureId === s.id)!;
    expect(boxMesh).toBeDefined();
    // No face indices got the per-face PBR.
    expect(boxMesh.materialByFaceId).toBeUndefined();

    // Warning surfaced.
    expect(perFaceMaterialWarnings).toBeDefined();
    expect(perFaceMaterialWarnings!.length).toBeGreaterThan(0);
    const w = perFaceMaterialWarnings![0];
    expect(w.code).toBe('feature.material.face-label-no-match');
    expect(w.label).toBe('rim');
    expect(w.featureId).toBe(s.id);
  });

  it('whole-shape .material() without face does not populate materialByFaceId', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10);
    s.material({ baseColor: '#cccccc' });

    const records = session.getRecords();
    const { features, perFaceMaterialWarnings } = await meshFeaturesPerFeature(records);
    expect(perFaceMaterialWarnings).toBeUndefined();

    const boxMesh = features.find(f => f.featureId === s.id)!;
    expect(boxMesh.material).toEqual({ baseColor: '#cccccc' });
    expect(boxMesh.materialByFaceId).toBeUndefined();
  });
});
