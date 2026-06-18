// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/lib/mates/jointVisualExposure.test.ts
//
// v0.7 Gate 4 — joint visual exposure unit tests.
//
// Spec: `2026-05-30-joint-visual-exposure-gate-design.md` §"Tests (TDD)".
// Plan: `2026-05-30-joint-visual-exposure-gate-plan.md` §"Task 4".
//
// 8 cases — 6 synthetic (1-6) + 2 regression against the Luxo fixture
// dimensions at the two commit points (7-8). The synthetic cases use a
// shared `buildSyntheticHinge` helper that parameterizes fork plate
// thickness / gap / tongue thickness / pin length so the test author can
// dial the resulting gap-ratio and pin-stickout directly.

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createApi } from '../api';
import type { Assembly } from '../capture/assembly';
import { validateJointVisualExposure } from './jointVisualExposure';
import { validateJointAxisBindingWithCache } from './jointAxisBinding';
// `.kcad.ts` fixtures — extension included in the import path because
// TypeScript module resolution doesn't auto-append the full `.kcad.ts`
// suffix the way it auto-appends bare `.ts`. Same convention the eval
// runtime uses when loading user `.kcad.ts` scripts.
import { buildPreFixLuxoShoulder } from './fixtures/jointVisualExposure-luxo-pre-8e2f0da7.kcad.ts';
import { buildPostFixLuxoShoulder } from './fixtures/jointVisualExposure-luxo-post-8e2f0da7.kcad.ts';

interface SyntheticHingeOpts {
  /** Fork plate Y-thickness. Default 3 mm (Luxo post-fix value). */
  readonly forkPlateT?: number;
  /** Air-gap between fork plates along Y (the joint axis). */
  readonly forkGapY: number;
  /** Tongue Y-thickness. */
  readonly tongueY: number;
  /** Pin length along Y (total). */
  readonly pinLen: number;
  /** Pin radius. Default 3.5 mm. */
  readonly pinR?: number;
  /** Fork plate vertical extent (perpendicular to axis). Default 30 mm. */
  readonly forkPlateZ?: number;
  /** Fork plate horizontal extent (perpendicular to axis). Default 22 mm. */
  readonly forkPlateX?: number;
  /** Mate type. Default 'revolute'. Use 'prismatic' for the non-revolute scope test. */
  readonly mateType?: 'revolute' | 'prismatic';
}

/**
 * Build a minimal hinge assembly: parent = two fork plates + pivot pin
 * (along Y axis); child = single tongue plate. Returns the captured
 * `Assembly` along with the session.
 *
 * The dimensions parameterize the resulting Gate 4 measurements:
 *   - **Gap ratio** = `(forkGapY - tongueY) / 2 / forkPlateZ`
 *     (daylight per side / perpendicular extent)
 *   - **Pin stickout** = `(pinLen - forkGapY - 2*forkPlateT) / 2` per side
 */
function buildSyntheticHinge(opts: SyntheticHingeOpts): { arm: Assembly; session: CaptureSession } {
  const forkPlateT = opts.forkPlateT ?? 3;
  const pinR = opts.pinR ?? 3.5;
  const forkPlateZ = opts.forkPlateZ ?? 30;
  const forkPlateX = opts.forkPlateX ?? 22;
  const mateType = opts.mateType ?? 'revolute';
  const { forkGapY, tongueY, pinLen } = opts;

  const session = new CaptureSession();
  const kcad = createApi({ session });
  const arm = kcad.assembly('hinge');

  const plateOffsetY = forkGapY / 2 + forkPlateT / 2;
  const platePos = kcad.box(forkPlateX, forkPlateT, forkPlateZ, true)
    .translate(0,  plateOffsetY, 0);
  const plateNeg = kcad.box(forkPlateX, forkPlateT, forkPlateZ, true)
    .translate(0, -plateOffsetY, 0);
  // Pin along Y, centred on origin. `kcad.cylinder(h, r)` returns a
  // cylinder along +Z spanning Z=[0, h]; rotating -90° about X maps
  // +Z → +Y (the rotation sends (x, y, z) → (x, z, -y)) so the cylinder
  // ends up at Y=[0, h]. Translate -pinLen/2 along Y to centre on the
  // joint origin.
  const pin = kcad.cylinder(pinLen, pinR, 32)
    .rotate([1, 0, 0], -90)
    .translate(0, -pinLen / 2, 0);
  const parentShape = platePos.union(plateNeg).union(pin);
  const childShape = kcad.box(forkPlateX, tongueY, forkPlateZ, true);

  const parent = arm
    .part('parent', parentShape)
    .connector('hinge', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 1, 0],
    });
  const child = arm
    .part('child', childShape)
    .connector('hinge', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 1, 0],
    });
  arm.mate('hinge', `${parent.name}.hinge`, `${child.name}.hinge`, mateType);

  return { arm, session };
}

/**
 * Run Gate 4 against an assembly, reusing Gate 2's lowered-shape cache
 * via `validateJointAxisBindingWithCache`. This is the path the validator
 * actually wires up in production.
 */
async function runGate4(arm: Assembly) {
  const cache = await validateJointAxisBindingWithCache(arm);
  return validateJointVisualExposure({
    arm,
    loweredShapes: cache.worldShapes,
    worldTransforms: cache.worldTransforms,
  });
}

