---
id: 4dof-release-evidence-pack
title: 4-DOF open-chain arm release pack — materials, reach animation, static hold
tags: [assembly, connector, mate, revolute, joint, kinematic, parameter, actuator, material, static-hold, torque, bom, export, fea]
keywords:
  - four DOF release evidence pack
  - 4 DOF arm release package
  - open-chain reach cycle animationView
  - param baseYawDeg shoulderDeg elbowDeg wristDeg
  - kinematic checkStaticHold actuator torque
  - BOM drawing USD evidence checklist
  - FEA unverified CalculiX stop
  - usd-isaac explicit drives only
  - no joint.scissorLift closed-loop
  - bridged yoke production arm materials
when_to_use: >-
  Prompt asks to turn a production 4-DOF open-chain arm (base yaw, shoulder,
  elbow, wrist, bridged yokes, named materials) into a release/evidence
  package with an animationView reach cycle and declared actuator capacities.
  This script evaluates standalone: param() sits beside animationView, and
  kinematic.checkStaticHold runs against body-tree revolutes (mates are not
  in that joint list). Prefer design_loop until evaluate_script reports
  mechanism=real. Follow-up MCP, not more geometry: inspect/export BOM,
  exploded PDF/SVG drawing, and usd-isaac with explicit drives on
  fastened/revolute mates only. run_fea only when CalculiX and gmsh are
  present — otherwise report FEA UNVERIFIED. No joint.scissorLift and no
  closed-loop FK.
---

Runnable 4-DOF core plus the evidence checklist. The script does not call
`run_fea` or `export`, so a missing solver cannot paint a fake safety
factor onto evaluate. USD Isaac lowers fastened, revolute, and prismatic
mates only; this graph stays on those types. Cylindrical, pin-slot, and
ball mates are a stop (`export.usd.joint-unsupported`).

