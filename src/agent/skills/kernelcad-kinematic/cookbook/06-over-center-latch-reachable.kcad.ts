// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// expected: []
//
// Snippet 6 — over-center draw latch as a real closed loop (slider-crank):
// a handle pivots on the housing, a link joins the handle tip to a keeper
// that slides along the housing. Handle 30 mm, link 100 mm, keeper line
// offset 10 mm. The latch is modeled closed (handle at −20°), past its
// over-center point, which is what holds it shut.
//
//   1. checkReachable drives only the handle (the loop's independent joint)
//      to move the keeper to a target; the reached handle angle is checked
//      against the closed-form slider position.
//   2. loopMode pins the handle–link elbow to the latched side. Opening the
//      handle carries the elbow straight and over: checkSweptCollision stops
//      there with kinematic.loop.branch-flip — the over-center point, a
//      design finding. It must sit at asin(e / (r + l)) = 4.41°.

const r = 30;   // handle (crank)
const l = 100;  // link (rod)
const e = 10;   // keeper line offset
const handle0 = -20;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (v: number) => (v * 180) / Math.PI;
// Closed-form keeper position along its slide for a handle angle (deg).
const keeperX = (t: number) => r * Math.cos(rad(t)) + Math.sqrt(l * l - (r * Math.sin(rad(t)) - e) ** 2);

const arm = assembly('cookbook-over-center-latch');
const Y: [number, number, number] = [0, -1, 0]; // +angle turns +X toward +Z
const pin = (x: number) => ({ type: 'axis' as const, origin: { kind: 'vec3' as const, value: [x, 0, 0] as [number, number, number] }, axis: Y });

// A pin along Y at (x, z), spanning y0..y1 in the gap between two layers.
const pinY = (x: number, z: number, y0: number, y1: number) =>
  cylinder(y1 - y0, 3).rotateX(-90).translate(x, y0, z);

const housing = arm.part(
  'housing',
  box(160, 20, 6, true).translate(70, 0, -30)
    .union(box(8, 6, 27, true).translate(0, 0, -13.5))
    .union(pinY(0, 0, 3, 6.8)),
);
const handleBar = arm.part('handle', box(r, 6, 6, true).translate(r / 2, 10, 0).union(pinY(r, 0, 13, 16.8)));
const link = arm.part('link', box(l, 6, 6, true).translate(l / 2, 20, 0).union(pinY(l, 0, 23, 26.8)));
const keeper = arm.part('keeper', box(20, 6, 12, true).translate(0, 30, 0));

housing.connector('pivot', pin(0));
housing.connector('track', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, e] }, axis: [1, 0, 0] });
handleBar.connector('pivot', pin(0));
handleBar.connector('tip', pin(r));
link.connector('base', pin(0));
link.connector('tip', pin(l));
keeper.connector('track', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] });
keeper.connector('pin', pin(0));

// As-built (latched) pose: handle at −20°, link aimed at the keeper.
const B0 = [r * Math.cos(rad(handle0)), r * Math.sin(rad(handle0))];
const linkAbs0 = deg(Math.atan2(e - B0[1], keeperX(handle0) - B0[0]));
arm.mate('handle', 'housing.pivot', 'handle.pivot', 'revolute', { pose: handle0, limitsDeg: [-60, 130] });
arm.mate('slide', 'housing.track', 'keeper.track', 'prismatic', { pose: keeperX(handle0), limitsMm: [60, 140] });
arm.mate('link', 'handle.tip', 'link.base', 'revolute', { pose: linkAbs0 - handle0, limitsDeg: [-180, 180] });
arm.mate('latch', 'link.tip', 'keeper.pin', 'revolute', { limitsDeg: [-180, 180] });

// 1. Reach: draw the keeper in to where handle = −45° puts it (on the
//    latched side, so the IK does not have to cross over center).
const targetX = keeperX(-45);
const reach = await kinematic.checkReachable(arm, { tipLink: 'keeper', target: { position: [targetX, 0, e] }, preferSolver: 'numeric' });
if (!reach.ok || !reach.pose) throw new Error(`reach: expected ok; codes=${reach.diagnostics.map((d) => d.code).join(',')}`);
const reachedHandle = reach.pose.handle;
if (typeof reachedHandle !== 'number') throw new Error('reach: the IK should drive the handle');
if (Math.abs(keeperX(reachedHandle) - targetX) > 0.5) throw new Error(`reach: handle ${reachedHandle}° puts the keeper at ${keeperX(reachedHandle)}, not ${targetX}`);
const far = await kinematic.checkReachable(arm, { tipLink: 'keeper', target: { position: [200, 0, e] } });
if (far.ok || !far.diagnostics.some((d) => d.code === 'kinematic.unreachable')) throw new Error('far: expected kinematic.unreachable');

// 2. Pin the latched side of the handle–link elbow, then open the handle.
//    Elbow sign: turn from the handle to the link about the handle axis.
const u = B0;
const w = [keeperX(handle0) - B0[0], e - B0[1]];
const latchedSide = u[0] * w[1] - u[1] * w[0] > 0 ? '+' : '-';
arm.loopMode('latch', { joint: 'link', sign: latchedSide });
const STEP = 2;
const open = await kinematic.checkSweptCollision(arm, { joint: 'handle', range: [handle0, 120, STEP] });
const flip = open.diagnostics.find((d) => d.code === 'kinematic.loop.branch-flip');
if (!flip || !flip.poseContext) throw new Error(`expected the over-center branch flip; codes=${open.diagnostics.map((d) => d.code).join(',')}`);
const overCenter = deg(Math.asin(e / (r + l)));
const flipAt = flip.poseContext.handle;
if (!(flipAt > overCenter && flipAt - STEP <= overCenter)) throw new Error(`over-center at handle=${flipAt}°, closed form ${overCenter.toFixed(2)}°`);
if (open.collidingPoses.length !== 0) throw new Error('the latch should not collide before it goes over center');
console.log(`[latch] over-center between handle=${flipAt - STEP}° and ${flipAt}° (closed form ${overCenter.toFixed(2)}°): ${flip.message}`);

return arm.solvedModel({ handle: handle0 });
