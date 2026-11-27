// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// expected: ['kinematic.collision.swept']
//
// Snippet 9 — closed-loop four-bar swept past a stop. Four revolute mates
// make one loop (crank 40, coupler 120, rocker 80, ground 100: a Grashof
// crank-rocker). Drive ONLY the crank: the loop solver poses coupler and
// rocker at each sample, continuing from the previous pose so the linkage
// stays in its modeled assembly mode. checkSweptCollision reports the first
// crank angles where the rocker enters and exits a small stop block; the
// script checks both refined ends against the closed-form rocker motion.
// Full version with a 0–200° sweep:
// examples/kinematic/four-bar-swept.kcad.ts.
//
// Author the as-built pose closed (here via mate `pose` values computed
// from the closed form), away from a flat/straight singular pose.
//
// The mate limits are the crank travel short of the stop (40° to 130°): the
// rocker, coupler and pin angles are monotonic over it, so every loop joint
// closes at both ends of its limits. The sweep runs past the limits to find
// the stop.

const a = 40;   // crank
const b = 120;  // coupler
const c = 80;   // rocker
const d = 100;  // ground pivot spacing
const STEP = 2; // sweep step, degrees

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

const crank0 = 60; // as-built crank angle
const crankRange: [number, number] = [40, 130];

const arm = assembly('four-bar');
// Every joint frame lies on the y=0 pin plane. Mated parts occupy opposite
// half-spaces (ground and coupler at +Y, crank and rocker at −Y), so each
// pair shares a face at its joint and no volume. Axis −Y makes a positive
// angle turn +X toward +Z.
const Y: [number, number, number] = [0, -1, 0];
const pivot = (x: number) => ({ type: 'axis' as const, origin: { kind: 'vec3' as const, value: [x, 0, 0] as [number, number, number] }, axis: Y });

// Ground: a bar under both ground pivots. Its top edge stays below the
// coupler sweep, which shares its layer.
const GROUND_Z: [number, number] = [-12, 4];
const ground = arm.part(
  'ground',
  box(d + 16, 6, GROUND_Z[1] - GROUND_Z[0], true).translate(d / 2, 3, (GROUND_Z[0] + GROUND_Z[1]) / 2),
);
const crank = arm.part('crank', box(a, 6, 8, true).translate(a / 2, -3, 0));
const coupler = arm.part('coupler', box(b, 6, 8, true).translate(b / 2, 3, 0));
const rocker = arm.part('rocker', box(c, 6, 8, true).translate(c / 2, -3, 0));
// Small collision-test block in the rocker's layer near its tip path. The
// rocker crosses it around crank 137–168° and clears it before the walk ends.
const stopX: [number, number] = [68, 76];
const stopZ: [number, number] = [71, 80];
const stopShape = box(76, 6, 8, true).translate(142, -3, -8)
  .union(box(4, 6, 104, true).translate(180, -3, 48))
  .union(box(108, 6, 5, true).translate(126, -3, 97.5))
  .union(box(4, 6, 20, true).translate(74, -3, 89))
  .union(box(stopX[1] - stopX[0], 6, stopZ[1] - stopZ[0], true)
    .translate((stopX[0] + stopX[1]) / 2, -3, (stopZ[0] + stopZ[1]) / 2));
const stop = arm.part(
  'stop',
  stopShape,
);
// The bracket runs above the moving linkage and joins the ground bar at a
// shared face, so the test block is a real fixed part of the assembly.
const stopSeat = { type: 'frame' as const, origin: { kind: 'vec3' as const, value: [106, 0, -8] as [number, number, number] } };

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

const limits = (f: (t: number) => number): [number, number] => {
  const [lo, hi] = [f(crankRange[0]), f(crankRange[1])];
  return [Math.min(lo, hi), Math.max(lo, hi)];
};
arm.mate('crank', 'ground.o2', 'crank.base', 'revolute', { pose: crank0, limitsDeg: crankRange });
arm.mate('rocker', 'ground.o4', 'rocker.base', 'revolute', { pose: rockerDeg(crank0), limitsDeg: limits(rockerDeg) });
arm.mate('coupler', 'crank.tip', 'coupler.base', 'revolute', { pose: couplerDeg(crank0), limitsDeg: limits(couplerDeg) });
arm.mate('pin', 'coupler.tip', 'rocker.tip', 'revolute', { pose: pinDeg(crank0), limitsDeg: limits(pinDeg) });
arm.mate('stopMount', 'ground.stopMount', 'stop.mount', 'fastened');

