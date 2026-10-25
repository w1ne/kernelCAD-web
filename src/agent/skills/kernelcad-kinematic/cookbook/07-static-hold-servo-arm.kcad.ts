// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// expected: ['assembly.joint.static-hold.exceeded']
//
// Snippet 7 — checkStaticHold on a servo-driven shoulder joint, plus the S5
// motion -> FEA hand-off (no hand-typed load).
//
// A 300x20x10 mm steel beam hinged to a wall bracket by a revolute mate,
// standing in for a 2-link arm's shoulder. First runs with a generous actuator
// torque (10x the analytic requirement) — clean pass. Then re-runs with an
// undersized actuator (half the requirement) — assembly.joint.static-hold.exceeded
// fires because the declared servo torque cannot hold the arm horizontal.
//
// The third assembly does the S5 step: motionLoad samples the shoulder range,
// picks the worst pose (horizontal, where the gravity moment is greatest), and
// feaStudy takes that joint reaction as a remote wrench on the bracket. The
// safety factor is solved from the motion result; no force is typed into the
// study. If CalculiX + gmsh are absent the gate reports
// fea.safety-factor.unverified (an in-process estimate), never a silent pass.

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

// ---- S5: motion_load -> feaStudy at the worst pose ---------------------
const motionArm = assembly('cookbook-servo-arm-fea');
const bracketShape = box(40, 40, 40, true).translate(-20, 0, 0);
const bracket = motionArm.part('bracket', bracketShape, { material: 'steel' });
const link = motionArm.part(
  'link',
  box(LENGTH_MM, WIDTH_MM, HEIGHT_MM, true).translate(LENGTH_MM / 2, 0, 0),
  { density: STEEL_DENSITY, crossSection: { kind: 'rectangle', widthMm: WIDTH_MM, heightMm: HEIGHT_MM, lengthMm: LENGTH_MM } },
);
const pivot = {
  type: 'axis' as const,
  origin: { kind: 'vec3' as const, value: [0, 0, 0] as [number, number, number] },
  axis: [0, 1, 0] as [number, number, number],
};
bracket.connector('pivot', pivot);
link.connector('pivot', pivot);
motionArm.mate('shoulder', 'bracket.pivot', 'link.pivot', 'revolute', { limitsDeg: [-90, 90] });
motionArm.mechanicalJoint('shoulder-drive', {
  mate: 'shoulder',
  actuator: 'bracket',
  shaft: 'link',
  supports: ['bracket'],
  output: 'link',
});
motionArm.physicalUseCase('bench', { stableParts: ['bracket'] });

const motion = await kinematic.motionLoad(motionArm, { mode: 'range', rangeSamples: 5 });
const worst = motion.partLoads.find((p) => p.part === 'bracket');
if (worst === undefined) throw new Error('motion-load produced no bracket load');
if (Math.abs(worst.pose.shoulder) > 1e-6) {
  throw new Error(`motion-load worst pose ${worst.pose.shoulder}° is not the expected horizontal 0°`);
}

bracketShape.feaStudy({
  name: 'servo-bracket',
  material: 'mild-steel',
  fixed: { atX: -40 },
  loadsFrom: { motion, part: 'bracket' },
  minSafetyFactor: 1.5,
  meshSize: 5,
});

console.log(
  `[cookbook] worst pose shoulder=${worst.pose.shoulder}°, ` +
    `F=${worst.forceN.map((v) => v.toFixed(2)).join('/')} N, ` +
    `M=${worst.momentNmm.map((v) => v.toFixed(0)).join('/')} N·mm ` +
    `(proxy ${worst.proxy.kind} ${worst.proxy.value.toFixed(2)} ${worst.proxy.unit})`,
);

return servoOk.solvedModel({ shoulder: 0 }, { ignore: [['wall', 'beam']] });
