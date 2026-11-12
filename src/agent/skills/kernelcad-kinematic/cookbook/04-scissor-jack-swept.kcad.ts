// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// expected: []
//
// Snippet 4 — scissor jack as a real closed loop. Two 120 mm links cross at
// their centres; each has one fixed pivot (base / platform) and one end on a
// slider. Seven mates, six bodies: two independent loops, planar mobility 1.
// Only the lift angle is driven; the loop solver poses both links, both
// sliders and the platform at every sample, continuing from the previous
// pose. The links occupy opposite sides of the shared pin plane, so their
// faces meet at the crossing without sharing volume. The platform rail clears
// the link path, and its height follows the closed form h = L·sin(lift).
//
// Loops are named after the mate the solver's spanning tree leaves out
// (here 'footPin' and 'headSlide'); every kinematic.loop.* finding names one.

const L = 120;
const lift0 = 30; // as-built lift angle, degrees
const r = (d: number) => (d * Math.PI) / 180;
const liftRange: [number, number] = [15, 60];
const sliderRange: [number, number] = [L * Math.cos(r(liftRange[1])), L * Math.cos(r(liftRange[0]))];

const arm = assembly('cookbook-scissor-jack');
const Y: [number, number, number] = [0, -1, 0]; // +angle turns +X toward +Z
const pin = (x: number) => ({ type: 'axis' as const, origin: { kind: 'vec3' as const, value: [x, 0, 0] as [number, number, number] }, axis: Y });
const track = (z: number) => ({ type: 'axis' as const, origin: { kind: 'vec3' as const, value: [0, 0, z] as [number, number, number] }, axis: [1, 0, 0] as [number, number, number] });

// The base rail sits below the link sweep. Its raised pivot pad reaches the
// pin plane at z=0; the foot track is on the rail, at z=-7.
const base = arm.part(
  'base',
  box(160, 6, 6, true).translate(60, 3, -7)
    .union(box(16, 6, 4.2, true).translate(0, 3, -2.1)),
);
// Link frames all lie on the y=0 pin plane. Adjacent parts occupy opposite
// half-spaces, leaving a shared face at each pin instead of a 12 mm axial gap.
const linkA = arm.part('linkA', box(L, 6, 8, true).translate(L / 2, -3, 0));
const linkB = arm.part('linkB', box(L, 6, 8, true).translate(L / 2, 3, 0));
// The foot slider bridges the link pin plane and the lower base track.
const footSlider = arm.part('footSlider', box(16, 6, 10, true).translate(0, -3, -5));
// A post carries the top pin and track frame; the raised rail clears the
// scissor links and gives the head slider a bearing face over its travel.
const platform = arm.part(
  'platform',
  box(16, 6, 8, true).translate(0, -3, 4)
    .union(box(160, 6, 6.2, true).translate(60, -3, 11)),
);
const headSlider = arm.part('headSlider', box(16, 6, 8, true).translate(0, 3, 4));

base.connector('pivot', pin(0));
base.connector('track', track(-7));
linkA.connector('foot', pin(0));
linkA.connector('mid', pin(L / 2));
linkA.connector('head', pin(L));
linkB.connector('foot', pin(0));
linkB.connector('mid', pin(L / 2));
linkB.connector('head', pin(L));
footSlider.connector('pin', pin(0));
footSlider.connector('track', track(-7));
platform.connector('pivot', pin(0));
platform.connector('track', track(0));
headSlider.connector('pin', pin(0));
headSlider.connector('track', track(0));

// As-built pose at lift = 30°: linkA rises from the base pivot, linkB from
// the foot slider (x = L·cos) to the platform pivot; platform level.
arm.mate('lift', 'base.pivot', 'linkA.foot', 'revolute', { pose: lift0, limitsDeg: liftRange });
arm.mate('footSlide', 'base.track', 'footSlider.track', 'prismatic', { pose: L * Math.cos(r(lift0)), limitsMm: sliderRange });
arm.mate('center', 'linkA.mid', 'linkB.mid', 'revolute', { pose: 180 - 2 * lift0, limitsDeg: [180 - 2 * liftRange[1], 180 - 2 * liftRange[0]] });
arm.mate('footPin', 'linkB.foot', 'footSlider.pin', 'revolute', { pose: lift0 - 180, limitsDeg: [liftRange[0] - 180, liftRange[1] - 180] });
arm.mate('headPin', 'linkA.head', 'headSlider.pin', 'revolute', { pose: -lift0, limitsDeg: [-liftRange[1], -liftRange[0]] });
arm.mate('topPin', 'linkB.head', 'platform.pivot', 'revolute', { pose: lift0 - 180, limitsDeg: [liftRange[0] - 180, liftRange[1] - 180] });
arm.mate('headSlide', 'platform.track', 'headSlider.track', 'prismatic', { pose: L * Math.cos(r(lift0)), limitsMm: sliderRange });

// Sweep the lift angle alone across 15°..60° (1° steps: 46 samples).
const r1 = await kinematic.checkSweptCollision(arm, { joint: 'lift', range: [liftRange[0], liftRange[1], 1] });
if (r1.source !== 'local') throw new Error('source !== local');
if (!r1.ok) throw new Error(`expected a clean sweep; codes=${r1.diagnostics.map((d) => d.code).join(',')}`);
if (r1.posesSampled !== 46) throw new Error(`the loop should pose every sample; sampled ${r1.posesSampled}`);
if (r1.diagnostics.some((d) => d.code.startsWith('kinematic.loop.'))) {
  throw new Error(`unexpected loop finding: ${r1.diagnostics.map((d) => d.message).join(' | ')}`);
}

// Platform height vs the closed form at a driven pose.
const scene = await arm.solvedModel({ lift: 45 });
const top = scene.parts.find((p) => p.name === 'platform')!;
const z = top.worldTransform.decomposeToTranslateAndRotate().translate[2];
const expected = L * Math.sin(r(45));
if (Math.abs(z - expected) > 1e-4) throw new Error(`platform at z=${z}, closed form ${expected}`);

return scene;