```typescript
// 4-DOF open-chain release pack. KEEP param() beside animationView — tracks
// must name those live params (animation.param.unknown if you drop them).
// No joint.scissorLift, no closed-loop FK, no Ferrari styling.
// checkStaticHold reads arm.revolute actuators, NOT mates. solvedModel must
// receive those joint poses; mates still drive the mechanism geometry.
//
// Follow-up AFTER evaluate_script ok + mechanism=real (do not fake results):
// 1. inspect({ of: 'bom' }) or export bom-csv|bom-json. Materials are set;
//    mass is null only if a row is still bom.material.unassigned.
// 2. Export pdf-drawing / svg-drawing with exploded isometric, balloons,
//    parts list, auto dimensions, datums/GD&T, title block. Auto-GD&T is
//    generated annotation, not a certification.
// 3. export({ target: 'model', format: 'usd-isaac', output_path,
//    options: { drives: { 'base-yaw': { stiffness, damping }, ... } } }).
//    Drives are only the gains you declare. Positive mass required.
//    Stop if a mate is cylindrical / pin_slot / ball / planar.
// 4. FEA: fea_summary({}). If CalculiX+gmsh are absent, report UNVERIFIED.
//    If present, feaStudy on a critical base/bracket solid then
//    run_fea({ file, output_dir }) and trust summary.trust before citing
//    a safety factor. Do not treat a missing solver as a pass.
// 5. open_in_studio and capture_animation({ file }) with pose verification.

const baseYawDeg = param('baseYawDeg', 20, { min: -90, max: 90 });
const shoulderDeg = param('shoulderDeg', 25, { min: -15, max: 55 });
const elbowDeg = param('elbowDeg', -40, { min: -85, max: 70 });
const wristDeg = param('wristDeg', 15, { min: -90, max: 90 });
animationView({
  name: 'reach cycle',
  tracks: [
    { param: 'baseYawDeg', keys: [{ atMs: 0, value: -30 }, { atMs: 1200, value: 40, ease: 'easeInOut' }, { atMs: 2400, value: -30, ease: 'easeInOut' }] },
    { param: 'shoulderDeg', keys: [{ atMs: 0, value: 15 }, { atMs: 1200, value: 45, ease: 'easeInOut' }, { atMs: 2400, value: 15, ease: 'easeInOut' }] },
    { param: 'elbowDeg', keys: [{ atMs: 0, value: -30 }, { atMs: 1200, value: -60, ease: 'easeInOut' }, { atMs: 2400, value: -30, ease: 'easeInOut' }] },
    { param: 'wristDeg', keys: [{ atMs: 0, value: 0 }, { atMs: 1200, value: 35, ease: 'easeInOut' }, { atMs: 2400, value: 0, ease: 'easeInOut' }] },
  ],
  fps: 24,
});

const shoulderZ = 78;
const upperLen = 115;
const foreLen = 95;
const wristLen = 48;

const arm = assembly('multi-dof-4axis-release');

function roundPlate(w: number, d: number, r: number, t: number, x: number, y: number, z: number) {
  return extrudeRoundedRect(w, d, r, t).translate(x, y, z);
}
function servoBody(w: number, d: number, h: number) {
  const earT = Math.min(5, d * 0.4);
  return extrudeRoundedRect(w, d, Math.min(3, d * 0.2), h).translate(0, 0, -h / 2)
    .union(extrudeRoundedRect(w + 10, earT, 1.4, 2.6).translate(0, 0, h / 2 - 2.6))
    .union(cylinder(3.2, Math.min(5, d * 0.3)).translate(0, -d / 2 + 1, 0));
}
function linkTube(len: number, r: number, x0: number) {
  return cylinder(len, r).rotate([0, 1, 0], 90).translate(x0, 0, 0);
}
function clevis(x: number) {
  return roundPlate(24, 7, 2, 28, x, 15, -14)
    .union(roundPlate(24, 7, 2, 28, x, -15, -14))
    .union(roundPlate(14, 32, 2, 7, x, 0, -3.5));
}

const base = arm.part(
  'base-frame',
  roundPlate(136, 108, 14, 8, 0, 0, 0)
    .union(cylinder(36, 18).translate(0, 0, 6))
    .union(cylinder(4, 26).translate(0, 0, 41))
    .union(cylinder(5.5, 16).translate(0, 0, 44.2))
    .union(cylinder(1.6, 9).translate(0, 0, 49))
    .union(servoBody(36, 28, 24).translate(-50, 0, 20))
    .finish('steel'),
  { material: 'mild-steel' },
);
base.connector('yaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 50] }, axis: [0, 0, 1] });

const turret = arm.part(
  'yaw-turret',
  cylinder(36, 15).translate(0, 0, -1)
    .union(roundPlate(18, 56, 3, 8, 0, 0, 24))
    .union(roundPlate(22, 7, 2, 34, 0, 22, 11))
    .union(roundPlate(22, 7, 2, 34, 0, -22, 11))
    .union(roundPlate(12, 8, 2, 42, 0, 22, 4))
    .union(roundPlate(12, 8, 2, 42, 0, -22, 4))
    .union(roundPlate(30, 20, 3, 8, -28, 40, 22))
    .finish('anodized', { color: '#8aa0ad' }),
  { material: 'aluminum-6061' },
);
turret.connector('yaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
turret.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, shoulderZ - 50] }, axis: [0, 1, 0] });
turret.connector('shoulder-servo-mount', { type: 'frame', origin: { kind: 'vec3', value: [-32, 40, shoulderZ - 50] } });

const shoulderServo = arm.part(
  'shoulder-servo',
  servoBody(28, 18, 30).translate(-32, 40, shoulderZ - 50).finish('abs', { color: '#243140' }),
  { material: 'nylon' },
);
shoulderServo.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [-32, 40, shoulderZ - 50] } });

const upper = arm.part(
  'upper-link',
  linkTube(upperLen - 18, 6.2, 8)
    .union(cylinder(96, 4.4).rotate([1, 0, 0], 90).translate(0, 48, 0))
    .union(cylinder(8, 8).rotate([1, 0, 0], 90).translate(0, 16, 0))
    .union(cylinder(8, 8).rotate([1, 0, 0], 90).translate(0, -8, 0))
    .union(clevis(upperLen - 6))
    .union(roundPlate(26, 16, 2, 8, upperLen - 22, 32, -4))
    .finish('anodized', { color: '#d5dde3' }),
  { material: 'aluminum-6061' },
);
upper.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
upper.connector('elbow', { type: 'axis', origin: { kind: 'vec3', value: [upperLen, 0, 0] }, axis: [0, 1, 0] });
upper.connector('elbow-servo-mount', { type: 'frame', origin: { kind: 'vec3', value: [upperLen - 20, 34, 0] } });

const elbowServo = arm.part(
  'elbow-servo',
  servoBody(26, 16, 26).translate(upperLen - 20, 34, 0).finish('abs', { color: '#243140' }),
  { material: 'nylon' },
);
elbowServo.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [upperLen - 20, 34, 0] } });

const forearm = arm.part(
  'forearm-link',
  linkTube(foreLen - 16, 5.4, 6)
    .union(cylinder(36, 5).rotate([1, 0, 0], 90).translate(0, 18, 0))
    .union(clevis(foreLen - 4))
    .union(roundPlate(22, 14, 2, 7, foreLen - 18, 28, -3.5))
    .finish('anodized', { color: '#c5d0d8' }),
  { material: 'aluminum-6061' },
);
forearm.connector('elbow', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
forearm.connector('wrist', { type: 'axis', origin: { kind: 'vec3', value: [foreLen, 0, 0] }, axis: [0, 1, 0] });
forearm.connector('wrist-servo-mount', { type: 'frame', origin: { kind: 'vec3', value: [foreLen - 16, 30, 0] } });

const wristServo = arm.part(
  'wrist-servo',
  servoBody(22, 14, 22).translate(foreLen - 16, 30, 0).finish('abs', { color: '#243140' }),
  { material: 'nylon' },
);
wristServo.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [foreLen - 16, 30, 0] } });

const wrist = arm.part(
  'wrist-link',
  linkTube(wristLen - 6, 5, 4)
    .union(cylinder(28, 5).rotate([1, 0, 0], 90).translate(0, 14, 0))
    .union(cylinder(16, 8).rotate([0, 1, 0], 90).translate(wristLen - 4, 0, -3))
    .union(cylinder(3, 10.5).rotate([0, 1, 0], 90).translate(wristLen + 4, 0, -3))
    .finish('anodized', { color: '#b7c3cc' }),
  { material: 'aluminum-6061' },
);
wrist.connector('proximal', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });

arm.mate('base-yaw', 'base-frame.yaw', 'yaw-turret.yaw', 'revolute', { pose: baseYawDeg, limitsDeg: [-90, 90] });
arm.mate('shoulder-pitch', 'yaw-turret.shoulder', 'upper-link.shoulder', 'revolute', { pose: shoulderDeg, limitsDeg: [-15, 55] });
arm.mate('elbow-pitch', 'upper-link.elbow', 'forearm-link.elbow', 'revolute', { pose: elbowDeg, limitsDeg: [-85, 70] });
arm.mate('wrist-pitch', 'forearm-link.wrist', 'wrist-link.proximal', 'revolute', { pose: wristDeg, limitsDeg: [-90, 90] });
arm.mate('shoulder-servo-fix', 'yaw-turret.shoulder-servo-mount', 'shoulder-servo.mount', 'fastened');
arm.mate('elbow-servo-fix', 'upper-link.elbow-servo-mount', 'elbow-servo.mount', 'fastened');
arm.mate('wrist-servo-fix', 'forearm-link.wrist-servo-mount', 'wrist-servo.mount', 'fastened');

arm.mechanicalJoint('yaw-drive', {
  mate: 'base-yaw', actuator: 'base-frame', shaft: 'base-frame', supports: ['base-frame'], output: 'yaw-turret',
  requiredSupport: { kind: 'bearing', around: 'base-frame.yaw', supports: ['base-frame'], minBearingLengthMm: 20 },
});
arm.mechanicalJoint('shoulder-drive', {
  mate: 'shoulder-pitch', actuator: 'shoulder-servo', shaft: 'yaw-turret', supports: ['yaw-turret'], output: 'upper-link',
  requiredSupport: { kind: 'hinge-bracket', around: 'yaw-turret.shoulder', supports: ['yaw-turret'], minBearingLengthMm: 28 },
});
arm.mechanicalJoint('elbow-drive', {
  mate: 'elbow-pitch', actuator: 'elbow-servo', shaft: 'upper-link', supports: ['upper-link'], output: 'forearm-link',
  requiredSupport: { kind: 'hinge-bracket', around: 'upper-link.elbow', supports: ['upper-link'], minBearingLengthMm: 24 },
});
arm.mechanicalJoint('wrist-drive', {
  mate: 'wrist-pitch', actuator: 'wrist-servo', shaft: 'forearm-link', supports: ['forearm-link'], output: 'wrist-link',
  requiredSupport: { kind: 'hinge-bracket', around: 'forearm-link.wrist', supports: ['forearm-link'], minBearingLengthMm: 20 },
});

arm.revolute('yaw-hold', base, turret, { axis: [0, 0, 1], origin: [0, 0, 50], limitsDeg: [-90, 90], actuator: { torqueNm: 25 } });
arm.revolute('shoulder-hold', turret, upper, { axis: [0, 1, 0], origin: [0, 0, shoulderZ - 50], limitsDeg: [-15, 55], actuator: { torqueNm: 45 } });
arm.revolute('elbow-hold', upper, forearm, { axis: [0, 1, 0], origin: [upperLen, 0, 0], limitsDeg: [-85, 70], actuator: { torqueNm: 22 } });
arm.revolute('wrist-hold', forearm, wrist, { axis: [0, 1, 0], origin: [foreLen, 0, 0], limitsDeg: [-90, 90], actuator: { torqueNm: 8 } });

const hold = await kinematic.checkStaticHold(arm, { minTorqueMarginPct: 15 });
if (!hold.ok) {
  throw new Error('static-hold exceeded: ' + hold.diagnostics.map((d) => d.code + ': ' + d.message).join(' | '));
}

return arm.solvedModel(
  { 'yaw-hold': 0, 'shoulder-hold': 0, 'elbow-hold': 0, 'wrist-hold': 0 },
  {
    ignore: [
      ['yaw-turret', 'upper-link'], ['upper-link', 'forearm-link'], ['forearm-link', 'wrist-link'],
      ['yaw-turret', 'shoulder-servo'], ['upper-link', 'elbow-servo'], ['forearm-link', 'wrist-servo'],
      ['shoulder-servo', 'upper-link'], ['elbow-servo', 'forearm-link'], ['wrist-servo', 'wrist-link'],
      ['base-frame', 'yaw-turret'],
    ],
  },
);
```
