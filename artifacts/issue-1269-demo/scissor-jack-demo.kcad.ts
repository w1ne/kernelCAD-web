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
const liftInput = param('lift', lift0, { min: 15, max: 60, description: 'Lift angle in degrees' });
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
    .union(box(16, 6, 4.2, true).translate(0, 3, -2.1))
    .color('#334155'),
);
// Link frames all lie on the y=0 pin plane. Adjacent parts occupy opposite
// half-spaces, leaving a shared face at each pin instead of a 12 mm axial gap.
const linkA = arm.part('linkA', box(L, 6, 8, true).translate(L / 2, -3, 0).color('#168da5'));
const linkB = arm.part('linkB', box(L, 6, 8, true).translate(L / 2, 3, 0).color('#e28a36'));
// The foot slider bridges the link pin plane and the lower base track.
const footSlider = arm.part('footSlider', box(16, 6, 10, true).translate(0, -3, -5).color('#6574cd'));
// A post carries the top pin and track frame; the raised rail clears the
// scissor links and gives the head slider a bearing face over its travel.
const platform = arm.part(
  'platform',
  box(16, 6, 8, true).translate(0, -3, 4)
    .union(box(160, 6, 6.2, true).translate(60, -3, 11))
    .color('#3d5368'),
);
const headSlider = arm.part('headSlider', box(16, 6, 8, true).translate(0, 3, 4).color('#cf5a46'));

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
arm.mate('lift', 'base.pivot', 'linkA.foot', 'revolute', { pose: liftInput, limitsDeg: liftRange });
arm.mate('footSlide', 'base.track', 'footSlider.track', 'prismatic', { pose: L * Math.cos(r(lift0)), limitsMm: sliderRange });
arm.mate('center', 'linkA.mid', 'linkB.mid', 'revolute', { pose: 180 - 2 * lift0, limitsDeg: [180 - 2 * liftRange[1], 180 - 2 * liftRange[0]] });
arm.mate('footPin', 'linkB.foot', 'footSlider.pin', 'revolute', { pose: lift0 - 180, limitsDeg: [liftRange[0] - 180, liftRange[1] - 180] });
arm.mate('headPin', 'linkA.head', 'headSlider.pin', 'revolute', { pose: -lift0, limitsDeg: [-liftRange[1], -liftRange[0]] });
arm.mate('topPin', 'linkB.head', 'platform.pivot', 'revolute', { pose: lift0 - 180, limitsDeg: [liftRange[0] - 180, liftRange[1] - 180] });
arm.mate('headSlide', 'platform.track', 'headSlider.track', 'prismatic', { pose: L * Math.cos(r(lift0)), limitsMm: sliderRange });

// This capture wrapper animates the same solved mechanism. The repository
// integration test runs the source cookbook's full 46-pose collision sweep.
animationView({ name: 'scissor jack lift', param: 'lift', from: 15, to: 60, durationMs: 2000, fps: 24 });
return arm.solvedModel({ lift: liftInput });
