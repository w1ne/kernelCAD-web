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
// Joint hardware: pitch joints are joint.clevis (fork sandwiches a round
// tongue, capped pin through both ears). Each link tube starts inside its
// tongue so the spar is seated in the hub. Parent yokes (hub + side spines
// + cheek disks) bridge the fork back into the tube — sub-millimetre
// running clearance, not a multi-mm air gap. Yaw is a spigot inside a bored
// collar (0.28 mm radial, ~0.4 mm axial) so the turret sits on the pedestal
// without a shared volume. Servo bottoms are 0.2 mm above their shelves.
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

const YAW_Z = 54;
const SHOULDER_Z = 36;
const upperLen = 112;
const foreLen = 90;
const wristLen = 44;
const yawBoreR = 16.28;

const pinMat = { baseColor: '#1c2228', metalness: 0.94, roughness: 0.22 };

function clevisStyle(knuckleR, tongueY, plateT, pinR) {
  return {
    knuckleR,
    tongueY,
    forkGapY: tongueY + 0.8,
    plateT,
    pinR,
    pinCapR: pinR + 2.4,
    pinCapThickness: pinR + 2.2,
    holeClearance: 0.15,
    pinMaterial: pinMat,
  };
}

const shoulderStyle = clevisStyle(14, 16, 5.4, 4.2);
const elbowStyle = clevisStyle(12, 13, 4.8, 3.6);
const wristStyle = clevisStyle(10, 11, 4.2, 3.1);
const shoulderLimits = [-15, 55];
const elbowLimits = [-85, 70];
const wristLimits = [-90, 90];

function xTube(x0, x1, r) {
  return cylinder(x1 - x0, r).rotate([0, 1, 0], 90).translate(x0, 0, 0);
}

function yCyl(len, r, cx, cz) {
  return cylinder(len, r).rotate([1, 0, 0], 90).translate(cx, len / 2, cz);
}

function capFaceY(style) {
  // Outer axial face of the clevis cap (pin axis is Y). pinCapR is radial.
  const shaftLen = style.forkGapY + 2 * style.plateT;
  return shaftLen / 2 + style.pinCapThickness - 0.5;
}

function parentYoke(pivotX, style, tubeR) {
  const plateOffset = style.forkGapY / 2 + style.plateT / 2;
  // Stop 0.35 mm before the tongue disk so the parent never enters it.
  const stop = pivotX - style.knuckleR - 0.35;
  const collar = xTube(stop - 18, stop, tubeR + 1.8);
  const cheek = (ySign) => yCyl(style.plateT, style.knuckleR, pivotX, 0)
    .translate(0, ySign * plateOffset, 0);
  const spineZ = Math.max(tubeR * 1.2, style.knuckleR * 0.72);
  const spine = (ySign) => box(style.knuckleR + 12, style.plateT, spineZ, false).translate(
    stop - 10,
    ySign * plateOffset - style.plateT / 2,
    -spineZ / 2,
  );
  return collar.union(cheek(1)).union(cheek(-1)).union(spine(1)).union(spine(-1));
}

const HORN_Z = 8;

function servoPad(mount, bodyW, bodyD, yInner) {
  const zTop = mount[2] - 0.2;
  const yEnd = mount[1] + bodyD / 2 + 4;
  const xHalf = bodyW / 2 + 8;
  return box(xHalf * 2, yEnd - yInner, 5, false).translate(mount[0] - xHalf, yInner, zTop - 5);
}

function dropGusset(pivotX, knuckleR, tubeR, shelfTop) {
  const x1 = pivotX - knuckleR - 1.2;
  const x0 = x1 - 18;
  const z1 = -tubeR + 2.2;
  const z0 = shelfTop - 4;
  return box(x1 - x0, tubeR + 6, z1 - z0, false).translate(x0, -2, z0);
}

function servoSolid(w, d, h) {
  const body = box(w, d, h, true).translate(0, 0, h / 2);
  const ear = box(w + 14, 3.6, 2.8, true).translate(0, 0, h - 0.4);
  const screw = (x) => cylinder(h + 1.7, 1.45).translate(x, 0, -0.12).finish('steel');
  // Side output at pin height. The horn stops 0.6 mm short of the cap face
  // and stays above the mounting pad (pad top is 0.2 mm below the body).
  const stub = cylinder(4.2, 2.3).rotate([1, 0, 0], 90).translate(0, -d / 2 + 0.5, HORN_Z).finish('steel');
  const horn = cylinder(1.6, 5.4).rotate([1, 0, 0], 90).translate(0, -d / 2 - 2.6, HORN_Z).finish('abs', { color: '#c5ced6' });
  return body.union(ear).union(screw((w + 9) / 2)).union(screw(-(w + 9) / 2)).union(stub).union(horn);
}

const upperTubeR = shoulderStyle.tongueY / 2 - 0.45;
const foreTubeR = elbowStyle.tongueY / 2 - 0.45;
const wristTubeR = wristStyle.tongueY / 2 - 0.4;

