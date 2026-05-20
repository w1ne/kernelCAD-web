// tests/unit/intent/materialGlassFields.test.ts
//
// Glass fields on PBRMaterial via Shape.material() clamper.

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';

describe('Shape.material() — glass fields', () => {
  it('accepts non-negative finite mm thickness', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10);
    s.material({ baseColor: '#88ddee', transmission: 0.9, thickness: 5 });
    const record = session.getRecords().find(r => r.id === s.id)!;
    expect(record.metadata?.material).toMatchObject({ thickness: 5 });
  });

  it('throws on negative thickness with feature.material.thickness-negative', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10);
    expect(() => s.material({ baseColor: '#fff', thickness: -1 })).toThrow(
      /thickness/,
    );
  });

  it('accepts attenuationColor via existing resolveColor', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10);
    s.material({ baseColor: '#fff', attenuationColor: '#aabbcc' });
    const record = session.getRecords().find(r => r.id === s.id)!;
    expect(record.metadata?.material).toMatchObject({ attenuationColor: '#aabbcc' });
  });

  it('accepts attenuationDistance positive finite', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10);
    s.material({ baseColor: '#fff', attenuationDistance: 10 });
    const record = session.getRecords().find(r => r.id === s.id)!;
    expect(record.metadata?.material).toMatchObject({ attenuationDistance: 10 });
  });

  it('accepts attenuationDistance Infinity', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10);
    s.material({ baseColor: '#fff', attenuationDistance: Number.POSITIVE_INFINITY });
    const record = session.getRecords().find(r => r.id === s.id)!;
    expect(record.metadata?.material).toMatchObject({
      attenuationDistance: Number.POSITIVE_INFINITY,
    });
  });

  it('throws on non-positive attenuationDistance', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10);
    expect(() => s.material({ baseColor: '#fff', attenuationDistance: 0 })).toThrow(
      /attenuationDistance/,
    );
    expect(() => s.material({ baseColor: '#fff', attenuationDistance: -2 })).toThrow(
      /attenuationDistance/,
    );
  });

  it('drops attenuationColor via value-clamped soft warning when unresolved', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10);
    const warnsBefore = session.warnings.length;
    s.material({ baseColor: '#fff', attenuationColor: 'not-a-color' });
    const record = session.getRecords().find(r => r.id === s.id)!;
    expect(record.metadata?.material).not.toMatchObject({ attenuationColor: 'not-a-color' });
    expect((record.metadata?.material as { attenuationColor?: string }).attenuationColor).toBeUndefined();
    expect(session.warnings.length).toBe(warnsBefore + 1);
    expect(session.warnings[session.warnings.length - 1].code).toBe(
      'feature.material.value-clamped',
    );
  });
});
