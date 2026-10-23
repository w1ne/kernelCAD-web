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
// A stop block sits in the rocker's layer. `checkSweptCollision` walks the
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

// As-built pose at crank = 0: the coupler and rocker mate poses close the
// loop there, so continuation starts from a closed, non-singular pose.
const t4At0 = rockerAngle(0);
const C0 = [d + c * Math.cos(t4At0), c * Math.sin(t4At0)];
const t3At0 = Math.atan2(C0[1], C0[0] - a);

const arm = assembly('four-bar');
// Links live in separate Y layers so they never touch each other; every
// connector sits at y = 0. Axis −Y makes a positive angle turn +X toward +Z.
const Y: [number, number, number] = [0, -1, 0];
const pivot = (x: number) => ({ type: 'axis' as const, origin: { kind: 'vec3' as const, value: [x, 0, 0] as [number, number, number] }, axis: Y });

const ground = arm.part('ground', box(d + 20, 6, 8, true).translate(d / 2, 0, -20));
const crank = arm.part('crank', box(a, 6, 8, true).translate(a / 2, 12, 0));
const coupler = arm.part('coupler', box(b, 6, 8, true).translate(b / 2, 24, 0));
const rocker = arm.part('rocker', box(c, 6, 8, true).translate(c / 2, 36, 0));
// Stop block in the rocker's layer, left of the rocker's swing.
const stopFaceX = 58;
const stopZ: [number, number] = [40, 90];
const stop = arm.part('stop', box(28, 6, stopZ[1] - stopZ[0], true).translate(stopFaceX - 14, 36, (stopZ[0] + stopZ[1]) / 2));

ground.connector('o2', pivot(0));
ground.connector('o4', pivot(d));
ground.connector('stopMount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
stop.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
crank.connector('base', pivot(0));
crank.connector('tip', pivot(a));
coupler.connector('base', pivot(0));
coupler.connector('tip', pivot(b));
rocker.connector('base', pivot(0));
rocker.connector('tip', pivot(c));

arm.mate('crank', 'ground.o2', 'crank.base', 'revolute', { limitsDeg: [0, 360] });
arm.mate('rocker', 'ground.o4', 'rocker.base', 'revolute', { pose: deg(t4At0), limitsDeg: [0, 180] });
arm.mate('coupler', 'crank.tip', 'coupler.base', 'revolute', { pose: deg(t3At0), limitsDeg: [-180, 180] });
arm.mate('pin', 'coupler.tip', 'rocker.tip', 'revolute', { limitsDeg: [-180, 180] });
arm.mate('stopMount', 'ground.stopMount', 'stop.mount', 'fastened');

// Sweep the crank alone; the loop solver poses coupler and rocker.
const sweep = await kinematic.checkSweptCollision(arm, { joint: 'crank', range: [0, 300, STEP] });
const first = sweep.collidingPoses[0];
if (first === undefined) throw new Error('expected the rocker to reach the stop');
if (!first.contacts.some((x) => [x.partA, x.partB].includes('rocker') && [x.partA, x.partB].includes('stop'))) {
  throw new Error(`first contact is not rocker vs stop: ${JSON.stringify(first.contacts)}`);
}
const sweepAngle = first.pose.crank as number;

// Closed form: first crank sample where a rocker corner crosses the stop face.
function rockerHitsStop(t2deg: number): boolean {
  const t4 = rockerAngle(rad(t2deg));
  const u = [Math.cos(t4), Math.sin(t4)];
  const v = [-Math.sin(t4), Math.cos(t4)];
  for (const [s, w] of [[0, -4], [0, 4], [c, -4], [c, 4]]) {
    const x = d + s * u[0] + w * v[0];
    const z = s * u[1] + w * v[1];
    if (x < stopFaceX && z > stopZ[0] && z < stopZ[1]) return true;
  }
  return false;
}
let closedForm = NaN;
for (let t = 0; t <= 300; t += STEP) {
  if (rockerHitsStop(t)) { closedForm = t; break; }
}
console.log(`[four-bar] first contact: sweep crank=${sweepAngle}°, closed form crank=${closedForm}° (rocker vs stop)`);
if (!(Math.abs(sweepAngle - closedForm) <= STEP)) {
  throw new Error(`sweep first contact ${sweepAngle}° disagrees with the closed form ${closedForm}°`);
}
const loopDiags = sweep.diagnostics.filter((x) => x.code.startsWith('kinematic.loop.'));
console.log(`[four-bar] sampled ${sweep.posesSampled} poses; loop diagnostics: ${loopDiags.map((x) => x.code).join(', ') || 'none'}`);
if (sweep.posesSampled !== 300 / STEP + 1) throw new Error('the crank-rocker should sweep its whole range without a loop stop');

return arm.solvedModel({ crank: 60 });
