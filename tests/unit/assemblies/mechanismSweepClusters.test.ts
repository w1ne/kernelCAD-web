// tests/unit/assemblies/mechanismSweepClusters.test.ts
//
// The BREP sweep budget counts the probes the sweep really runs, not
// `poses × parts`. Parts fastened into one rigid cluster keep their
// relative pose, so a pair inside a cluster is measured once for the whole
// sweep (`detectInterferences` memoizes on the RELATIVE pose). The DRAW 01
// drawing robot (71 parts, 5 rigid clusters) used to come back
// "Motion not checked" only because it modelled its screws and nuts.
//
// Pinned here:
//   - an assembly with many fastened hardware parts sweeps under the
//     DEFAULT budget (the old `(poses + 3·revolutes) × parts` estimate
//     skipped it);
//   - NEGATIVE CONTROL: a collision between two parts of DIFFERENT
//     clusters, neither of them the cluster's main body, still fails the
//     sweep at the pose where it happens. Grouping parts into clusters must
//     never hide a cross-cluster pair.

import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import type { Assembly } from '../../../src/modeling/capture/assembly';
import { checkMechanismTruth } from '../../../src/modeling/runtime/mechanismTruth';

type Kcad = ReturnType<typeof createModelingApi>;
type PartHandle = ReturnType<Assembly['part']>;
type Vec3 = [number, number, number];

interface Rig { arm: Assembly; kcad: Kcad; parts: Map<string, PartHandle> }

/** Hinge: `b` (30×5×5) lies on top of `a` (20×10×10) and turns about the
 *  vertical axis through (20, 5) on a's top face. At 90° `b` points along
 *  +Y. The two only share a face, at every pose. */
function hinge(limitsDeg: [number, number]): Rig {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  const arm = kcad.assembly('cluster-hinge');
  const parts = new Map<string, PartHandle>();
  const axis = { type: 'axis' as const, origin: { kind: 'vec3' as const, value: [20, 5, 10] as Vec3 }, axis: [0, 0, 1] as Vec3 };
  parts.set('a', arm.part('a', kcad.box(20, 10, 10)).connector('hinge', axis));
  parts.set('b', arm.part('b', kcad.box(30, 5, 5).translate(17.5, 2.5, 10)).connector('hinge', axis));
  arm.mate('m', 'a.hinge', 'b.hinge', 'revolute', { pose: 0, limitsDeg });
  return { arm, kcad, parts };
}

/** Add `name` (modelled in place) fastened to `parent` at world point `pt`. */
function fasten(rig: Rig, parent: string, name: string, shape: ReturnType<Kcad['box']>, pt: Vec3): void {
  const frame = { type: 'frame' as const, origin: { kind: 'vec3' as const, value: pt }, normal: [0, 0, 1] as Vec3 };
  rig.parts.get(parent)!.connector(`${name}-at`, frame);
  rig.parts.set(name, rig.arm.part(name, shape).connector('seat', frame));
  rig.arm.mate(`${name}-fixed`, `${parent}.${name}-at`, `${name}.seat`, 'fastened');
}

/** 1×1×1 "screws" under a's bottom face and on b's top face. Each touches
 *  its own body and nothing else at any pose in [0, 90]. */
function addHardware(rig: Rig, perBody: number): void {
  for (let i = 0; i < perBody; i++) {
    const x = 1 + (i % 9) * 2;
    const y = 1 + Math.floor(i / 9) * 2;
    fasten(rig, 'a', `a-screw-${i}`, rig.kcad.box(1, 1, 1).translate(x, y, -1), [x + 0.5, y + 0.5, 0]);
  }
  for (let i = 0; i < perBody; i++) {
    const x = 23 + (i % 9) * 2;
    const y = 3 + Math.floor(i / 9) * 1.5;
    fasten(rig, 'b', `b-screw-${i}`, rig.kcad.box(1, 1, 1).translate(x, y, 15), [x + 0.5, y + 0.5, 15]);
  }
}

/** `bar` on a's far corner: a post carrying a rectangular ring 2 mm above
 *  b's top face, outside the tab's swing, plus a beam that hangs over the
 *  90° position of b's free end. `tab` stands on b's free end. They meet
 *  only when b is at 90°. At rest the tab stands inside the ring, so no
 *  bounding box proves the pair apart: the sweep measures it there (0 mm³)
 *  and caches it. A cache keyed on the pair alone would replay that 0 at
 *  90°. */
