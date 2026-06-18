// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Reachable eval — 6-DOF spherical-wrist arm. The analytical IK path solves
// a reachable target; the numeric DLS path on an out-of-reach 5000 mm target
// produces K3 (kinematic.unreachable). Both branches are asserted in-script
// so a clean evaluate <=> both checks held.

const baseH = 100;
const L1 = 200;
const L2 = 150;

const arm = assembly('kinematic-reachable-eval');

const base = arm.part('base', box(30, 30, baseH, true).translate(0, 0, baseH / 2));
const link1 = arm.part('link1', box(25, 25, 25, true).translate(0, 0, 20));
const link2 = arm.part('link2', box(L1 - 30, 25, 25, true).translate(L1 / 2 + 15, 0, 0));
const link3 = arm.part('link3', box(L2 - 30, 25, 25, true).translate(L2 / 2 + 15, 0, 0));
const link4 = arm.part('link4', box(20, 20, 20, true).translate(15, 0, 0));
const link5 = arm.part('link5', box(20, 20, 20, true).translate(0, 25, 0));
const tip = arm.part('tip', box(15, 15, 15, true).translate(0, 0, 25));

arm.revolute('shoulderYaw', base, link1, {
  axis: [0, 0, 1], origin: [0, 0, baseH], limitsDeg: [-180, 180],
});
arm.revolute('shoulderPitch', link1, link2, {
  axis: [0, 1, 0], origin: [0, 0, 0], limitsDeg: [-120, 120],
});
arm.revolute('elbowPitch', link2, link3, {
  axis: [0, 1, 0], origin: [L1, 0, 0], limitsDeg: [-150, 150],
});
arm.revolute('wristYaw', link3, link4, {
  axis: [1, 0, 0], origin: [L2, 0, 0], limitsDeg: [-180, 180],
});
arm.revolute('wristPitch', link4, link5, {
  axis: [0, 1, 0], origin: [0, 0, 0], limitsDeg: [-120, 120],
});
arm.revolute('wristRoll', link5, tip, {
  axis: [1, 0, 0], origin: [0, 0, 0], limitsDeg: [-180, 180],
});

// ---- Reachable target ----
const r1 = await kinematic.checkReachable(arm, {
  tipLink: 'tip',
  target: { position: [250, 100, 200] },
});
if (r1.source !== 'local') throw new Error('reachable: source must be local');
if (!r1.ok) {
  const codes = r1.diagnostics.map((d) => d.code).join(', ') || '(none)';
  throw new Error(`reachable: expected ok=true; codes=${codes}`);
}
if (!r1.pose) throw new Error('reachable: pose missing on success');

// ---- Unreachable target — force the numeric path ----
const r2 = await kinematic.checkReachable(arm, {
  tipLink: 'tip',
  target: { position: [5000, 0, 0] },
  preferSolver: 'numeric',
});
if (r2.ok) throw new Error('unreachable: expected ok=false on far target');
const k3 = r2.diagnostics.some((d) => d.code === 'kinematic.unreachable');
if (!k3) {
  const codes = r2.diagnostics.map((d) => d.code).join(', ') || '(none)';
  throw new Error(`unreachable: expected K3 kinematic.unreachable; codes=${codes}`);
}

return arm.solvedModel({
  shoulderYaw: 0, shoulderPitch: 0, elbowPitch: 0,
  wristYaw: 0, wristPitch: 0, wristRoll: 0,
});
