// tests/unit/kinematic/facadeShape.test.ts
//
// T2 facade-shape gate. Asserts the kc.kinematic namespace exposes the
// four entry points and each returns a typed result envelope carrying
// source:'local' and a diagnostics array.

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';

describe('kc.kinematic facade shape', () => {
  it('exposes the four entry points as functions', () => {
    const session = new CaptureSession();
    const kc = createApi({ session });
    expect(typeof kc.kinematic).toBe('object');
    expect(typeof kc.kinematic.checkMountingHoleConsistency).toBe('function');
    expect(typeof kc.kinematic.checkSweptCollision).toBe('function');
    expect(typeof kc.kinematic.checkReachable).toBe('function');
    expect(typeof kc.kinematic.checkLoadCapacity).toBe('function');
  });

  it('checkMountingHoleConsistency returns an envelope with source=local on an empty assembly', async () => {
    const session = new CaptureSession();
    const kc = createApi({ session });
    const arm = kc.assembly('empty');
    const r = await kc.kinematic.checkMountingHoleConsistency(arm);
    expect(r.source).toBe('local');
    expect(Array.isArray(r.diagnostics)).toBe(true);
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.mismatches)).toBe(true);
    expect(r.mismatches).toHaveLength(0);
  });

  it('checkSweptCollision returns an envelope with source=local on an empty assembly', async () => {
    const session = new CaptureSession();
    const kc = createApi({ session });
    const arm = kc.assembly('empty');
    const r = await kc.kinematic.checkSweptCollision(arm);
    expect(r.source).toBe('local');
    expect(Array.isArray(r.diagnostics)).toBe(true);
    expect(r.ok).toBe(true);
    expect(r.posesSampled).toBe(0);
  });

  it('checkReachable reports kinematic.unreachable when the named tip part is absent', async () => {
    const session = new CaptureSession();
    const kc = createApi({ session });
    const arm = kc.assembly('empty');
    const r = await kc.kinematic.checkReachable(arm, {
      tipLink: 'tip',
      target: { position: [0, 0, 0] },
    });
    expect(r.source).toBe('local');
    expect(r.ok).toBe(false);
    expect(
      r.diagnostics.some((d) => d.code === 'kinematic.unreachable'),
    ).toBe(true);
    expect(r.diagnostics.every((d) => d.source === 'local')).toBe(true);
  });

  it('checkLoadCapacity returns an envelope with source=local on an empty assembly', async () => {
    const session = new CaptureSession();
    const kc = createApi({ session });
    const arm = kc.assembly('empty');
    const r = await kc.kinematic.checkLoadCapacity(arm);
    expect(r.source).toBe('local');
    expect(Array.isArray(r.diagnostics)).toBe(true);
    expect(r.ok).toBe(true);
  });
});