function addBarAndTab(rig: Rig): void {
  const k = rig.kcad;
  const bar = k.box(4, 4, 10).translate(0, 0, 10)
    .union(k.box(4, 40, 2).translate(0, 0, 17))
    .union(k.box(4, 40, 2).translate(48, 0, 17))
    .union(k.box(52, 2, 2).translate(0, 0, 17))
    .union(k.box(52, 4, 2).translate(0, 36, 17))
    .union(k.box(24, 16, 2).translate(0, 24, 17));
  fasten(rig, 'a', 'bar', bar, [2, 2, 10]);
  fasten(rig, 'b', 'tab', k.box(5, 4, 4).translate(42, 3, 15), [44.5, 5, 15]);
}

describe('mechanism sweep budget — rigid clusters', () => {
  it('sweeps an assembly with many fastened hardware parts under the default budget', async () => {
    const rig = hinge([0, 60]);
    addHardware(rig, 27);
    const parts = rig.arm.__parts().length;
    expect(parts).toBe(56);
    // The old estimate: (solved samples + 3 per revolute) × parts
    // = (3 + 3) × 56 = 336 > 300, so this used to be skipped. Samples are
    // rest, 0 and 60 (0 is in range, so it is the midpoint).
    const r = await checkMechanismTruth(rig.arm);
    expect(r.failures.filter((d) => d.code === 'mechanism.unverified-budget-exceeded')).toEqual([]);
    expect(r.coverage?.sweep).toBe(true);
    expect(r.failures.filter((d) => d.severity === 'error').map((d) => d.code)).toEqual([]);
    expect(r.mechanism).toBe('real');

    // The estimate counts each screw against its body ONCE: the screw keeps
    // its pose relative to that body at every swept pose.
    const skipped = await checkMechanismTruth(rig.arm, { sweepBudget: 0 });
    const msg = skipped.failures.find((d) => d.code === 'mechanism.unverified-budget-exceeded')?.message ?? '';
    expect(msg).toContain('56 parts in 2 rigid clusters');
    // 54 screw/body pairs once each, plus a/b and a few boxes that touch at
    // a swept pose. Counting every pair at every pose would give >= 108
    // (27 b-screws re-measured at each of the 3 non-rest poses, plus 27 on a).
    const probes = Number(/(\d+) pair overlap probes/.exec(msg)?.[1]);
    expect(probes).toBeGreaterThanOrEqual(54);
    expect(probes).toBeLessThan(108);
  }, 120_000);

  it('NEGATIVE CONTROL: still fails a collision between hardware of two different clusters', async () => {
    // At 90° the tab (on b's free end) runs into the bar's beam (on a):
    // 4 × 5 × 2 mm of shared solid. Neither part is its cluster's main
    // body, and a/b themselves never collide, so only a cross-cluster pair
    // check can see it.
    const rig = hinge([0, 90]);
    addHardware(rig, 9);
    addBarAndTab(rig);
    const r = await checkMechanismTruth(rig.arm);
    expect(r.coverage?.sweep).toBe(true);
    const hits = r.failures.filter((d) => d.code === 'mechanism.interpenetration');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((d) => d.message.includes("'bar'") && d.message.includes("'tab'") && d.message.includes("'m:90'"))).toBe(true);
    // Nothing else collides: the failure is exactly the cross-cluster pair.
    expect(hits.every((d) => d.message.includes("'bar'") && d.message.includes("'tab'"))).toBe(true);
    expect(r.mechanism).toBe('broken');
  }, 120_000);

  it('the same rig without the 90° pose is real (the control above fails for the collision only)', async () => {
    const rig = hinge([0, 60]);
    addHardware(rig, 9);
    addBarAndTab(rig);
    const r = await checkMechanismTruth(rig.arm);
    expect(r.coverage?.sweep).toBe(true);
    expect(r.failures.filter((d) => d.severity === 'error').map((d) => d.code)).toEqual([]);
    expect(r.mechanism).toBe('real');
  }, 120_000);
});
