// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// expected: []
//
// Snippet 2 — checkReachable on a 6-DOF spherical-wrist arm.
//
// Builds a 6-DOF arm whose last three axes meet at one wrist center, and
// asks the IK for a target inside the workspace. The arm is articulated
// through mates, so `checkReachable` drives the mate-graph numeric (DLS)
// solver; the closed-form solver reads `arm.joint(...)` graphs only. The
// first call leaves the solver choice on 'auto', the second pins
// `preferSolver: 'numeric'`; both must converge on the target.
//
// The parts are seated: each pair of mated links shares a flat face square
// to the joint axis, and each connector origin lies on that face. A roll
// joint (yaw, wrist yaw, wrist roll) turns on an end face. A pitch joint
// laps the two links side by side, so the full pitch travel is clear.

const SHOULDER_Z = 100; // shoulder pitch axis height
const BASE_H = 80; // pedestal top = turret underside
const L1 = 200; // shoulder pitch axis -> elbow axis
const L2 = 150; // elbow axis -> wrist center
const LINK = 25; // link section
const HALF = LINK / 2;
const WRIST = 20; // wrist section
const WRIST_HALF = WRIST / 2;
const WRIST_SEAT = 45; // forearm end face -> wrist center
const FLANGE_X = 35; // wrist center -> tool flange face

const arm = assembly('cookbook-reachable-seed');

// Pedestal. It is 1 mm narrower in Y than the turret, so the upper arm,
// which runs beside the turret, passes it at the pitch limit.
const base = arm.part('base', box(30, LINK - 1, BASE_H, true).translate(0, 0, BASE_H / 2));

// Turret: sits on the pedestal; the pitch axis runs through its centre.
const link1 = arm.part('link1', box(LINK, LINK, 2 * (SHOULDER_Z - BASE_H), true));

// Upper arm: beside the turret (+Y), from the shoulder to the elbow.
const link2 = arm.part('link2', box(L1 + LINK, LINK, LINK, true).translate(L1 / 2, LINK, 0));

// Forearm: back on the centre line, beside the upper arm at the elbow. It
// stops WRIST_SEAT short of the wrist center.
const FOREARM_END = L2 - WRIST_SEAT;
const link3 = arm.part(
  'link3',
  box(FOREARM_END + HALF, LINK, LINK, true).translate((FOREARM_END - HALF) / 2, 0, 0),
);

// Wrist housing: turns on the forearm end face and reaches 10 mm past the
// wrist center.
const link4 = arm.part(
  'link4',
  box(WRIST_SEAT + WRIST_HALF, WRIST, WRIST, true).translate((WRIST_SEAT + WRIST_HALF) / 2, 0, 0),
);

// Wrist yoke (frame origin = wrist center): a cheek beside the housing and
// a flange plate across the roll axis.
const link5 = arm.part(
  'link5',
  box(FLANGE_X + WRIST_HALF, 15, WRIST, true)
    .translate((FLANGE_X - WRIST_HALF) / 2, WRIST_HALF + 7.5, 0)
    .union(box(10, WRIST + 15, WRIST, true).translate(FLANGE_X - 5, 7.5, 0)),
);

// Tool: turns on the flange face. Its frame origin is the tracked tip point.
const tip = arm.part('tip', box(15, 15, 15, true).translate(7.5, 0, 0));

base.connector('shoulderYawAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, BASE_H] }, axis: [0, 0, 1] });
link1.connector('shoulderYawAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, BASE_H - SHOULDER_Z] }, axis: [0, 0, 1] });
arm.mate('shoulderYaw', 'base.shoulderYawAxis', 'link1.shoulderYawAxis', 'revolute', { limitsDeg: [-180, 180] });

link1.connector('shoulderPitchAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, HALF, 0] }, axis: [0, 1, 0] });
link2.connector('shoulderPitchAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, HALF, 0] }, axis: [0, 1, 0] });
arm.mate('shoulderPitch', 'link1.shoulderPitchAxis', 'link2.shoulderPitchAxis', 'revolute', { limitsDeg: [-120, 120] });

link2.connector('elbowPitchAxis', { type: 'axis', origin: { kind: 'vec3', value: [L1, HALF, 0] }, axis: [0, 1, 0] });
link3.connector('elbowPitchAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, HALF, 0] }, axis: [0, 1, 0] });
arm.mate('elbowPitch', 'link2.elbowPitchAxis', 'link3.elbowPitchAxis', 'revolute', { limitsDeg: [-150, 150] });

link3.connector('wristYawAxis', { type: 'axis', origin: { kind: 'vec3', value: [FOREARM_END, 0, 0] }, axis: [1, 0, 0] });
link4.connector('wristYawAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] });
arm.mate('wristYaw', 'link3.wristYawAxis', 'link4.wristYawAxis', 'revolute', { limitsDeg: [-180, 180] });

link4.connector('wristPitchAxis', { type: 'axis', origin: { kind: 'vec3', value: [WRIST_SEAT, WRIST_HALF, 0] }, axis: [0, 1, 0] });
link5.connector('wristPitchAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, WRIST_HALF, 0] }, axis: [0, 1, 0] });
arm.mate('wristPitch', 'link4.wristPitchAxis', 'link5.wristPitchAxis', 'revolute', { limitsDeg: [-120, 120] });

link5.connector('wristRollAxis', { type: 'axis', origin: { kind: 'vec3', value: [FLANGE_X, 0, 0] }, axis: [1, 0, 0] });
tip.connector('wristRollAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] });
arm.mate('wristRoll', 'link5.wristRollAxis', 'tip.wristRollAxis', 'revolute', { limitsDeg: [-180, 180] });

// Target lives inside the workspace (reach from the shoulder is
// L1 + L2 + FLANGE_X = 385 mm; the target is 287 mm away).
const reachableTarget = [250, 100, 200] as const;

// Seed pose hints the solver toward a nearby branch. Values are DEGREES
// (kernelCAD's joint-angle convention everywhere) — a 17° / 11° / -11°
// hint, not radians. Use 0 for "no preference."
const seed = {
  shoulderYaw: 17, shoulderPitch: 11, elbowPitch: -11,
  wristYaw: 0, wristPitch: 0, wristRoll: 0,
};

const r1 = await kinematic.checkReachable(arm, {
  tipLink: 'tip',
  target: { position: [reachableTarget[0], reachableTarget[1], reachableTarget[2]] },
  seed,
});
if (r1.source !== 'local') throw new Error('auto: source !== local');
if (!r1.ok) throw new Error('auto: expected reachable target to succeed');
if (!r1.pose) throw new Error('auto: pose missing on success');

const r2 = await kinematic.checkReachable(arm, {
  tipLink: 'tip',
  target: { position: [reachableTarget[0], reachableTarget[1], reachableTarget[2]] },
  preferSolver: 'numeric',
  seed,
});
if (!r2.ok) throw new Error('numeric: expected reachable target to succeed');
if (!r2.pose) throw new Error('numeric: pose missing on success');

return arm.solvedModel({
  shoulderYaw: 0, shoulderPitch: 0, elbowPitch: 0,
  wristYaw: 0, wristPitch: 0, wristRoll: 0,
});
