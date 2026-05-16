// tests/unit/capture/shapeMaterial.test.ts
import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';

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
