// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// issue #1765: the mate solver must never report `solved` for a pose it could
// not resolve to a finite number, and an explicit override outside the mate's
// declared `limitsMm` / `limitsDeg` must be reported.
import { describe, it, expect } from 'vitest';
import { solveMates } from './solver';
import { CaptureSession } from '../capture/captureSession';
import { createModelingApi } from '../api';

function makeArm() {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  return { arm: kcad.assembly('t'), kcad };
}

function addSlide(arm: ReturnType<typeof makeArm>['arm'], kcad: ReturnType<typeof makeArm>['kcad'], opts: {
  limitsMm?: [number, number];
  pose?: unknown;
}) {
  arm
    .part('rail', kcad.box(80, 20, 20))
    .connector('track', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] });
  arm
    .part('carriage', kcad.box(20, 10, 10))
    .connector('bore', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] });
  arm.mate('stage-slide', 'rail.track', 'carriage.bore', 'prismatic', {
    ...(opts.limitsMm !== undefined ? { limitsMm: opts.limitsMm } : {}),
    ...(opts.pose !== undefined ? { pose: opts.pose as number } : {}),
  });
}

function addHinge(arm: ReturnType<typeof makeArm>['arm'], kcad: ReturnType<typeof makeArm>['kcad'], limitsDeg?: [number, number]) {
  arm
    .part('base', kcad.box(20, 20, 4))
    .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
  arm
    .part('link', kcad.box(10, 2, 2))
    .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
  arm.mate('joint', 'base.hinge', 'link.hinge', 'revolute', limitsDeg ? { limitsDeg } : {});
}

describe('solveMates — non-finite pose guard (issue #1765)', () => {
  it('rejects a legacy { param } pose object instead of solving NaN', async () => {
    const { arm, kcad } = makeArm();
    addSlide(arm, kcad, { pose: { param: 'Stroke' } });

    await expect(solveMates(arm)).rejects.toThrow(/mate-pose|not a .kcad\.ts pose|finite number/i);
    await expect(solveMates(arm)).rejects.toThrow(/Stroke/);
  });

  it('rejects a NaN pose override', async () => {
    const { arm, kcad } = makeArm();
    addSlide(arm, kcad, {});
    await expect(solveMates(arm, { 'stage-slide': Number.NaN })).rejects.toThrow(/finite number/i);
  });

  it('rejects an Infinity pose override', async () => {
    const { arm, kcad } = makeArm();
    addSlide(arm, kcad, {});
    await expect(solveMates(arm, { 'stage-slide': Number.POSITIVE_INFINITY })).rejects.toThrow(/finite number/i);
  });

  it('rejects a NaN pose inside a ball triple', async () => {
    const { arm, kcad } = makeArm();
    arm
      .part('base', kcad.box(10, 10, 10))
      .connector('socket', { type: 'ball', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm
      .part('ball', kcad.box(4, 4, 4))
      .connector('stud', { type: 'ball', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.mate('socket-mate', 'base.socket', 'ball.stud', 'ball');

    await expect(
      solveMates(arm, { 'socket-mate': [0, Number.NaN, 0] }),
    ).rejects.toThrow(/finite number/i);
  });
});

describe('solveMates — explicit override limits (issue #1765)', () => {
  it('reports an out-of-range prismatic override against limitsMm', async () => {
    const { arm, kcad } = makeArm();
    addSlide(arm, kcad, { limitsMm: [-40, 40] });

    const solved = await solveMates(arm, { 'stage-slide': 95 });
    expect(solved.status).toBe('solved');
    expect(solved.diagnostics).toHaveLength(1);
    expect(solved.diagnostics![0]).toMatchObject({
      code: 'kinematic.pose.out-of-limits',
      severity: 'warning',
      mateName: 'stage-slide',
      field: 'limitsMm',
      limits: [-40, 40],
      pose: 95,
    });
  });

  it('reports an out-of-range revolute override against limitsDeg', async () => {
    const { arm, kcad } = makeArm();
    addHinge(arm, kcad, [-90, 90]);

    const solved = await solveMates(arm, { joint: 200 });
    expect(solved.status).toBe('solved');
    expect(solved.diagnostics).toHaveLength(1);
    expect(solved.diagnostics![0]).toMatchObject({
      code: 'kinematic.pose.out-of-limits',
      field: 'limitsDeg',
      limits: [-90, 90],
      pose: 200,
    });
  });

  it('stays silent for an override inside the declared limits', async () => {
    const { arm, kcad } = makeArm();
    addSlide(arm, kcad, { limitsMm: [-40, 40] });

    const solved = await solveMates(arm, { 'stage-slide': 30 });
    expect(solved.status).toBe('solved');
    expect(solved.diagnostics).toBeUndefined();
    expect(solved.poses.get('carriage')!.point([0, 0, 0])[0]).toBeCloseTo(30);
  });
});