const foot = (x, y) => cylinder(3.2, 5.2).translate(x, y, 6.2);
const baseSolid = box(152, 116, 8, true).translate(0, 0, 4)
  .union(cylinder(34, 20).translate(0, 0, 8))
  .union(cylinder(4, 32).translate(0, 0, 42))
  .union(cylinder(16, 16).translate(0, 0, 46))
  .union(foot(58, 42)).union(foot(58, -42)).union(foot(-58, 42)).union(foot(-58, -42))
  .union(box(42, 34, 30, true).translate(-54, 0, 20).finish('abs', { color: '#243140' }))
  .union(cylinder(18, 4.2).rotate([0, 1, 0], 90).translate(-36, 0, 30).finish('steel'));

const shoulderPlateY = shoulderStyle.forkGapY / 2 + shoulderStyle.plateT / 2;
const mastTop = SHOULDER_Z - shoulderStyle.knuckleR - 0.4;
const shoulderWeb = (ySign) => box(16, shoulderStyle.plateT, 22, true).translate(
  0,
  ySign * shoulderPlateY,
  SHOULDER_Z - 6,
);
const shoulderServoD = 18;
const shoulderMount = [0, capFaceY(shoulderStyle) + shoulderServoD / 2 + 4.8, SHOULDER_Z - HORN_Z];
const turretSolid = cylinder(17.75, 23).translate(0, 0, -7.55)
  .subtract(cylinder(16.7, yawBoreR).translate(0, 0, -8.4))
  .union(cylinder(mastTop - 8.5, 17).translate(0, 0, 8.5))
  .union(shoulderWeb(1))
  .union(shoulderWeb(-1))
  .union(servoPad(shoulderMount, 32, shoulderServoD, shoulderStyle.tongueY / 2 + 0.5));

const elbowServoD = 16;
const wristServoD = 14;
const elbowMount = [upperLen, capFaceY(elbowStyle) + elbowServoD / 2 + 4.8, -HORN_Z];
const wristMount = [foreLen, capFaceY(wristStyle) + wristServoD / 2 + 4.8, -HORN_Z];
const upperRaw = xTube(shoulderStyle.pinR + 0.55, upperLen - elbowStyle.knuckleR - 0.15, upperTubeR)
  .union(parentYoke(upperLen, elbowStyle, upperTubeR))
  .union(servoPad(elbowMount, 28, elbowServoD, elbowStyle.tongueY / 2 + 0.5))
  .union(dropGusset(upperLen, elbowStyle.knuckleR, upperTubeR, elbowMount[2] - 0.2));
const foreRaw = xTube(elbowStyle.pinR + 0.55, foreLen - wristStyle.knuckleR - 0.15, foreTubeR)
  .union(parentYoke(foreLen, wristStyle, foreTubeR))
  .union(servoPad(wristMount, 24, wristServoD, wristStyle.tongueY / 2 + 0.5))
  .union(dropGusset(foreLen, wristStyle.knuckleR, foreTubeR, wristMount[2] - 0.2));
const wristRaw = xTube(wristStyle.pinR + 0.55, wristLen, wristTubeR)
  .union(xTube(wristLen - 2, wristLen + 9, 11.5));

// Pin axis is -Y so a positive pitch angle lifts the link. The reach-cycle
// keys are positive; +Y would drive the arm down through the pedestal.
const wristJoint = joint.clevis({
  parentBody: foreRaw,
  childBody: wristRaw,
  axis: [0, -1, 0],
  pivotParent: [foreLen, 0, 0],
  pivotChild: [0, 0, 0],
  limitsDeg: wristLimits,
  liftDir: [1, 0, 0],
  liftPivot: false,
  style: wristStyle,
});
const elbowJoint = joint.clevis({
  parentBody: upperRaw,
  childBody: wristJoint.parentGeometry,
  axis: [0, -1, 0],
  pivotParent: [upperLen, 0, 0],
  pivotChild: [0, 0, 0],
  limitsDeg: elbowLimits,
  liftDir: [1, 0, 0],
  liftPivot: false,
  style: elbowStyle,
});
const shoulderJoint = joint.clevis({
  parentBody: turretSolid,
  childBody: elbowJoint.parentGeometry,
  axis: [0, -1, 0],
  pivotParent: [0, 0, SHOULDER_Z],
  pivotChild: [0, 0, 0],
  limitsDeg: shoulderLimits,
  liftDir: [0, 0, 1],
  liftPivot: false,
  style: shoulderStyle,
});

const arm = assembly('multi-dof-4axis-release');

const base = arm.part('base-frame', baseSolid, { material: 'mild-steel' });
base.connector('yaw', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, YAW_Z] },
  axis: [0, 0, 1],
  jointClearanceRadius: yawBoreR,
});

