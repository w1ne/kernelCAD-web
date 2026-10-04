// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/usecase-robot-arm/solution-expert.kcad.ts
//
// Typical use case U7: simple 3-axis desktop robot arm. Rotating base (yaw),
// shoulder and elbow; links 120 mm and 100 mm; SG90-size servo pockets and
// servos; revolute joints with limits; exports URDF.
//
// Each side of a Y-axis joint owns a disjoint Y range (rotor bracket
// y -20..0, upper arm y 0..26, forearm y -20..0), so the links cannot collide
// at any swing angle. Every revolute mate has a servo (fastened to the parent
// link) and a mechanicalJoint declaration, so the arm holds its pose.

const baseW = 70, baseD = 70, baseH = 16;
const rotorTowerH = 20, rotorTowerR = 8;
const bracketW = 50, bracketD = 20, bracketH = 20;
const upperLen = 120;
const foreLen = 100;
const pocket = { x: 24, y: 13, z: 9 }; // SG90-size servo pocket (SG90 body ~23x12.2x29mm)
const servoW = 24, servoD = 13, servoH = 20;

const arm = assembly('desktop-3axis-arm');

let baseShape = box(baseW, baseD, baseH, true).translate(0, 0, baseH / 2);
const baseServoPocket = box(pocket.x, pocket.y, pocket.z, false)
  .translate(-10 - pocket.x, -pocket.y / 2, baseH - pocket.z);
baseShape = baseShape.subtract(baseServoPocket);
const base = arm.part('base', baseShape);
base.connector('yaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, baseH] }, axis: [0, 0, 1] });
base.connector('servo-mount', { type: 'frame', origin: { kind: 'vec3', value: [-22, 0, baseH] } });

const baseYawServo = arm.part('base-yaw-servo', box(servoW, servoD, servoH, true).color('actuator'));
baseYawServo.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, -servoH / 2] } });

// Bracket spans y[-20,0] -- touches the shoulder joint plane (y=0) exactly on
// its own side; tower kept slim (R=8) so it barely enters y>0.
let rotorShape = cylinder(rotorTowerH, rotorTowerR)
  .union(box(bracketW, bracketD, bracketH, false).translate(-bracketW, -bracketD, rotorTowerH));
const rotorServoPocket = box(pocket.x, pocket.y, pocket.z, false)
  .translate(-bracketW + 4, -bracketD + 3, rotorTowerH + bracketH - pocket.z);
rotorShape = rotorShape.subtract(rotorServoPocket);
const rotor = arm.part('rotor', rotorShape);
rotor.connector('yaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
rotor.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, rotorTowerH + bracketH] }, axis: [0, 1, 0] });
rotor.connector('servo-mount', { type: 'frame', origin: { kind: 'vec3', value: [-bracketW + 16, -bracketD + 10, rotorTowerH + bracketH] } });

const shoulderServo = arm.part('shoulder-servo', box(servoW, servoD, servoH, true).color('actuator'));
shoulderServo.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, -servoH / 2] } });

// Upper arm: both end-bosses share the same y half-width (13) so a single
// uniform +13 shift makes the WHOLE body span y[0,26] -- touching the
// shoulder joint plane (y=0) on the rotor side, and the elbow joint plane
// (also y=0, this part's OWN local frame) on the forearm side.
let upperShape = box(upperLen, 20, 16, true).translate(upperLen / 2, 0, 0)
  .union(box(20, 26, 26, false).translate(0, -13, -13))
  .union(box(26, 26, 22, false).translate(upperLen - 26, -13, -11));
upperShape = upperShape.translate(0, 13, 0); // -> y in [0,26]
const upperServoPocket = box(pocket.x, pocket.y, pocket.z, false)
  .translate(upperLen - 26 + 1, 13 - pocket.y / 2, 11 - pocket.z);
upperShape = upperShape.subtract(upperServoPocket);
const upperArm = arm.part('upper-arm', upperShape);
upperArm.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
upperArm.connector('elbow', { type: 'axis', origin: { kind: 'vec3', value: [upperLen, 0, 0] }, axis: [0, 1, 0] });
upperArm.connector('servo-mount', { type: 'frame', origin: { kind: 'vec3', value: [upperLen - 13, 13, 11] } });

const elbowServo = arm.part('elbow-servo', box(servoW, servoD, servoH, true).color('actuator'));
elbowServo.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, -servoH / 2] } });

// Forearm: near-elbow boss half-width is 10, so a uniform -10 shift makes it
// span y[-20,0] -- touching the SAME elbow joint plane from the other side.
let foreShape = box(foreLen, 16, 14, true).translate(foreLen / 2, 0, 0)
  .union(box(20, 20, 20, false).translate(0, -10, -10))
  .union(box(16, 16, 16, false).translate(foreLen - 16, -8, -8));
foreShape = foreShape.translate(0, -10, 0); // -> near-elbow boss in y[-20,0]
const forearm = arm.part('forearm', foreShape);
forearm.connector('elbow', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
forearm.connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [foreLen, -10, 0] } });

arm.mate('base-yaw', 'base.yaw', 'rotor.yaw', 'revolute', { limitsDeg: [-90, 90] });
arm.mate('shoulder', 'rotor.shoulder', 'upper-arm.shoulder', 'revolute', { limitsDeg: [-10, 20] });
arm.mate('elbow', 'upper-arm.elbow', 'forearm.elbow', 'revolute', { limitsDeg: [-100, 10] });

arm.mate('base-servo-mount', 'base.servo-mount', 'base-yaw-servo.mount', 'fastened');
arm.mate('shoulder-servo-mount', 'rotor.servo-mount', 'shoulder-servo.mount', 'fastened');
arm.mate('elbow-servo-mount', 'upper-arm.servo-mount', 'elbow-servo.mount', 'fastened');

arm.mechanicalJoint('base-yaw-drive', {
  mate: 'base-yaw', actuator: 'base-yaw-servo', shaft: 'base', supports: ['base'], output: 'rotor',
  requiredSupport: { kind: 'hinge-bracket', around: 'base.yaw', supports: ['base'], minBearingLengthMm: 16 },
});
arm.mechanicalJoint('shoulder-drive', {
  mate: 'shoulder', actuator: 'shoulder-servo', shaft: 'rotor', supports: ['rotor'], output: 'upper-arm',
  requiredSupport: { kind: 'hinge-bracket', around: 'rotor.shoulder', supports: ['rotor'], minBearingLengthMm: 20 },
});
arm.mechanicalJoint('elbow-drive', {
  mate: 'elbow', actuator: 'elbow-servo', shaft: 'upper-arm', supports: ['upper-arm'], output: 'forearm',
  requiredSupport: { kind: 'hinge-bracket', around: 'upper-arm.elbow', supports: ['upper-arm'], minBearingLengthMm: 16 },
});

return arm.solvedModel({}, { ignore: [['rotor', 'upper-arm'], ['upper-arm', 'forearm'], ['base', 'rotor']] });
