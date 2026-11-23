// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Shape.material rejects unknown option keys instead of dropping them:
// `{ baseColor: '#b0b0b0', metalnes: 1 }` used to store a dielectric record
// with no diagnostic.
import { describe, it, expect } from 'vitest';
import { CaptureSession } from './capture/captureSession';
import { createModelingApi } from './api';
import { KernelError } from '../shared/intent/kernelError';

function box() {
  const session = new CaptureSession();
  return { session, shape: createModelingApi({ session }).box(20, 20, 20) };
}

function caught(fn: () => unknown): KernelError {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(KernelError);
    return e as KernelError;
  }
  throw new Error('expected material() to throw');
}

describe('Shape.material option keys', () => {
  it('rejects a misspelt key with feature.invalid-args and writes no material', () => {
    const { session, shape } = box();
    const err = caught(() => shape.material({ baseColor: '#b0b0b0', metalnes: 1 } as never));
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toMatch(/opts\.metalnes/);
    expect(err.message).toMatch(/metalness/);
    const record = session.getRecords().find((r) => r.id === shape.id)!;
    expect(record.metadata?.material).toBeUndefined();
  });

  it('rejects a British colour key on a per-face call', () => {
    const { shape } = box();
    const err = caught(() => shape.material({ baseColor: '#000', face: 'top', colour: '#c00' } as never));
    expect(err.message).toMatch(/opts\.colour/);
  });

  it('points textureProjection at wrapTexture', () => {
    const { shape } = box();
    const err = caught(() => shape.material({ baseColor: '#fff', textureProjection: { type: 'box' } }));
    expect(err.message).toMatch(/opts\.textureProjection/);
    expect(err.message).toMatch(/wrapTexture/);
  });

  it('still accepts every documented field', () => {
    const { session, shape } = box();
    shape.material({
      name: 'smoked lens',
      baseColor: '#ffffff',
      metalness: 0,
      roughness: 0.1,
      clearcoat: 0.5,
      clearcoatRoughness: 0.05,
      ior: 1.5,
      transmission: 0.8,
      sheen: 0,
      opacity: 1,
      thickness: 3,
      attenuationColor: '#1a1a2a',
      attenuationDistance: 8,
      anisotropy: 0.2,
      anisotropyRotation: 90,
    });
    const record = session.getRecords().find((r) => r.id === shape.id)!;
    expect(record.metadata?.material).toMatchObject({ name: 'smoked lens', transmission: 0.8, thickness: 3 });
  });
});
