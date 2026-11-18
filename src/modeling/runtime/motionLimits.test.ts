// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/motionLimits.test.ts
//
// Joint ranges along the animation (build123d-style joint ranges) and per-DOF
// limit coverage (ClassCAD-style per-DOF limits).

import { describe, expect, it } from 'vitest';
import type { AnimationKey } from '../../shared/intent/animationViewRecord';
import { CaptureSession } from '../capture/captureSession';
import { createModelingApi } from '../api';
import { checkMotionLimits } from './motionLimits';

const AXIS = { type: 'axis' as const, origin: { kind: 'vec3' as const, value: [0, 0, 10] as [number, number, number] }, axis: [0, 0, 1] as [number, number, number] };

function arm(opts: {
  type?: 'revolute' | 'cylindrical';
  limits?: [number, number];
  paramLimits?: [number, number];
  from?: number;
  to?: number;
  keys?: AnimationKey[];
}) {
  const session = new CaptureSession();
  const k = createModelingApi({ session });
  const [min, max] = opts.paramLimits ?? [-90, 90];
  const elbowDeg = k.param('elbowDeg', 0, { min, max });
  const a = k.assembly('arm');
  const base = a.part('base', k.box(40, 40, 10));
  const link = a.part('link', k.box(60, 8, 4));
  base.connector('pivot', AXIS);
  link.connector('pivot', AXIS);
  a.mate('elbow', 'base.pivot', 'link.pivot', opts.type ?? 'revolute', {
    pose: elbowDeg,
    ...(opts.limits ? { limitsDeg: opts.limits } : {}),
  });
  if (opts.keys) {
    k.animationView({ tracks: [{ param: 'elbowDeg', keys: opts.keys }] });
  } else {
    k.animationView({ param: 'elbowDeg', from: opts.from ?? 0, to: opts.to ?? 0, durationMs: 1000 });
  }
  return a;
}

describe('checkMotionLimits', () => {
  it('fails an animation key that drives a joint past its limits, naming param, joint, pose and limits', () => {
    const r = checkMotionLimits(arm({ limits: [-20, 20], from: 0, to: 35 }));
    expect(r.failures).toHaveLength(1);
    const [d] = r.failures;
    expect(d.code).toBe('kinematic.pose.out-of-limits');
    expect(d.severity).toBe('error');
    expect(d.message).toBe(
      "The animation sets param 'elbowDeg' to 35 at 1000 ms, which puts joint 'elbow' at 35°, outside its limits [-20, 20]°.",
    );
    expect((d as { mateName?: string }).mateName).toBe('elbow');
  });

  it('passes an animation inside the limits and counts the joint as checked', () => {
    const r = checkMotionLimits(arm({ limits: [-20, 20], from: -20, to: 20 }));
    expect(r.failures).toEqual([]);
    expect(r.checked).toBe(1);
    expect(r.skipped).toEqual([]);
  });

  it('reports an authored key outside joint limits even when param bounds clamp it', () => {
    const assembly = arm({
      limits: [-65, 65],
      paramLimits: [-65, 65],
      keys: [
        { atMs: 0, value: 897, ease: 'easeInOut' },
        { atMs: 1000, value: 0, ease: 'easeInOut' },
      ],
    });
    const animation = assembly.__session().getRecords().find((record) => record.kind === 'animationView');
    expect(animation?.metadata).toMatchObject({
      tracks: [{ param: 'elbowDeg', keys: [{ atMs: 0, value: 65, authoredValue: 897 }, { atMs: 1000, value: 0 }] }],
    });

    const r = checkMotionLimits(assembly);

    expect(r.failures).toHaveLength(1);
    expect(r.failures[0].code).toBe('kinematic.pose.out-of-limits');
    expect(r.failures[0].message).toContain("param 'elbowDeg' to 897 at 0 ms");
    expect(r.failures[0].message).toContain("joint 'elbow' at 897°");
  });

  it('keeps an in-range key clean when param bounds match joint limits', () => {
    const r = checkMotionLimits(arm({
      limits: [-65, 65],
      paramLimits: [-65, 65],
      from: 0,
      to: 65,
    }));

    expect(r.failures).toEqual([]);
    expect(r.checked).toBe(1);
  });

  it('reports a moving joint with no limits as skipped, not broken', () => {
    const r = checkMotionLimits(arm({ from: 0, to: 35 }));
    expect(r.failures).toEqual([]);
    expect(r.skipped).toEqual(["joint 'elbow' rotation has no limits, range not checked"]);
  });

  it('reports the unlimited offset of a cylindrical joint whose rotation is limited', () => {
    const r = checkMotionLimits(arm({ type: 'cylindrical', limits: [-20, 20], from: -10, to: 10 }));
    expect(r.failures).toEqual([]);
    expect(r.skipped).toEqual(["joint 'elbow' offset has no limits, range not checked"]);
  });
});
