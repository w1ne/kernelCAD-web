// tests/unit/capture/shapeMaterial.test.ts
import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import { serializeForBridge, rehydrateFromBridge } from '../../../src/modeling/capture/featureMeshSerialize';
import type { FeatureMesh } from '../../../src/modeling/capture/featureMeshing';

describe('Shape.material()', () => {
  it('mutates metadata.material in place and returns the same Shape', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10);
    const t = s.material({ baseColor: '#0a0a0a', clearcoat: 0.8, roughness: 0.15 });
    expect(t).toBe(s);  // chainable; returns this
    const record = session.getRecords().find(r => r.id === s.id)!;
    expect(record.metadata?.material).toEqual({
      baseColor: '#0a0a0a',
      clearcoat: 0.8,
      roughness: 0.15,
    });
  });

  it('throws on missing baseColor', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => s.material({} as any)).toThrow(/baseColor/);
  });

  it('clamps out-of-range numeric fields and emits a soft warning', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10);
    const warnsBefore = session.warnings.length;
    s.material({ baseColor: '#fff', metalness: 1.5, roughness: -0.2, ior: 3 });
    const record = session.getRecords().find(r => r.id === s.id)!;
    expect(record.metadata?.material).toEqual({
      baseColor: '#fff',
      metalness: 1,    // clamped
      roughness: 0,    // clamped
      ior: 2.5,        // clamped
    });
    expect(session.warnings.length).toBe(warnsBefore + 1);
    expect(session.warnings[session.warnings.length - 1].code).toBe('feature.material.value-clamped');
  });

  it('throws on non-finite numeric input', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10);
    expect(() => s.material({ baseColor: '#fff', roughness: Number.NaN })).toThrow(/finite/);
    expect(() => s.material({ baseColor: '#fff', metalness: Number.POSITIVE_INFINITY })).toThrow(/finite/);
  });

  it('coexists with color() on the same shape', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10);
    s.color('#aabbcc').material({ baseColor: '#0a0a0a', clearcoat: 0.8 });
    const record = session.getRecords().find(r => r.id === s.id)!;
    expect(record.metadata?.color).toBe('#aabbcc');
    expect(record.metadata?.material).toEqual({ baseColor: '#0a0a0a', clearcoat: 0.8 });
  });
});

describe('serializeForBridge — material + virtual + referenceImage fields', () => {
  const baseFace = {
    vertices: new Float32Array([0, 0, 0]),
    indices: new Uint32Array([0]),
    normals: new Float32Array([0, 0, 1]),
    faceId: 0,
  };

  it('serializes material field through the bridge', () => {
    const mesh: FeatureMesh = {
      featureId: 'box_1',
      featureKind: 'box',
      predecessors: [],
      faces: [baseFace],
      material: { baseColor: '#0a0a0a', clearcoat: 0.8, roughness: 0.15 },
    };
    const serialized = serializeForBridge(mesh);
    expect(serialized.material).toEqual({ baseColor: '#0a0a0a', clearcoat: 0.8, roughness: 0.15 });
    // Legacy color field is absent when not set
    expect(serialized.color).toBeUndefined();
    // Round-trips correctly
    const restored = rehydrateFromBridge(JSON.parse(JSON.stringify(serialized)));
    expect(restored.material).toEqual({ baseColor: '#0a0a0a', clearcoat: 0.8, roughness: 0.15 });
  });

  it('preserves legacy color string alongside material', () => {
    const mesh: FeatureMesh = {
      featureId: 'box_2',
      featureKind: 'box',
      predecessors: [],
      faces: [baseFace],
      color: '#aabbcc',
      material: { baseColor: '#0a0a0a' },
    };
    const serialized = serializeForBridge(mesh);
    expect(serialized.color).toBe('#aabbcc');
    expect(serialized.material).toEqual({ baseColor: '#0a0a0a' });
  });

  it('serializes virtual flag for a referenceImage mesh', () => {
    const refImgMeta = {
      path: '/tmp/ref.png',
      plane: 'xz' as const,
      anchor: 'origin' as const,
      scale: 'fit-bbox' as const,
      opacity: 0.5,
      flipU: false,
      flipV: false,
      pixelWidth: 100,
      pixelHeight: 100,
      virtual: true as const,
    };
    const mesh: FeatureMesh = {
      featureId: 'refimg_1',
      featureKind: 'referenceImage',
      predecessors: [],
      faces: [],
      virtual: true,
      referenceImage: refImgMeta,
    };
    const serialized = serializeForBridge(mesh);
    expect(serialized.virtual).toBe(true);
    expect(serialized.referenceImage).toEqual(refImgMeta);
    // Round-trips correctly
    const restored = rehydrateFromBridge(JSON.parse(JSON.stringify(serialized)));
    expect(restored.virtual).toBe(true);
    expect(restored.referenceImage?.path).toBe('/tmp/ref.png');
    expect(restored.referenceImage?.plane).toBe('xz');
    expect(restored.referenceImage?.opacity).toBe(0.5);
  });

  it('omits virtual and referenceImage when not set', () => {
    const mesh: FeatureMesh = {
      featureId: 'box_3',
      featureKind: 'box',
      predecessors: [],
      faces: [baseFace],
    };
    const serialized = serializeForBridge(mesh);
    expect(serialized.virtual).toBeUndefined();
    expect(serialized.referenceImage).toBeUndefined();
    expect(serialized.material).toBeUndefined();
  });
});
