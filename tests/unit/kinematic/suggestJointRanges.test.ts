// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Suggested joint limits against an analytic gap, not against the
// implementation's own distance call. Axis-aligned boxes: the gap is the
// separated-axis difference of the faces the mate motion drives together.
// The revolute stop solves L·sin(θ) + h·cos(θ) = wall face − clearance.

import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import type { Assembly } from '../../../src/modeling/capture/assembly';
import { checkSweptCollision } from '../../../src/kinematic/checkSweptCollision';
import {
  DEFAULT_JOINT_RANGE_CLEARANCE_MM,
  suggestJointRanges,
  type JointRangeSide,
} from '../../../src/kinematic/suggestJointRanges';

const CLEARANCE = 0.3;
const RAIL_FACE_X = 10;
const CARRIAGE_LENGTH = 20;
const WALL_X = 40;
/** Gap from the carriage's +X face to the wall's −X face at slide pose 0. */
const GAP_AT_SLIDE_ZERO = WALL_X - (RAIL_FACE_X + CARRIAGE_LENGTH);
const SLIDE_REST = 0.1;
const SLIDE_AUTHORED: readonly [number, number] = [-2, 20];

/** Absolute slide pose where the carriage face is `clearance` mm short of the wall. */
function slideStop(clearance: number): number {
  return GAP_AT_SLIDE_ZERO - clearance;
}

function axis(origin: readonly [number, number, number], direction: readonly [number, number, number] = [1, 0, 0]) {
  return {
    type: 'axis' as const,
    origin: { kind: 'vec3' as const, value: [...origin] as [number, number, number] },
    axis: [...direction] as [number, number, number],
  };
}

function limitSnapshot(arm: Assembly) {
  return arm.__mates().map((mate) => ({
    name: mate.name,
    pose: mate.pose,
    limitsDeg: mate.limitsDeg === undefined ? null : [...mate.limitsDeg],
    limitsMm: mate.limitsMm === undefined ? null : [...mate.limitsMm],
  }));
}

