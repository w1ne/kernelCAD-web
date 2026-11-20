// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Closed-loop four-bar: crank 40, coupler 120, rocker 80, ground 100 mm (a
// Grashof crank-rocker). The four revolute mates form one closed loop; the
// spanning tree from `ground` leaves out the coupler–rocker mate `pin`, so
// the loop is named 'pin'. Only the crank is driven — the loop solver poses
// the coupler and rocker at every sample, continuing from the previous pose
// so the linkage stays in the open assembly mode it was modeled in.
//
// Every joint frame lies on the y=0 pin plane and mated parts share a face
// there, so `evaluate_script` reports a real mechanism. The mate limits are
// the crank travel where every loop joint angle is monotonic (40° to 130°);
// the sweep runs past both ends of them.
//
// A stop block stands in the rocker's layer beside the rocker pivot. `checkSweptCollision` walks the
// crank and reports the FIRST crank angle at which the rocker touches the
// stop. The script recomputes that angle from the closed-form rocker angle
// (law of cosines on the four-bar, equivalent to Freudenstein's equation)
// and the rocker's corner positions, and asserts the sweep agrees to one
// sample step.
//
// Run with:
//   npx tsx src/agent/cli/index.ts evaluate examples/kinematic/four-bar-swept.kcad.ts
//
// Expected console output:
//   [four-bar] first contact: sweep crank=<A>°, closed form crank=<A>° (rocker vs stop)
//   [four-bar] sampled <N> poses; loop diagnostics: none

const a = 40;   // crank
const b = 120;  // coupler
const c = 80;   // rocker
const d = 100;  // ground pivot spacing
const STEP = 4; // sweep step, degrees (164° first contact is on the grid)

// Closed-form rocker angle (rad) for crank angle t2 (rad), open branch:
// |C − B| = b with B = a(cos t2, sin t2), C = (d, 0) + c(cos t4, sin t4).
function rockerAngle(t2: number): number {
  const bx = a * Math.cos(t2), bz = a * Math.sin(t2);
  const P = 2 * c * (d - bx);
  const Q = -2 * c * bz;
  const R = b * b - c * c - (d - bx) ** 2 - bz * bz;
  return Math.atan2(Q, P) + Math.acos(R / Math.hypot(P, Q));
}
const deg = (r: number) => (r * 180) / Math.PI;
const rad = (v: number) => (v * Math.PI) / 180;

// Closed-form coupler angle (rad, from +X) for crank angle t2 (rad).
function couplerAngle(t2: number): number {
  const t4 = rockerAngle(t2);
  return Math.atan2(c * Math.sin(t4) - a * Math.sin(t2), d + c * Math.cos(t4) - a * Math.cos(t2));
}
// Mate angles (deg) for a crank angle (deg): each is child minus parent.
const rockerDeg = (t: number) => deg(rockerAngle(rad(t)));
const couplerDeg = (t: number) => deg(couplerAngle(rad(t))) - t;
const pinDeg = (t: number) => deg(rockerAngle(rad(t)) - couplerAngle(rad(t)));

// As-built pose at crank = 60°: the mate poses close the loop there, so
// continuation starts from a closed, non-singular pose.
const crank0 = 60;
// The rocker reverses at crank 24.1° and 231.3° (crank and coupler in line),
// and the rocker reaches the stop at 164°. The limits stay inside that span.
const crankRange: [number, number] = [40, 130];

const arm = assembly('four-bar');
// Every joint frame lies on the y=0 pin plane. Mated parts occupy opposite
// half-spaces (ground and coupler at +Y, crank and rocker at −Y), so each
// pair shares a face at its joint and no volume. Axis −Y makes a positive
// angle turn +X toward +Z.
const Y: [number, number, number] = [0, -1, 0];
const pivot = (x: number) => ({ type: 'axis' as const, origin: { kind: 'vec3' as const, value: [x, 0, 0] as [number, number, number] }, axis: Y });

// Ground: a low bar with a post under each ground pivot. The coupler shares
// the ground's layer; it passes above the bar at crank 0° and above the
// crank post at crank 200°.
const BAR_Z: [number, number] = [-24, -8];
const POST_TOP = 4;
const post = (x: number) => box(16, 6, POST_TOP - BAR_Z[1], true).translate(x, 3, (POST_TOP + BAR_Z[1]) / 2);
const ground = arm.part(
  'ground',
  box(d + 16, 6, BAR_Z[1] - BAR_Z[0], true).translate(d / 2, 3, (BAR_Z[0] + BAR_Z[1]) / 2)
    .union(post(0))
    .union(post(d)),
);
const crank = arm.part('crank', box(a, 6, 8, true).translate(a / 2, -3, 0));
const coupler = arm.part('coupler', box(b, 6, 8, true).translate(b / 2, 3, 0));
const rocker = arm.part('rocker', box(c, 6, 8, true).translate(c / 2, -3, 0));
// Stop block in the rocker's layer, seated on the ground bar face just left
// of the rocker pivot: the rocker leans onto it past the mate limits; the
// crank stays well clear of it.
const stopX: [number, number] = [72, 88];
const stopZ: [number, number] = [BAR_Z[0], 16];
const stop = arm.part(
  'stop',
  box(stopX[1] - stopX[0], 6, stopZ[1] - stopZ[0], true).translate((stopX[0] + stopX[1]) / 2, -3, (stopZ[0] + stopZ[1]) / 2),
);
// Stop seat: a point on the face the stop shares with the ground bar.
const stopSeat = { type: 'frame' as const, origin: { kind: 'vec3' as const, value: [(stopX[0] + stopX[1]) / 2, 0, (BAR_Z[0] + BAR_Z[1]) / 2] as [number, number, number] } };

