// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Joint-graph closed loops (a part with two parent joints): a planar
// five-bar whose tip body is joined to both distal links at its origin.
// Driving both proximal joints fixes the tip at a circle intersection — the
// closed-form oracle. `checkReachable` drives only the loop's independent
// joints instead of refusing the loop.

import { describe, expect, it } from 'vitest';
import { CaptureSession } from './captureSession';
import { createModelingApi } from '../api';
import { checkReachable } from '../../kinematic/checkReachable';

const [d, l1, l2] = [60, 50, 70];
const Z: [number, number, number] = [0, 0, 1];
const rad = (v: number) => (v * Math.PI) / 180;

/** Tip = upper intersection of the two distal-link circles, for absolute
 *  proximal angles t1 (left) and t2 (right), degrees. */
function tipClosedForm(t1: number, t2: number): [number, number] {
  const A = [l1 * Math.cos(rad(t1)), l1 * Math.sin(rad(t1))];
  const B = [d + l1 * Math.cos(rad(t2)), l1 * Math.sin(rad(t2))];
  const dx = B[0] - A[0], dy = B[1] - A[1];
  const dist = Math.hypot(dx, dy);
  const h = Math.sqrt(l2 * l2 - (dist / 2) ** 2);
  return [A[0] + dx / 2 - (dy / dist) * h, A[1] + dy / 2 + (dx / dist) * h];
}

// Joint-graph child frames sit at their joint, with the parent's
// orientation at pose 0, so the links are authored in the assembled
// configuration (proximal angles 100° and 60°): every joint at 0 closes.
const [T1, T2] = [100, 60];

function fiveBar() {
  const k = createModelingApi({ session: new CaptureSession() });
  const arm = k.assembly('five-bar');
  const ground = arm.part('ground', k.box(10, 10, 2));
  const a1 = arm.part('a1', k.box(10, 2, 2));
  const a2 = arm.part('a2', k.box(10, 2, 2));
  const b1 = arm.part('b1', k.box(10, 2, 2));
  const b2 = arm.part('b2', k.box(10, 2, 2));
  const tip = arm.part('tip', k.box(2, 2, 2));
  const A: [number, number, number] = [l1 * Math.cos(rad(T1)), l1 * Math.sin(rad(T1)), 0];
  const B: [number, number, number] = [l1 * Math.cos(rad(T2)), l1 * Math.sin(rad(T2)), 0];
  const [tx, ty] = tipClosedForm(T1, T2);
  arm.revolute('proxA', ground, a1, { axis: Z, origin: [0, 0, 0] });
  arm.revolute('distA', a1, a2, { axis: Z, origin: A });
  arm.revolute('proxB', ground, b1, { axis: Z, origin: [d, 0, 0] });
  arm.revolute('distB', b1, b2, { axis: Z, origin: B });
  arm.revolute('tipA', a2, tip, { axis: Z, origin: [tx - A[0], ty - A[1], 0] });
  arm.revolute('tipB', b2, tip, { axis: Z, origin: [tx - d - B[0], ty - B[1], 0] });
  return arm;
}

describe('joint-graph closed loops', () => {
  it('solve() poses the five-bar tip at the circle intersection', () => {
    const arm = fiveBar();
    const solved = arm.solve({ proxA: 10, proxB: -5 });
    const p = solved.transform('tip').decomposeToTranslateAndRotate().translate;
    const [x, y] = tipClosedForm(T1 + 10, T2 - 5);
    expect(p[0]).toBeCloseTo(x, 5);
    expect(p[1]).toBeCloseTo(y, 5);
  });

  it('checkReachable drives the loop instead of refusing it', async () => {
    const [x, y] = tipClosedForm(T1 + 10, T2 + 10);
    const r = await checkReachable(fiveBar(), { tipLink: 'tip', target: { position: [x, y, 0], positionToleranceMm: 0.05 } });
    expect(r.diagnostics.map((dg) => dg.code)).not.toContain('kinematic.solver.unsupported-config');
    expect(r.ok).toBe(true);
  });
});
