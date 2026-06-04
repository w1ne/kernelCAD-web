// tests/unit/kinematic/checkMountingHoleConsistency.test.ts
//
// T2 wrapper test. Confirms the kc.kinematic.checkMountingHoleConsistency
// facade entry produces the expected envelope shape against a real
// mismatched-diameter fixture, and that every emitted diagnostic carries
// source:'local' + a canonical (warn|error|info) severity.

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';

function makeArm() {
  const session = new CaptureSession();
  const kc = createApi({ session });
  return { kc, arm: kc.assembly('t') };
}

describe('kc.kinematic.checkMountingHoleConsistency', () => {
  it('returns ok=true on a clean matching-diameter fastened mate', async () => {
    const { kc, arm } = makeArm();
    const a = kc
      .box(20, 20, 5)
      .hole('top', { u: 0, v: 0, diameter: 5, depth: 'through' });
    const b = kc
      .box(20, 20, 5)
      .hole('bottom', { u: 0, v: 0, diameter: 5, depth: 'through' });
    arm.part('a', a).connector('h', {
      type: 'frame',
      origin: {
        kind: 'topology',
        query: { kind: 'face-center', name: 'top' },
      },
    });
    arm.part('b', b).connector('h', {
      type: 'frame',
      origin: {
        kind: 'topology',
        query: { kind: 'face-center', name: 'bottom' },
      },
    });
    arm.mate('screw', 'a.h', 'b.h', 'fastened');

    const r = await kc.kinematic.checkMountingHoleConsistency(arm);
    expect(r.source).toBe('local');
    expect(r.ok).toBe(true);
    expect(r.mismatches).toHaveLength(0);
    expect(r.diagnostics).toHaveLength(0);
  });

  it('flags diameter mismatch with a translated diagnostic envelope', async () => {
    const { kc, arm } = makeArm();
    const a = kc
      .box(20, 20, 5)
      .hole('top', { u: 0, v: 0, diameter: 5, depth: 'through' });
    const b = kc
      .box(20, 20, 5)
      .hole('bottom', { u: 0, v: 0, diameter: 6, depth: 'through' });
    arm.part('a', a).connector('h', {
      type: 'frame',
      origin: {
        kind: 'topology',
        query: { kind: 'face-center', name: 'top' },
      },
    });
    arm.part('b', b).connector('h', {
      type: 'frame',
      origin: {
        kind: 'topology',
        query: { kind: 'face-center', name: 'bottom' },
      },
    });
    arm.mate('screw', 'a.h', 'b.h', 'fastened');

    const r = await kc.kinematic.checkMountingHoleConsistency(arm);
    expect(r.source).toBe('local');
    expect(r.ok).toBe(false);
    expect(r.mismatches.length).toBeGreaterThanOrEqual(1);
    expect(r.mismatches[0].mateName).toBe('screw');
    expect(r.diagnostics.length).toBeGreaterThanOrEqual(1);
    for (const d of r.diagnostics) {
      expect(d.source).toBe('local');
      expect(['info', 'warn', 'error']).toContain(d.severity);
      // Wrapper normalizes the substrate's 'warning' to 'warn'.
      expect(d.severity).not.toBe('warning' as unknown);
    }
    expect(
      r.diagnostics.some((d) => d.code === 'assembly.mounting-hole.mismatch'),
    ).toBe(true);
  });
});