// Sweep the crank alone; the loop solver poses coupler and rocker.
const sweep = await kinematic.checkSweptCollision(arm, { joint: 'crank', range: [120, 200, STEP] });
const first = sweep.collidingPoses[0];
if (first === undefined) throw new Error('expected the rocker to reach the stop');
if (!first.contacts.some((x) => [x.partA, x.partB].includes('rocker') && [x.partA, x.partB].includes('stop'))) {
  throw new Error(`first contact is not rocker vs stop: ${JSON.stringify(first.contacts)}`);
}
const sweepAngle = first.pose.crank as number;

// Closed form: whether the rocker rectangle (length c, width 8, on the
// closed-form rocker angle) overlaps the test block in the mechanism plane —
// separating-axis test on the four edge normals. Because the report's default
// cutoff ignores tiny intersection volumes, the geometric onset lies inside
// the neighboring coarse step, while `resolution` bounds the cutoff bracket.
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

function contactBoundary(lo: number, hi: number, loHits: boolean): number {
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (rockerHitsStop(mid) === loHits) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

let closedForm = NaN;
for (let t = 120; t <= 200; t += STEP) {
  if (rockerHitsStop(t)) { closedForm = t; break; }
}
console.log(`[four-bar] first contact: sweep crank=${sweepAngle}°, closed form crank=${closedForm}° (rocker vs stop)`);
if (!(Math.abs(sweepAngle - closedForm) <= STEP)) {
  throw new Error(`sweep first contact ${sweepAngle}° disagrees with the closed form ${closedForm}°`);
}

// The overlap report must refine both sides of this finite collision window
// while continuing the same closed-loop branch as the coarse sweep.
const walk = sweep.walks?.find((w) => w.joint === 'crank');
const pair = walk?.overlaps.find((p) => [p.partA, p.partB].includes('rocker') && [p.partA, p.partB].includes('stop'));
const stretch = pair?.stretches[0];
const closedFormStart = contactBoundary(136, 138, false);
const closedFormEnd = contactBoundary(166, 168, true);
if (walk === undefined || pair === undefined || stretch === undefined) {
  throw new Error('closed-loop swept report omitted the rocker/test-block overlap');
}
if (walk.unknown.length > 0 || pair.stretches.length !== 1 || stretch.startsAtFirstSample || stretch.endsAtLastSample) {
  throw new Error(`expected one measured, bounded overlap stretch: ${JSON.stringify({ unknown: walk.unknown, stretches: pair.stretches })}`);
}
if (walk.collisionToleranceMm3 !== 0.01) {
  throw new Error(`expected the default 0.01 mm³ overlap cutoff, got ${walk.collisionToleranceMm3}`);
}
if (walk.refinementSamples !== 12) {
  throw new Error(`expected 12 loop-continuing boundary probes, got ${walk.refinementSamples}`);
}
if (Math.abs(stretch.startResolution - STEP / 64) > 1e-9 || Math.abs(stretch.endResolution - STEP / 64) > 1e-9) {
  throw new Error(`expected both loop overlap ends refined to ${STEP / 64}°: ${JSON.stringify(stretch)}`);
}
if (!(stretch.start > closedFormStart && stretch.start - closedFormStart < STEP)) {
  throw new Error(`thresholded overlap start ${stretch.start}° is outside the closed-form entry step at ${closedFormStart}°`);
}
if (!(stretch.end < closedFormEnd && closedFormEnd - stretch.end < STEP)) {
  throw new Error(`thresholded overlap end ${stretch.end}° is outside the closed-form exit step at ${closedFormEnd}°`);
}
if (!(pair.worstVolumeMm3 > 0) || pair.worstPose.crank < stretch.start || pair.worstPose.crank > stretch.end) {
  throw new Error(`invalid worst overlap pose/volume: ${JSON.stringify(pair)}`);
}
console.log(`[four-bar] rocker/test-block overlap: ${stretch.start}°–${stretch.end}° (closed form ${closedFormStart.toFixed(3)}°–${closedFormEnd.toFixed(3)}°, volume cutoff ${walk.collisionToleranceMm3} mm³, bisection ${stretch.startResolution}°)`);
const loopDiags = sweep.diagnostics.filter((x) => x.code.startsWith('kinematic.loop.'));
console.log(`[four-bar] sampled ${sweep.posesSampled} poses; loop diagnostics: ${loopDiags.map((x) => x.code).join(', ') || 'none'}`);
if (sweep.posesSampled !== 80 / STEP + 1) throw new Error('the crank-rocker should sweep the range without a loop stop');

return arm.solvedModel({ crank: crank0 });