describe('validateJointVisualExposure (Gate 4)', () => {
  it('case 1 — pass: gapRatio=0.2, pinStickout=5 emits no diagnostic', async () => {
    // forkGapY=18, tongueY=6 → daylight=(18-6)/2=6 per side → gap=6/30=0.2
    // pinLen - forkGap - 2*forkPlateT = pinLen - 18 - 6 = pinLen - 24
    // For 5mm stickout per side: pinLen = 24 + 10 = 34
    const { arm } = buildSyntheticHinge({ forkGapY: 18, tongueY: 6, pinLen: 34 });
    const diags = await runGate4(arm);
    expect(diags).toHaveLength(0);
  });

  it('case 2 — fail (gap only): gapRatio≈0.04 with passing pin stickout', async () => {
    // forkGapY=12, tongueY=10.8 → daylight=(12-10.8)/2=0.6 per side → gap=0.6/30=0.02
    // pinLen = 12 + 6 + 10 = 28 → stickout = (28 - 18) / 2 = 5
    // Wait: 2*forkPlateT = 6 (since forkPlateT=3), so pinLen - 12 - 6 = pinLen - 18
    // For stickout=5: pinLen = 28
    const { arm } = buildSyntheticHinge({ forkGapY: 12, tongueY: 10.8, pinLen: 28 });
    const diags = await runGate4(arm);
    expect(diags).toHaveLength(1);
    expect(diags[0].code).toBe('assembly.joint.not-visible');
    expect(diags[0].severity).toBe('error');
    expect(diags[0].mateName).toBe('hinge');
    expect(diags[0].hint).toMatch(/joint-not-visible/);
    expect(diags[0].hint).toMatch(/fork-plate gap/);
    // failureCause should be 'gap' — pin stickout was OK.
    expect(diags[0].hint).toMatch(/pin stickout .* OK|gap is .*%.*pin stickout/);
  });

  it('case 3 — fail (pin only): gapRatio passing but pinStickout=0.5', async () => {
    // forkGapY=18, tongueY=6 → gap ratio passes (0.2)
    // pinLen = 18 + 6 + 1 = 25 → stickout per side = 0.5
    const { arm } = buildSyntheticHinge({ forkGapY: 18, tongueY: 6, pinLen: 25 });
    const diags = await runGate4(arm);
    expect(diags).toHaveLength(1);
    expect(diags[0].code).toBe('assembly.joint.not-visible');
    expect(diags[0].hint).toMatch(/pin stickout/);
    // failureCause should be 'pin-stickout' — gap was OK.
    expect(diags[0].hint).toMatch(/gap ratio .* OK/);
  });

  it('case 4 — fail (both): gapRatio low AND pinStickout low', async () => {
    // forkGapY=12, tongueY=10.8 → gap ratio fails
    // pinLen=19 → stickout = (19 - 12 - 6) / 2 = 0.5 per side
    const { arm } = buildSyntheticHinge({ forkGapY: 12, tongueY: 10.8, pinLen: 19 });
    const diags = await runGate4(arm);
    expect(diags).toHaveLength(1);
    expect(diags[0].code).toBe('assembly.joint.not-visible');
    // Both failure modes should be reported in the hint.
    expect(diags[0].hint).toMatch(/AND pin stickout/);
  });

  it('case 5 — microscale skip: combined bounding sphere < 5 mm emits no diagnostic', async () => {
    // Scale all dimensions down by 10x so the combined bounding sphere
    // radius drops below MICROSCALE_BOUNDING_RADIUS = 5 mm. With pin
    // length 1.9 mm and plate extent ~2.2 mm, the half-diagonal of the
    // combined AABB is ~ sqrt(2.2² + 1.9² + 3²) / 2 ≈ 2.1 mm < 5 mm.
    // Use sub-threshold dimensions deliberately tight so even a generous
    // bounding diagonal stays below 5 mm.
    const { arm } = buildSyntheticHinge({
      forkPlateT: 0.3,
      forkGapY: 1.2,
      tongueY: 1.08,           // would fail gap ratio at this scale
      pinLen: 1.9,             // and pin stickout
      pinR: 0.35,
      forkPlateZ: 3,
      forkPlateX: 2.2,
    });
    const diags = await runGate4(arm);
    expect(diags).toHaveLength(0);
  });

  it('case 6 — non-revolute (prismatic) skips the gate', async () => {
    // Same failing dimensions as case 4, but mate type is prismatic →
    // Gate 4 is out of scope for non-revolute mates per spec §"Locked
    // decisions" §1.
    const { arm } = buildSyntheticHinge({
      forkGapY: 12,
      tongueY: 10.8,
      pinLen: 19,
      mateType: 'prismatic',
    });
    const diags = await runGate4(arm);
    expect(diags).toHaveLength(0);
  });

  it('case 7 — regression pre-8e2f0da7 Luxo: emits JOINT_NOT_VISIBLE', async () => {
    const { arm } = buildPreFixLuxoShoulder();
    const diags = await runGate4(arm);
    expect(diags).toHaveLength(1);
    expect(diags[0].code).toBe('assembly.joint.not-visible');
    expect(diags[0].severity).toBe('error');
    expect(diags[0].mateName).toBe('shoulder');
    // Pre-fix Luxo: gapRatio = 1mm / 30mm = 0.033, well below 0.15.
    // The hint must carry actionable numbers an agent can read without
    // re-rendering.
    expect(diags[0].hint).toMatch(/FORK_GAP_Y/);
    expect(diags[0].hint).toMatch(/PIN_LEN/);
  });

  it('case 8 — regression post-8e2f0da7 Luxo: no JOINT_NOT_VISIBLE', async () => {
    const { arm } = buildPostFixLuxoShoulder();
    const diags = await runGate4(arm);
    // Post-fix passes both thresholds. No Gate 4 diagnostic for this
    // shoulder joint.
    expect(diags.filter((d) => d.code === 'assembly.joint.not-visible')).toHaveLength(0);
  });
});