const turret = arm.part('yaw-turret', shoulderJoint.parentGeometry, { material: 'aluminum-6061' });
turret.connector('yaw', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 0, 1],
  jointClearanceRadius: yawBoreR,
});
turret.connector('shoulder', {
  type: 'axis',
  origin: { kind: 'vec3', value: shoulderJoint.parentConnector.origin },
  axis: shoulderJoint.parentConnector.axis,
  jointClearanceRadius: shoulderJoint.parentConnector.clearanceRadius,
});
turret.connector('shoulder-servo-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: shoulderMount },
});

const shoulderServo = arm.part(
  'shoulder-servo',
  servoSolid(32, shoulderServoD, 30).translate(shoulderMount[0], shoulderMount[1], shoulderMount[2]),
  { material: 'abs' },
);
shoulderServo.connector('mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: shoulderMount },
});

const upper = arm.part('upper-link', shoulderJoint.childGeometry, { material: 'aluminum-6061' });
upper.connector('shoulder', {
  type: 'axis',
  origin: { kind: 'vec3', value: shoulderJoint.childConnector.origin },
  axis: shoulderJoint.childConnector.axis,
  jointClearanceRadius: shoulderJoint.childConnector.clearanceRadius,
});
upper.connector('elbow', {
  type: 'axis',
  origin: { kind: 'vec3', value: elbowJoint.parentConnector.origin },
  axis: elbowJoint.parentConnector.axis,
  jointClearanceRadius: elbowJoint.parentConnector.clearanceRadius,
});
upper.connector('elbow-servo-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: elbowMount },
});

const elbowServo = arm.part('elbow-servo', servoSolid(28, elbowServoD, 26).translate(elbowMount[0], elbowMount[1], elbowMount[2]), { material: 'abs' });
elbowServo.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: elbowMount } });

const forearm = arm.part('forearm-link', elbowJoint.childGeometry, { material: 'aluminum-6061' });
forearm.connector('elbow', {
  type: 'axis',
  origin: { kind: 'vec3', value: elbowJoint.childConnector.origin },
  axis: elbowJoint.childConnector.axis,
  jointClearanceRadius: elbowJoint.childConnector.clearanceRadius,
});
forearm.connector('wrist', {
  type: 'axis',
  origin: { kind: 'vec3', value: wristJoint.parentConnector.origin },
  axis: wristJoint.parentConnector.axis,
  jointClearanceRadius: wristJoint.parentConnector.clearanceRadius,
});
forearm.connector('wrist-servo-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: wristMount },
});

const wristServo = arm.part('wrist-servo', servoSolid(24, wristServoD, 22).translate(wristMount[0], wristMount[1], wristMount[2]), { material: 'abs' });
wristServo.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: wristMount } });

const wrist = arm.part('wrist-link', wristJoint.childGeometry, { material: 'aluminum-6061' });
wrist.connector('proximal', {
  type: 'axis',
  origin: { kind: 'vec3', value: wristJoint.childConnector.origin },
  axis: wristJoint.childConnector.axis,
  jointClearanceRadius: wristJoint.childConnector.clearanceRadius,
});

arm.mate('base-yaw', 'base-frame.yaw', 'yaw-turret.yaw', 'revolute', { pose: baseYawDeg, limitsDeg: [-90, 90] });
arm.mate('shoulder-pitch', 'yaw-turret.shoulder', 'upper-link.shoulder', 'revolute', { pose: shoulderDeg, limitsDeg: shoulderLimits });
arm.mate('elbow-pitch', 'upper-link.elbow', 'forearm-link.elbow', 'revolute', { pose: elbowDeg, limitsDeg: elbowLimits });
arm.mate('wrist-pitch', 'forearm-link.wrist', 'wrist-link.proximal', 'revolute', { pose: wristDeg, limitsDeg: wristLimits });
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

arm.revolute('yaw-hold', base, turret, { axis: [0, 0, 1], origin: [0, 0, YAW_Z], limitsDeg: [-90, 90], actuator: { torqueNm: 25 } });
arm.revolute('shoulder-hold', turret, upper, {
  axis: shoulderJoint.parentConnector.axis,
  origin: shoulderJoint.parentConnector.origin,
  limitsDeg: shoulderLimits,
  actuator: { torqueNm: 45 },
});
arm.revolute('elbow-hold', upper, forearm, {
  axis: elbowJoint.parentConnector.axis,
  origin: elbowJoint.parentConnector.origin,
  limitsDeg: elbowLimits,
  actuator: { torqueNm: 22 },
});
arm.revolute('wrist-hold', forearm, wrist, {
  axis: wristJoint.parentConnector.axis,
  origin: wristJoint.parentConnector.origin,
  limitsDeg: wristLimits,
  actuator: { torqueNm: 8 },
});

const hold = await kinematic.checkStaticHold(arm, { minTorqueMarginPct: 15 });
if (!hold.ok) {
  throw new Error('static-hold exceeded: ' + hold.diagnostics.map((d) => d.code + ': ' + d.message).join(' | '));
}

return arm.solvedModel(
  { 'yaw-hold': 0, 'shoulder-hold': 0, 'elbow-hold': 0, 'wrist-hold': 0 },
);
```
