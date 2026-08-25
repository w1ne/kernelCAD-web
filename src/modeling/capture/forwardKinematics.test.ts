// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Regression: the joint origin is a PIVOT POINT, not a parent->child frame
// offset. Parts are modeled in assembly coordinates, so a joint must rotate
// its child ABOUT the origin — T(o) . M . T(-o) — and must leave the child
// exactly where it was modeled at pose 0.
//
// The original code composed T(o) . M with no T(-o), so the origin leaked in
// as a bare translation and every non-origin pivot displaced the child by the
// pivot vector. Every pre-existing `.revolute(...)` test used
// `origin: [0, 0, 0]`, where T(o) is identity and the defect is invisible.
//
// These tests all use a NON-ZERO pivot on purpose.

import { describe, it, expect } from 'vitest';
import { CaptureSession } from './captureSession';
import { createApi } from '../api';
import type { Vec3 } from '../../shared/runtime/se3';

const PIVOT: Vec3 = [5, 20, 16];

function closeTo(actual: Vec3, expected: Vec3, digits = 9): void {
  for (let i = 0; i < 3; i++) expect(actual[i]).toBeCloseTo(expected[i], digits);
}

/** Hinge with the arm modeled resting on the base, pivot away from origin. */
function hinge() {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  const arm = kcad.assembly('hinge');
  const base = arm.part('base', kcad.box(60, 40, 10));
  const link = arm.part('arm', kcad.box(50, 10, 8).translate(5, 15, 12));
  return { arm, base, link, kcad };
}

describe('forwardKinematics — joint origin is a pivot, not an offset', () => {
  it('revolute at pose 0 leaves the child exactly where it was modeled', () => {
    const { arm, base, link } = hinge();
    arm.revolute('elbow', base, link, { axis: [0, -1, 0], origin: PIVOT, limitsDeg: [0, 90] });

    const t = arm.solve({ elbow: 0 }).transform('arm');

    // Identity — not a translation by the pivot.
    closeTo(t.point([5, 15, 12]), [5, 15, 12]);
    closeTo(t.point([55, 25, 20]), [55, 25, 20]);
  });

  it('revolute holds the pivot point fixed under rotation', () => {
    const { arm, base, link } = hinge();
    arm.revolute('elbow', base, link, { axis: [0, -1, 0], origin: PIVOT, limitsDeg: [0, 90] });

    for (const deg of [15, 30, 45, 90]) {
      const t = arm.solve({ elbow: deg }).transform('arm');
      // A point ON the axis must not move — that is what "pivot" means.
      closeTo(t.point(PIVOT), PIVOT);
    }
  });

  it('rotation about Y never changes a Y coordinate', () => {
    const { arm, base, link } = hinge();
    arm.revolute('elbow', base, link, { axis: [0, -1, 0], origin: PIVOT, limitsDeg: [0, 90] });

    const t = arm.solve({ elbow: 30 }).transform('arm');
    for (const p of [[5, 15, 12], [55, 25, 20], [30, 20, 16]] as Vec3[]) {
      expect(t.point(p)[1]).toBeCloseTo(p[1], 9);
    }
  });

  it('revolute rotates the child by the requested angle about the pivot', () => {
    const { arm, base, link } = hinge();
    arm.revolute('elbow', base, link, { axis: [0, -1, 0], origin: PIVOT, limitsDeg: [0, 90] });

    // 90 deg about -Y takes +X to +Z. The arm tip is 50 mm out along +X from
    // the pivot, so it must land 50 mm above the pivot.
    const t = arm.solve({ elbow: 90 }).transform('arm');
    closeTo(t.point([55, 20, 16]), [5, 20, 66]);
  });

  it('prismatic translates by the stroke only — the pivot adds nothing', () => {
    const { arm, base, link } = hinge();
    arm.prismatic('slide', base, link, { axis: [0, 0, 1], origin: PIVOT, limitsMm: [0, 40] });

    closeTo(arm.solve({ slide: 0 }).transform('arm').point([5, 15, 12]), [5, 15, 12]);
    closeTo(arm.solve({ slide: 25 }).transform('arm').point([5, 15, 12]), [5, 15, 37]);
  });

  it('ball joint at rest does not move the child', () => {
    const { arm, base, link } = hinge();
    arm.ball('socket', base, link, { origin: PIVOT });

    closeTo(arm.solve({}).transform('arm').point([5, 15, 12]), [5, 15, 12]);
    closeTo(arm.solve({ socket: [0, 30, 0] }).transform('arm').point(PIVOT), PIVOT);
  });

  it('a chain of joints composes without accumulating pivot offsets', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('chain');
    const a = arm.part('a', kcad.box(10, 10, 10));
    const b = arm.part('b', kcad.box(10, 10, 10).translate(0, 0, 10));
    const c = arm.part('c', kcad.box(10, 10, 10).translate(0, 0, 20));
    arm.revolute('j1', a, b, { axis: [0, 0, 1], origin: [0, 0, 10] });
    arm.revolute('j2', b, c, { axis: [0, 0, 1], origin: [0, 0, 20] });

    const solved = arm.solve({ j1: 0, j2: 0 });
    closeTo(solved.transform('b').point([0, 0, 10]), [0, 0, 10]);
    closeTo(solved.transform('c').point([0, 0, 20]), [0, 0, 20]);
  });
});