/** Close side of a bracket: the reported pose is on the near side of the analytic stop. */
function expectStop(side: JointRangeSide, analytic: number, resolution: number, toward: 1 | -1): void {
  expect(side.status, JSON.stringify(side)).toBe('stop');
  expect(side.value, JSON.stringify(side)).toBeTypeOf('number');
  const value = side.value ?? Number.NaN;
  if (toward > 0) {
    expect(value).toBeGreaterThanOrEqual(analytic - 0.002);
    expect(value).toBeLessThanOrEqual(analytic + resolution + 0.002);
  } else {
    expect(value).toBeLessThanOrEqual(analytic + 0.002);
    expect(value).toBeGreaterThanOrEqual(analytic - resolution - 0.002);
  }
  expect(side.resolution ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(resolution + 1e-9);
}

function carriageAssembly(opts?: {
  wallX?: number;
  slidePose?: number;
  slideLimits?: readonly [number, number] | null;
}): Assembly {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  const arm = kcad.assembly('carriage-stop');
  const wallX = opts?.wallX ?? WALL_X;
  const rail = arm.part('rail', kcad.box(10, 30, 20));
  const carriage = arm.part('carriage', kcad.box(CARRIAGE_LENGTH, 16, 12));
  arm.part('wall', kcad.box(10, 12, 20).translate(wallX, 0, 0));
  rail.connector('track', axis([RAIL_FACE_X, 15, 10]));
  carriage.connector('slide', axis([0, 8, 6]));
  arm.mate('slide', 'rail.track', 'carriage.slide', 'prismatic', {
    pose: opts?.slidePose ?? SLIDE_REST,
    ...(opts?.slideLimits === null ? {} : { limitsMm: [...(opts?.slideLimits ?? SLIDE_AUTHORED)] as [number, number] }),
  });
  return arm;
}

/** Wall on its own prismatic, so a sibling slide pose has to stay put. */
function siblingAssembly(): Assembly {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  const arm = kcad.assembly('sibling-stop');
  const rail = arm.part('rail', kcad.box(10, 30, 20));
  const carriage = arm.part('carriage', kcad.box(CARRIAGE_LENGTH, 16, 12));
  const wall = arm.part('wall', kcad.box(10, 12, 20).translate(WALL_X, 0, 0));
  rail.connector('track', axis([RAIL_FACE_X, 15, 10]));
  carriage.connector('slide', axis([0, 8, 6]));
  rail.connector('wall-seat', axis([0, 0, 0]));
  wall.connector('shift', axis([0, 0, 0]));
  arm.mate('slide', 'rail.track', 'carriage.slide', 'prismatic', {
    pose: 4,
    limitsMm: [-2, 20],
  });
  arm.mate('shift', 'rail.wall-seat', 'wall.shift', 'prismatic', {
    pose: 0,
    limitsMm: [-15, 5],
  });
  return arm;
}

describe('suggestJointRanges', () => {
  it('rejects a bad request without measuring', async () => {
    const arm = carriageAssembly();
    const before = limitSnapshot(arm);
    const badClearance = await suggestJointRanges(arm, { clearanceMm: -1 });
    expect(badClearance.ok).toBe(false);
    expect(badClearance.joints).toEqual([]);
    expect(badClearance.error).toMatch(/clearanceMm/);

    const unknown = await suggestJointRanges(arm, { joint: 'missing' });
    expect(unknown.ok).toBe(false);
    expect(unknown.joints).toEqual([]);
    expect(unknown.error).toMatch(/unknown joint/);

    const badSearch = await suggestJointRanges(arm, { search: [5, 1] });
    expect(badSearch.ok).toBe(false);
    expect(badSearch.error).toMatch(/search/);

    const unbounded = await suggestJointRanges(carriageAssembly({ slideLimits: null }), { sweepBudget: 0 });
    expect(unbounded.ok).toBe(false);
    expect(unbounded.joints[0]?.lower).toEqual({ status: 'unknown', reason: 'unbounded' });
    expect(unbounded.joints[0]?.upper.reason).toBe('unbounded');
    expect(unbounded.workUsed).toBe(0);

    const budget = await suggestJointRanges(arm, { sweepBudget: 0 });
    expect(budget.ok).toBe(false);
    expect(budget.joints[0]?.lower).toEqual({ status: 'unknown', reason: 'budget' });
    expect(budget.joints[0]?.upper.status).not.toBe('no-stop');
    expect(budget.workUsed).toBe(0);
    expect(budget.patch).toEqual([]);

    const outside = await suggestJointRanges(arm, { search: [1, 5] });
    expect(outside.joints[0]?.lower.reason).toBe('rest-outside-bounds');
    expect(outside.workUsed).toBe(0);
    expect(limitSnapshot(arm)).toEqual(before);
  });

  it('places a prismatic stop at the analytic 0.3 mm and 1 mm gaps', async () => {
    expect(DEFAULT_JOINT_RANGE_CLEARANCE_MM).toBe(0.3);
    expect(slideStop(0.3)).toBeCloseTo(9.7, 10);
    expect(slideStop(1)).toBeCloseTo(9, 10);

    const arm = carriageAssembly();
    const before = limitSnapshot(arm);
    const resolution = 0.05;

    const atDefault = await suggestJointRanges(arm, { resolution });
    const slide = atDefault.joints.find((joint) => joint.joint === 'slide');
    expect(slide, JSON.stringify(atDefault)).toBeDefined();
    expect(atDefault.ok).toBe(true);
    expect(slide!.rest).toBe(SLIDE_REST);
    expect(slide!.restWithinClearance).toBe(false);
    expect(slide!.lower).toMatchObject({ status: 'no-stop', value: SLIDE_AUTHORED[0] });
    expectStop(slide!.upper, slideStop(CLEARANCE), resolution, 1);
    expect(slide!.upper.pair).toEqual({ a: 'carriage', b: 'wall' });
    expect(atDefault.patch).toEqual([
      expect.objectContaining({
        joint: 'slide',
        limitsField: 'limitsMm',
        lower: 'bound',
        upper: 'stop',
      }),
    ]);
    expect(atDefault.limitsSnippet).toMatch(/Not applied/);
    expect(atDefault.limitsSnippet).toMatch(/limitsMm:/);
    expect(atDefault.workUsed).toBeGreaterThan(0);

    const atOne = await suggestJointRanges(arm, { clearanceMm: 1, resolution });
    const wider = atOne.joints[0];
    expect(wider?.restWithinClearance).toBe(false);
    expectStop(wider!.upper, slideStop(1), resolution, 1);
    expect(wider!.upper.pair).toEqual({ a: 'carriage', b: 'wall' });
    expect(limitSnapshot(arm)).toEqual(before);
  }, 60_000);

  it('holds a sibling mate at its authored pose', async () => {
    const slidePose = 4;
    const resolution = 0.05;
    // Wall face sits 6 mm past the carriage face while slide is at 4.
    // Sweeping the wall's joint toward −X closes that gap: stop at 0.3 − 6.
    const shiftAnalytic = CLEARANCE - (GAP_AT_SLIDE_ZERO - slidePose);
    expect(shiftAnalytic).toBeCloseTo(-5.7, 10);
    const wrongIfSlideHeldAtZero = CLEARANCE - GAP_AT_SLIDE_ZERO;
    expect(wrongIfSlideHeldAtZero).toBeCloseTo(-9.7, 10);

    const arm = siblingAssembly();
    const before = limitSnapshot(arm);
    const result = await suggestJointRanges(arm, { resolution });
    const slide = result.joints.find((joint) => joint.joint === 'slide');
    const shift = result.joints.find((joint) => joint.joint === 'shift');
    expect(result.ok, JSON.stringify(result.joints)).toBe(true);
    expect(slide?.rest).toBe(slidePose);
    expectStop(slide!.upper, slideStop(CLEARANCE), resolution, 1);
    expect(slide!.upper.pair).toEqual({ a: 'carriage', b: 'wall' });
    expectStop(shift!.lower, shiftAnalytic, resolution, -1);
    expect(shift!.lower.pair).toEqual({ a: 'carriage', b: 'wall' });
    expect(Math.abs((shift!.lower.value ?? 0) - wrongIfSlideHeldAtZero)).toBeGreaterThan(1);
    expect(shift!.upper).toMatchObject({ status: 'no-stop', value: 5 });
    expect(limitSnapshot(arm)).toEqual(before);
  }, 60_000);

  it('reports no stop inside a window that cannot reach the wall', async () => {
    const arm = carriageAssembly();
    const result = await suggestJointRanges(arm, { search: [-0.05, 0.2] });
    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(result.joints[0]?.lower).toMatchObject({ status: 'no-stop', value: -0.05 });
    expect(result.joints[0]?.upper).toMatchObject({ status: 'no-stop', value: 0.2 });
    expect(result.patch).toEqual([]);
    expect(result.limitsSnippet).toBe('');
    expect(result.joints[0]?.lower.reason).toBeUndefined();
  }, 60_000);

  it('returns unknown when the exact probe does not fit the budget', async () => {
    const arm = carriageAssembly();
    const result = await suggestJointRanges(arm, { sweepBudget: 1, resolution: 0.05 });
    const slide = result.joints[0];
    expect(result.ok).toBe(false);
    expect(slide?.lower.status).toBe('no-stop');
    expect(slide?.upper).toEqual({ status: 'unknown', reason: 'budget' });
    expect(slide?.upper.status).not.toBe('no-stop');
    expect(result.patch).toEqual([]);
    expect(result.workUsed).toBe(0);
  }, 60_000);

  it('flags a rest pose that already overlaps, and the swept-collision check still flags it', async () => {
    const arm = carriageAssembly({ wallX: 28, slidePose: 0, slideLimits: [0, 4] });
    const before = limitSnapshot(arm);
    const result = await suggestJointRanges(arm);
    const slide = result.joints[0];
    expect(result.ok).toBe(false);
    expect(slide?.restWithinClearance).toBe(true);
    expect(slide?.lower).toMatchObject({ status: 'stop', value: 0, pair: { a: 'carriage', b: 'wall' }, resolution: 0 });
    expect(slide?.upper).toMatchObject({ status: 'stop', value: 0, pair: { a: 'carriage', b: 'wall' } });
    expect(result.patch).toEqual([]);

    const swept = await checkSweptCollision(arm, { joint: 'slide', range: [0, 2, 2] });
    expect(swept.ok).toBe(false);
    expect(swept.collidingPoses.length).toBeGreaterThan(0);
    const names = swept.collidingPoses.flatMap((pose) => pose.contacts.flatMap((contact) => [contact.partA, contact.partB]));
    expect(names).toContain('carriage');
    expect(names).toContain('wall');
    expect(limitSnapshot(arm)).toEqual(before);
  }, 60_000);

  it('ignores a declared contact pair and still stops on the wall', async () => {
    const session = new CaptureSession();
    const kcad = createModelingApi({ session });
    const arm = kcad.assembly('contact-stop');
    const rail = arm.part('rail', kcad.box(10, 30, 20));
    const carriage = arm.part('carriage', kcad.box(CARRIAGE_LENGTH, 16, 12));
    arm.part('wall', kcad.box(10, 12, 20).translate(WALL_X, 0, 0));
    const pad = arm.part('pad', kcad.box(4, 4, 4));
    // Seat sits 0.05 mm above the pad. The pad rides the carriage in X, so
    // this gap is constant at the authored pose and is not the wall stop.
    arm.part('seat', kcad.box(4, 4, 4).translate(20, 25.05, 8));
    rail.connector('track', axis([RAIL_FACE_X, 15, 10]));
    carriage.connector('slide', axis([0, 8, 6]));
    carriage.connector('top', {
      type: 'frame',
      origin: { kind: 'vec3', value: [10, 16, 6] },
    });
    pad.connector('bond', {
      type: 'frame',
      origin: { kind: 'vec3', value: [0, 2, 2] },
    });
    arm.mate('slide', 'rail.track', 'carriage.slide', 'prismatic', {
      pose: SLIDE_REST,
      limitsMm: [...SLIDE_AUTHORED] as [number, number],
    });
    arm.mate('pad-bond', 'carriage.top', 'pad.bond', 'fastened');

    const touching = await suggestJointRanges(arm, { resolution: 0.05 });
    expect(touching.ok).toBe(false);
    expect(touching.joints[0]?.restWithinClearance).toBe(true);
    expect(touching.joints[0]?.lower.pair).toEqual({ a: 'pad', b: 'seat' });

    await arm.solvedModel(undefined, {
      validate: 'off',
      contacts: [{ parts: ['pad', 'seat'] }],
    });
    const excused = await suggestJointRanges(arm, { resolution: 0.05 });
    const slide = excused.joints.find((joint) => joint.joint === 'slide');
    expect(excused.ok, JSON.stringify(excused.joints)).toBe(true);
    expect(slide?.restWithinClearance).toBe(false);
    expectStop(slide!.upper, slideStop(CLEARANCE), 0.05, 1);
    expect(slide!.upper.pair).toEqual({ a: 'carriage', b: 'wall' });
  }, 60_000);

  it('treats a running fit at exactly the clearance as already reached', async () => {
    const session = new CaptureSession();
    const kcad = createModelingApi({ session });
    const arm = kcad.assembly('exact-clearance-fit');
    const rail = arm.part('rail', kcad.box(10, 30, 20));
    const carriage = arm.part('carriage', kcad.box(CARRIAGE_LENGTH, 16, 12));
    // Carriage Y is [7, 23] at every slide pose. The ceiling starts at x=12,
    // clear of the rail, so the 0.3 mm gap is only with the carriage.
    arm.part('ceiling', kcad.box(10, 8, 8).translate(12, 23.3, 6));
    arm.part('wall', kcad.box(10, 12, 20).translate(WALL_X, 0, 0));
    rail.connector('track', axis([RAIL_FACE_X, 15, 10]));
    carriage.connector('slide', axis([0, 8, 6]));
    arm.mate('slide', 'rail.track', 'carriage.slide', 'prismatic', {
      pose: SLIDE_REST,
      limitsMm: [...SLIDE_AUTHORED] as [number, number],
    });
    const exact = await suggestJointRanges(arm, { resolution: 0.05 });
    expect(exact.ok).toBe(false);
    expect(exact.joints[0]?.restWithinClearance).toBe(true);
    expect(exact.joints[0]?.lower.pair).toEqual({ a: 'carriage', b: 'ceiling' });
    expect(exact.patch).toEqual([]);

    const loose = kcad.assembly('clearance-just-open');
    const rail2 = loose.part('rail', kcad.box(10, 30, 20));
    const carriage2 = loose.part('carriage', kcad.box(CARRIAGE_LENGTH, 16, 12));
    loose.part('ceiling', kcad.box(10, 8, 8).translate(12, 23.301, 6));
    loose.part('wall', kcad.box(10, 12, 20).translate(WALL_X, 0, 0));
    rail2.connector('track', axis([RAIL_FACE_X, 15, 10]));
    carriage2.connector('slide', axis([0, 8, 6]));
    loose.mate('slide', 'rail.track', 'carriage.slide', 'prismatic', {
      pose: SLIDE_REST,
      limitsMm: [...SLIDE_AUTHORED] as [number, number],
    });
    const open = await suggestJointRanges(loose, { resolution: 0.05 });
    expect(open.joints[0]?.restWithinClearance).toBe(false);
    expectStop(open.joints[0]!.upper, slideStop(CLEARANCE), 0.05, 1);
    expect(open.joints[0]?.upper.pair).toEqual({ a: 'carriage', b: 'wall' });
  }, 60_000);

  it('places a revolute stop at the analytic corner angle', async () => {
    const barLength = 80;
    const corner = 1;
    const wallFaceY = 25;
    const targetY = wallFaceY - CLEARANCE;
    const theta = Math.asin(targetY / Math.hypot(barLength, corner)) - Math.atan2(corner, barLength);
    const thetaDeg = (theta * 180) / Math.PI;
    expect(thetaDeg).toBeGreaterThan(16);
    expect(thetaDeg).toBeLessThan(19);
    const tipX = barLength * Math.cos(theta) - corner * Math.sin(theta);
    expect(tipX).toBeGreaterThan(-10);
    expect(tipX).toBeLessThan(110);

    const session = new CaptureSession();
    const kcad = createModelingApi({ session });
    const arm = kcad.assembly('bar-stop');
    const base = arm.part('base', kcad.box(22, 10, 10).translate(-30, -5, -5));
    const bar = arm.part('bar', kcad.box(barLength, 2, 2));
    arm.part('wall', kcad.box(120, 20, 40).translate(-10, wallFaceY, -20));
    base.connector('pivot', axis([0, 0, 0], [0, 0, 1]));
    bar.connector('pivot', axis([0, corner, corner], [0, 0, 1]));
    arm.mate('hinge', 'base.pivot', 'bar.pivot', 'revolute', {
      pose: 5,
      limitsDeg: [-10, 60],
    });
    const before = limitSnapshot(arm);
    const resolution = 0.1;
    const result = await suggestJointRanges(arm, { resolution });
    const hinge = result.joints[0];
    expect(result.ok, JSON.stringify(result.joints)).toBe(true);
    expect(hinge?.rest).toBe(5);
    expect(hinge?.restWithinClearance).toBe(false);
    expect(hinge?.lower).toMatchObject({ status: 'no-stop', value: -10 });
    expectStop(hinge!.upper, thetaDeg, resolution, 1);
    expect(hinge!.upper.pair).toEqual({ a: 'bar', b: 'wall' });
    expect(Math.abs((hinge!.upper.value ?? 0) - (thetaDeg - 5))).toBeGreaterThan(1);
    expect(result.limitsSnippet).toMatch(/limitsDeg:/);
    expect(result.limitsSnippet).toMatch(/Not applied/);
    expect(limitSnapshot(arm)).toEqual(before);
  }, 60_000);
});