ground.connector('o2', pivot(0));
ground.connector('o4', pivot(d));
ground.connector('stopMount', stopSeat);
stop.connector('mount', stopSeat);
crank.connector('base', pivot(0));
crank.connector('tip', pivot(a));
coupler.connector('base', pivot(0));
coupler.connector('tip', pivot(b));
rocker.connector('base', pivot(0));
rocker.connector('tip', pivot(c));

// Each loop joint is limited to its closed-form values at the two ends of
// the crank travel, so the loop closes at every mate limit.
const limits = (f: (t: number) => number): [number, number] => {
  const [lo, hi] = [f(crankRange[0]), f(crankRange[1])];
  return [Math.min(lo, hi), Math.max(lo, hi)];
};
arm.mate('crank', 'ground.o2', 'crank.base', 'revolute', { pose: crank0, limitsDeg: crankRange });
arm.mate('rocker', 'ground.o4', 'rocker.base', 'revolute', { pose: rockerDeg(crank0), limitsDeg: limits(rockerDeg) });
arm.mate('coupler', 'crank.tip', 'coupler.base', 'revolute', { pose: couplerDeg(crank0), limitsDeg: limits(couplerDeg) });
arm.mate('pin', 'coupler.tip', 'rocker.tip', 'revolute', { pose: pinDeg(crank0), limitsDeg: limits(pinDeg) });
arm.mate('stopMount', 'ground.stopMount', 'stop.mount', 'fastened');

// Sweep the crank alone, past both mate limits; the loop solver poses
// coupler and rocker.
const sweep = await kinematic.checkSweptCollision(arm, { joint: 'crank', range: [0, 200, STEP] });
const first = sweep.collidingPoses[0];
if (first === undefined) throw new Error('expected the rocker to reach the stop');
if (!first.contacts.some((x) => [x.partA, x.partB].includes('rocker') && [x.partA, x.partB].includes('stop'))) {
  throw new Error(`first contact is not rocker vs stop: ${JSON.stringify(first.contacts)}`);
}
const sweepAngle = first.pose.crank as number;

// Closed form: first crank sample where the rocker rectangle (length c,
// width 8, on the closed-form rocker angle) overlaps the stop rectangle in
// the mechanism plane — separating-axis test on the four edge normals.
function rockerHitsStop(t2deg: number): boolean {
  const t4 = rockerAngle(rad(t2deg));
  const u = [Math.cos(t4), Math.sin(t4)];
  const v = [-Math.sin(t4), Math.cos(t4)];
  const rockerPts = [[0, -4], [0, 4], [c, -4], [c, 4]].map(([s, w]) => [d + s * u[0] + w * v[0], s * u[1] + w * v[1]]);
  const stopPts = [[stopX[0], stopZ[0]], [stopX[1], stopZ[0]], [stopX[0], stopZ[1]], [stopX[1], stopZ[1]]];
  for (const axis of [[1, 0], [0, 1], u, v]) {
    const proj = (pts: number[][]) => pts.map((p) => p[0] * axis[0] + p[1] * axis[1]);
    const [r, k] = [proj(rockerPts), proj(stopPts)];
    if (Math.max(...r) <= Math.min(...k) || Math.max(...k) <= Math.min(...r)) return false;
  }
  return true;
}
let closedForm = NaN;
for (let t = 0; t <= 200; t += STEP) {
  if (rockerHitsStop(t)) { closedForm = t; break; }
}
console.log(`[four-bar] first contact: sweep crank=${sweepAngle}°, closed form crank=${closedForm}° (rocker vs stop)`);
if (!(Math.abs(sweepAngle - closedForm) <= STEP)) {
  throw new Error(`sweep first contact ${sweepAngle}° disagrees with the closed form ${closedForm}°`);
}
const loopDiags = sweep.diagnostics.filter((x) => x.code.startsWith('kinematic.loop.'));
console.log(`[four-bar] sampled ${sweep.posesSampled} poses; loop diagnostics: ${loopDiags.map((x) => x.code).join(', ') || 'none'}`);
if (sweep.posesSampled !== 200 / STEP + 1) throw new Error('the crank-rocker should sweep its whole range without a loop stop');

return arm.solvedModel({ crank: crank0 });
