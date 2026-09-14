// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// expected: ['assembly.joint.static-hold.exceeded']
//
// Snippet 7 — checkStaticHold on a servo-driven shoulder joint.
//
// A 300x20x10 mm steel beam hinged to a wall by a revolute joint, standing
// in for a 2-link arm's shoulder. First runs with a generous actuator
// torque (10x the analytic requirement) — clean pass. Then re-runs with an
// undersized actuator (half the requirement) — assembly.joint.static-hold.exceeded
// fires because the declared servo torque cannot hold the arm horizontal.

const LENGTH_MM = 300;
const WIDTH_MM = 20;
const HEIGHT_MM = 10;
const STEEL_DENSITY = 7850;
const G = 9.81;

// tau = m*g*L/2 at the horizontal pose.
const volumeM3 = (LENGTH_MM * WIDTH_MM * HEIGHT_MM) * 1e-9;
const expectedTauNm = STEEL_DENSITY * volumeM3 * G * (LENGTH_MM / 2) * 1e-3;

function buildArm(actuatorTorqueNm: number, name: string) {
  const arm = assembly(name);
  const wall = arm.part('wall', box(40, 40, 40, true));
  const beam = arm.part(
    'beam',
    box(LENGTH_MM, WIDTH_MM, HEIGHT_MM, true).translate(LENGTH_MM / 2, 0, 0),
    { density: STEEL_DENSITY },
  );
  arm.revolute('shoulder', wall, beam, {
    axis: [0, 1, 0],
    origin: [0, 0, 0],
    limitsDeg: [-90, 90],
    actuator: { torqueNm: actuatorTorqueNm },
  });
  return arm;
}

const servoOk = buildArm(expectedTauNm * 10, 'cookbook-static-hold-ok');
const okResult = await kinematic.checkStaticHold(servoOk, { pose: { shoulder: 0 } });
if (okResult.source !== 'local') throw new Error('okResult: source !== local');
if (!okResult.ok) throw new Error('okResult: expected ok=true with a generous actuator');

const servoUndersized = buildArm(expectedTauNm * 0.5, 'cookbook-static-hold-exceeded');
const exceededResult = await kinematic.checkStaticHold(servoUndersized, { pose: { shoulder: 0 } });
if (exceededResult.ok) throw new Error('exceededResult: expected ok=false');
const exceeded = exceededResult.diagnostics.some(
  (d) => d.code === 'assembly.joint.static-hold.exceeded',
);
if (!exceeded) throw new Error('expected assembly.joint.static-hold.exceeded');

return servoOk.solvedModel({ shoulder: 0 }, { ignore: [['wall', 'beam']] });
