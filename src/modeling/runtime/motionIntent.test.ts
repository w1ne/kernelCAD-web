// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/motionIntent.test.ts
//
// Motion intent vs joint type. The drawing-robot failure: an animation drove
// shoulder/elbow params while the shoulder and elbow mates were fastened, and
// the model passed as a valid static assembly.

import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createModelingApi } from '../api';
import { checkMotionIntent, hasMotionIntent, MOTION_ON_FIXED_JOINT } from './motionIntent';

type Joint = 'fastened' | 'revolute-posed' | 'geometry';

function build(shoulder: Joint, opts: { animate?: boolean; drive?: boolean } = {}) {
  const session = new CaptureSession();
  const k = createModelingApi({ session });
  const shoulderDeg = k.param('shoulderDeg', 0, { min: -30, max: 30 });
  const arm = k.assembly('draw-arm');
  const base = arm.part('base', k.box(40, 40, 10));
  const linkShape = k.box(60, 8, 4).translate(0, -4, 10);
  const link = arm.part('link', shoulder === 'geometry' ? linkShape.rotateZ(shoulderDeg) : linkShape);
  const pivot = shoulder === 'revolute-posed'
    ? { type: 'axis' as const, origin: { kind: 'vec3' as const, value: [0, 0, 10] as [number, number, number] }, axis: [0, 0, 1] as [number, number, number] }
    : { type: 'frame' as const, origin: { kind: 'vec3' as const, value: [0, 0, 10] as [number, number, number] } };
  base.connector('pivot', pivot);
  link.connector('pivot', pivot);
  if (shoulder === 'revolute-posed') {
    arm.mate('shoulder', 'base.pivot', 'link.pivot', 'revolute', { pose: shoulderDeg, limitsDeg: [-30, 30] });
  } else {
    arm.mate('shoulder', 'base.pivot', 'link.pivot', 'fastened');
  }
  if (opts.drive) {
    arm.mechanicalJoint('shoulder-drive', { mate: 'shoulder', actuator: 'base', shaft: 'link', supports: ['base'], output: 'link' });
  }
  if (opts.animate !== false) {
    k.animationView({ param: 'shoulderDeg', from: -20, to: 20, durationMs: 1000 });
  }
  return arm;
}

describe('checkMotionIntent', () => {
  it('fails an animated param that turns a fastened part through its geometry', () => {
    const arm = build('geometry');
    const diags = checkMotionIntent(arm);
    expect(diags).toHaveLength(1);
    const [d] = diags;
    expect(d.code).toBe(MOTION_ON_FIXED_JOINT);
    expect(d.severity).toBe('error');
    expect(d.mateName).toBe('shoulder');
    expect(d.message).toMatch(/'shoulderDeg'/);
    expect(d.message).toMatch(/'shoulder'/);
    expect(d.message).toMatch(/fastened/);
  });

  it('fails a mechanicalJoint drive on a fastened mate', () => {
    const arm = build('fastened', { animate: false, drive: true });
    const diags = checkMotionIntent(arm);
    expect(diags.map((d) => d.code)).toEqual([MOTION_ON_FIXED_JOINT]);
    expect(diags[0].message).toMatch(/'shoulder-drive'.*'shoulder'.*fastened/);
  });

  it('passes the same model when the animated param is a revolute mate pose', () => {
    const arm = build('revolute-posed', { drive: true });
    expect(checkMotionIntent(arm)).toEqual([]);
    expect(hasMotionIntent(arm)).toBe(true);
  });

  it('says nothing about a static fastened assembly', () => {
    const arm = build('fastened', { animate: false });
    expect(checkMotionIntent(arm)).toEqual([]);
    expect(hasMotionIntent(arm)).toBe(false);
  });

  it('ignores a layout animation that slides fastened parts by a spacing param', () => {
    const session = new CaptureSession();
    const k = createModelingApi({ session });
    const gap = k.param('gapMm', 5, { min: 0, max: 20 });
    const arm = k.assembly('rack');
    const a = arm.part('a', k.box(20, 20, 5));
    const b = arm.part('b', k.box(20, 20, 5).translate(gap.add(20), 0, 0));
    a.connector('side', { type: 'frame', origin: { kind: 'vec3', value: [20, 10, 0] } });
    b.connector('side', { type: 'frame', origin: { kind: 'vec3', value: [25, 10, 0] } });
    arm.mate('rack-mount', 'a.side', 'b.side', 'fastened');
    k.animationView({ param: 'gapMm', from: 0, to: 20, durationMs: 1000 });
    expect(checkMotionIntent(arm)).toEqual([]);
  });

  it('ignores an animated param that only changes a size, not a pose', () => {
    const session = new CaptureSession();
    const k = createModelingApi({ session });
    const h = k.param('heightMm', 10, { min: 5, max: 20 });
    const arm = k.assembly('stack');
    const a = arm.part('a', k.box(20, 20, h));
    const b = arm.part('b', k.box(20, 20, 5));
    a.connector('top', { type: 'frame', origin: { kind: 'vec3', value: [10, 10, 10] } });
    b.connector('bottom', { type: 'frame', origin: { kind: 'vec3', value: [10, 10, 0] } });
    arm.mate('stack', 'a.top', 'b.bottom', 'fastened');
    k.animationView({ param: 'heightMm', from: 5, to: 20, durationMs: 1000 });
    expect(checkMotionIntent(arm)).toEqual([]);
  });
});
