// tests/unit/kinematic/checkSweptCollision.test.ts
//
// T3.4 — sampled-pose loop. Three cases:
//   1. clean sweep (no colliding pose) → ok=true, empty collidingPoses.
//   2. dirty sweep over [120°, 180°] → K1 fires, collidingPoses has ≥12
//      entries (the 5° step gives 13 samples in that range).
//   3. coarse sample step → K2 sample-density-warning fires.

import { describe, it, expect } from 'vitest';
import { checkSweptCollision } from '../../../src/kinematic/checkSweptCollision';
import { buildShoulderElbow2DOF } from './fixtures/shoulderElbow2DOF';

describe('checkSweptCollision', () => {
  it('returns ok=true with empty collidingPoses on a clean sweep', async () => {
    const { arm } = buildShoulderElbow2DOF();
    const r = await checkSweptCollision(arm, {
      joint: 'shoulder',
      range: [-90, 90, 5],
    });
    expect(r.source).toBe('local');
    expect(r.ok).toBe(true);
    expect(r.collidingPoses).toEqual([]);
    expect(r.posesSampled).toBe(37); // -90..90 step 5 → 37 samples
    expect(
      r.diagnostics.some((d) => d.code === 'kinematic.collision.swept'),
    ).toBe(false);
  }, 60_000);

  it('fires K1 with colliding poses across [120°, 180°] at 5° step', async () => {
    const { arm } = buildShoulderElbow2DOF();
    const r = await checkSweptCollision(arm, {
      joint: 'shoulder',
      range: [120, 180, 5],
    });
    expect(r.source).toBe('local');
    expect(r.ok).toBe(false);
    expect(r.collidingPoses.length).toBeGreaterThanOrEqual(12);
    expect(
      r.diagnostics.some((d) => d.code === 'kinematic.collision.swept'),
    ).toBe(true);
    expect(r.diagnostics.every((d) => d.source === 'local')).toBe(true);
    // Each colliding-pose record carries the pose + at least one contact pair.
    for (const c of r.collidingPoses) {
      expect(c.pose).toHaveProperty('shoulder');
      expect(c.contacts.length).toBeGreaterThanOrEqual(1);
    }
  }, 90_000);

  it('fires K2 sample-density-warning when (range, step) is sparse', async () => {
    const { arm } = buildShoulderElbow2DOF();
    const r = await checkSweptCollision(arm, {
      joint: 'shoulder',
      range: [0, 90, 10], // 10 samples < 36 → sparse for revolute
    });
    expect(
      r.diagnostics.some(
        (d) => d.code === 'kinematic.collision.swept.sample-density-warning',
      ),
    ).toBe(true);
    const warn = r.diagnostics.find(
      (d) => d.code === 'kinematic.collision.swept.sample-density-warning',
    );
    expect(warn?.severity).toBe('warn');
    expect(warn?.source).toBe('local');
    expect(warn?.element).toBe('shoulder');
  }, 60_000);
});
