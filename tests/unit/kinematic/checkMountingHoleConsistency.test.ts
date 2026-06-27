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
    // #541 — a real interface was examined, so the green is not vacuous and
    // no no-coverage note fires.
    expect(r.checked).toBeGreaterThanOrEqual(1);
    expect(
      r.diagnostics.some(
        (d) => d.code === 'kinematic.mounting-hole.no-coverage',
      ),
    ).toBe(false);
  });

  it('#541 reports zero coverage instead of a vacuous green when there are no fastened mates', async () => {
    const { kc, arm } = makeArm();
    // Two parts, no fastened mate between them — nothing for the gate to check.
    const a = kc
      .box(20, 20, 5)
      .hole('top', { u: 0, v: 0, diameter: 5, depth: 'through' });
    const b = kc
      .box(20, 20, 5)
      .hole('bottom', { u: 0, v: 0, diameter: 5, depth: 'through' });
    arm.part('a', a).connector('h', {
      type: 'frame',
      origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } },
    });
    arm.part('b', b).connector('h', {
      type: 'frame',
      origin: {
        kind: 'topology',
        query: { kind: 'face-center', name: 'bottom' },
      },
    });

    const r = await kc.kinematic.checkMountingHoleConsistency(arm);
    expect(r.source).toBe('local');
    // Still ok:true (no mismatch), but `checked` and the diagnostic make the
    // zero-coverage case detectable — a green is not mistaken for "verified".
    expect(r.checked).toBe(0);
    expect(r.mismatches).toHaveLength(0);
    const noCoverage = r.diagnostics.filter(
      (d) => d.code === 'kinematic.mounting-hole.no-coverage',
    );
    expect(noCoverage).toHaveLength(1);
    expect(noCoverage[0].severity).toBe('info');
    expect(noCoverage[0].source).toBe('local');
    expect(noCoverage[0].message).toContain('nothing was checked');
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
    expect(r.checked).toBeGreaterThanOrEqual(1);
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
