// tests/unit/intent/materialAnisotropy.test.ts
//
// Anisotropy fields on PBRMaterial via Shape.material() clamper.

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';

describe('Shape.material() — anisotropy', () => {
  it('accepts anisotropy in [0, 1]', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10);
    s.material({ baseColor: '#fff', metalness: 1, roughness: 0.3, anisotropy: 0.8 });
    const record = session.getRecords().find(r => r.id === s.id)!;
    expect(record.metadata?.material).toMatchObject({ anisotropy: 0.8 });
  });

  it('clamps out-of-range anisotropy and emits value-clamped warn', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10);
    const warnsBefore = session.warnings.length;
    s.material({ baseColor: '#fff', anisotropy: 1.5 });
    const record = session.getRecords().find(r => r.id === s.id)!;
    expect(record.metadata?.material).toMatchObject({ anisotropy: 1 });
    expect(session.warnings.length).toBe(warnsBefore + 1);
    expect(session.warnings[session.warnings.length - 1].code).toBe(
      'feature.material.value-clamped',
    );
  });

  it('normalizes anisotropyRotation degrees to [0, 360)', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10);
    s.material({ baseColor: '#fff', anisotropyRotation: 90 });
    const r1 = session.getRecords().find(r => r.id === s.id)!;
    expect(r1.metadata?.material).toMatchObject({ anisotropyRotation: 90 });
  });

  it('normalizes negative anisotropyRotation with soft warn', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10);
    const warnsBefore = session.warnings.length;
    s.material({ baseColor: '#fff', anisotropyRotation: -90 });
    const record = session.getRecords().find(r => r.id === s.id)!;
    expect(record.metadata?.material).toMatchObject({ anisotropyRotation: 270 });
    // soft warn emitted because raw differs from normalized
    const codes = session.warnings.slice(warnsBefore).map(w => w.code);
    expect(codes).toContain('feature.material.anisotropy-rotation-normalized');
  });

  it('normalizes over-360 anisotropyRotation with soft warn', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10);
    const warnsBefore = session.warnings.length;
    s.material({ baseColor: '#fff', anisotropyRotation: 450 });
    const record = session.getRecords().find(r => r.id === s.id)!;
    expect(record.metadata?.material).toMatchObject({ anisotropyRotation: 90 });
    const codes = session.warnings.slice(warnsBefore).map(w => w.code);
    expect(codes).toContain('feature.material.anisotropy-rotation-normalized');
  });

  it('rejects non-finite anisotropyRotation', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10);
    expect(() => s.material({ baseColor: '#fff', anisotropyRotation: Number.NaN })).toThrow(/finite/);
  });
});
