// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { suggestLimitFix, type SuggestedLimits } from './limitFixSuggest';
import type { PoseEnvelopeDiagnostic } from './poseEnvelope';
import { CaptureSession } from '../capture/captureSession';
import { createApi } from '../api';

function makeArm() {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  return { arm: kcad.assembly('t'), kcad, session };
}

describe('suggestLimitFix', () => {
  it('returns null when diagnostic lacks mateName', async () => {
    const { arm } = makeArm();
    const diag: PoseEnvelopeDiagnostic = {
      code: 'assembly.pose-envelope.interference',
      severity: 'error',
      message: '',
      hint: '',
      sampleName: 'x:min',
    };
    expect(await suggestLimitFix(arm, diag)).toBeNull();
  });

  it('returns null when mate has no declared limits', async () => {
    const { arm, kcad } = makeArm();
    const a = kcad.box(10, 10, 10);
    const b = kcad.box(10, 10, 10);
    arm.part('a', a).connector('o', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 5] }, axis: [0, 0, 1] });
    arm.part('b', b).connector('i', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('m', 'a.o', 'b.i', 'revolute');   // no limitsDeg
    const diag: PoseEnvelopeDiagnostic = {
      code: 'assembly.pose-envelope.interference',
      severity: 'error',
      message: '',
      hint: '',
      sampleName: 'm:max',
      mateName: 'm',
      partA: 'a',
      partB: 'b',
      volumeMm3: 100,
    };
    expect(await suggestLimitFix(arm, diag)).toBeNull();
  });

  it('returns null for ball mate (deferred to v0.6.x)', async () => {
    const { arm, kcad } = makeArm();
    arm.part('a', kcad.box(10, 10, 10)).connector('o', { type: 'ball', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.part('b', kcad.box(10, 10, 10)).connector('i', { type: 'ball', origin: { kind: 'vec3', value: [0, 0, 0] } });
    // Ball mates can't carry scalar limitsDeg per the capture-time mate API
    // (validateMateLimits in assembly.ts rejects limitsDeg on non-revolute /
    // cylindrical / pin_slot mates). The suggester still returns null for
    // ball mates regardless of limits — that's the assertion under test.
    arm.mate('m', 'a.o', 'b.i', 'ball');
    const diag: PoseEnvelopeDiagnostic = {
      code: 'assembly.pose-envelope.interference',
      severity: 'error',
      message: '',
      hint: '',
      sampleName: 'm:max',
      mateName: 'm',
      partA: 'a',
      partB: 'b',
      volumeMm3: 50,
    };
    expect(await suggestLimitFix(arm, diag)).toBeNull();
  });

  it('binary-searches collision-onset on a 2-part revolute fixture', async () => {
    // Two boxes hinged via a connector point that sits 2mm outboard of box B's
    // +x face, so at pose 0° there's a 2mm clearance gap. Box A is anchored
    // at the origin (x∈[0,20]); box B at default pose sits at x∈[-12, -2].
    // Rotating B about world-Z through (0,5,5) sweeps B into A: at 180° B
    // fully overlaps part of A's x∈[0,10] half. Collision onset is some angle
    // in (0°, 180°). Binary search converges on that angle and emits it as
    // the shrunk max.
    const { arm, kcad } = makeArm();
    arm.part('a', kcad.box(20, 10, 10))
       .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 5, 5] }, axis: [0, 0, 1] });
    arm.part('b', kcad.box(10, 10, 10))
       .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [12, 5, 5] }, axis: [0, 0, 1] });
    arm.mate('m', 'a.hinge', 'b.hinge', 'revolute', { pose: 0, limitsDeg: [0, 180] });
    const diag: PoseEnvelopeDiagnostic = {
      code: 'assembly.pose-envelope.interference',
      severity: 'error',
      message: 'Pose-envelope sample m:max overlap.',
      hint: '',
      sampleName: 'm:max',
      mateName: 'm',
      partA: 'a',
      partB: 'b',
      volumeMm3: 80,
    };
    const result = await suggestLimitFix(arm, diag);
    expect(result).not.toBeNull();
    expect(result!.limitsField).toBe('limitsDeg');
    expect(result!.shrunkBound).toBe('max');
    expect(result!.originalLimits).toEqual([0, 180]);
    // The shrunk max must be in (0, 180); the exact value depends on the
    // collision-onset angle of these specific boxes.
    expect(result!.limits[0]).toBe(0);
    expect(result!.limits[1]).toBeGreaterThan(0);
    expect(result!.limits[1]).toBeLessThan(180);
  });

  it('handles min-side shrink when the offending sample is :min', async () => {
    // Same fixture but with limits=[-180, 0] so the :min sample collides
    // instead of :max. Rotation is symmetric about the z-axis, so -180°
    // overlaps just as 180° does.
    const { arm, kcad } = makeArm();
    arm.part('a', kcad.box(20, 10, 10))
       .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 5, 5] }, axis: [0, 0, 1] });
    arm.part('b', kcad.box(10, 10, 10))
       .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [12, 5, 5] }, axis: [0, 0, 1] });
    arm.mate('m', 'a.hinge', 'b.hinge', 'revolute', { pose: 0, limitsDeg: [-180, 0] });
    const diag: PoseEnvelopeDiagnostic = {
      code: 'assembly.pose-envelope.interference',
      severity: 'error',
      message: '',
      hint: '',
      sampleName: 'm:min',
      mateName: 'm',
      partA: 'a',
      partB: 'b',
      volumeMm3: 80,
    };
    const result = await suggestLimitFix(arm, diag);
    expect(result).not.toBeNull();
    expect(result!.shrunkBound).toBe('min');
    expect(result!.limits[1]).toBe(0);
    expect(result!.limits[0]).toBeGreaterThan(-180);
    expect(result!.limits[0]).toBeLessThan(0);
  });
});
