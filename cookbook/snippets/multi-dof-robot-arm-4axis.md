---
id: multi-dof-robot-arm-4axis
title: Production 4-DOF robot arm — bridged yokes, clearances, mechanicalJoint chain, reach animation
tags: [assembly, connector, mate, revolute, joint, kinematic, plate, parameter, actuator]
keywords:
  - 4-DOF robot arm
  - four axis industrial arm
  - base yaw shoulder elbow wrist
  - multi-dof robot arm
  - bridged yoke load path
  - seated servo mechanicalJoint
  - yaw pedestal clearance
  - reach cycle animationView
  - production cobot arm mechanism=real
  - bridge yoke into parent link
when_to_use: >-
  Prompt asks for a production multi-body robot arm with at least 4 revolute
  DOF (base yaw, shoulder, elbow, wrist), seated servos, mechanicalJoint
  chain, mechanism=real, optional gravity/actuator check, and animationView
  reach cycle. CRITICAL: fuse every yoke / servo-shelf / cheek into its parent
  link with .union() so each part is ONE solid load path — floating yoke
  fragments fail review (assembly.geometry.floating-body / attachment-
  plausibility). Keep the yaw turntable disk ABOVE the pedestal for bearing
  clearance (no pedestal overlap). Prefer design_loop until green. See also
  multi-body-mechanism-real-proportions and examples/robot-arm/compact-
  supported-arm.kcad.ts.
---

```typescript
// Production 4-DOF open-chain arm. Every yoke/cheek/servo shelf is .union()'d
// into its parent link (bridged load path). Yaw disk sits above the pedestal.

const baseYawDeg = param('baseYawDeg', 20, { min: -90, max: 90 });
const shoulderDeg = param('shoulderDeg', 25, { min: -15, max: 55 });
const elbowDeg = param('elbowDeg', -40, { min: -85, max: 70 });
const wristDeg = param('wristDeg', 15, { min: -90, max: 90 });

const shoulderZ = 78;
const upperLen = 115;
const foreLen = 95;
const wristLen = 48;

const arm = assembly('multi-dof-4axis');

// Pedestal + seated yaw servo fused into one base-frame solid.
const base = arm.part(
  'base-frame',
  box(130, 100, 8, true)
    .translate(0, 0, 4)
    .color('plate')
    // Pedestal column — stops BELOW the yaw disk (clearance).
    .union(box(40, 40, 36, true).translate(0, 0, 26).color('frame'))
    // Yaw bearing shelf fused into pedestal (not a floating disk).
    .union(cylinder(6, 22).translate(0, 0, 44).color('shaft'))
    // Seated yaw servo body fused onto the rear of the plate.
    .union(box(34, 28, 22, true).translate(-48, 0, 19).color('actuator')),
);
base.connector('yaw', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 50] },
  axis: [0, 0, 1],
});

// Yaw turret: column + shoulder yoke cheeks bridged into ONE solid.
// Cheeks share X/Y overlap with the column so the part is one connected body.
const turret = arm.part(
  'yaw-turret',
  box(30, 26, 40, true)
    .translate(0, 0, 20)
    .color('frame')
    // Cross-beam bridges left/right cheeks through the column.
    .union(box(18, 52, 10, true).translate(0, 0, 36))
    // Shoulder yoke cheeks — fused via the cross-beam (not floating islands).
    .union(box(20, 8, 32, true).translate(0, 22, shoulderZ - 50))
    .union(box(20, 8, 32, true).translate(0, -22, shoulderZ - 50))
    // Vertical webs fuse cheeks down into the column.
    .union(box(12, 8, 48, true).translate(0, 22, 24))
    .union(box(12, 8, 48, true).translate(0, -22, 24)),
);
turret.connector('yaw', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 0, 1],
});
turret.connector('shoulder', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, shoulderZ - 50] },
  axis: [0, 1, 0],
});
turret.connector('shoulder-servo-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [-32, 40, shoulderZ - 50] },
});

const shoulderServo = arm.part(
  'shoulder-servo',
  box(28, 18, 30, true).translate(-32, 40, shoulderZ - 50).color('actuator'),
);
shoulderServo.connector('mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [-32, 40, shoulderZ - 50] },
});

// Upper link: beam + proximal tongue + distal elbow yoke — all fused.
const upper = arm.part(
  'upper-link',
  box(upperLen - 20, 14, 12, true)
    .translate(upperLen / 2, 0, 0)
    .color('beam')
    // Proximal hinge pin / tongue bridged into beam.
    .union(cylinder(90, 4).rotate([1, 0, 0], 90).translate(0, 45, 0))
    .union(box(28, 10, 18, true).translate(6, 0, 0))
    // Distal elbow yoke cheeks bridged via beam + web.
    .union(box(24, 8, 26, true).translate(upperLen - 6, 14, 0))
    .union(box(24, 8, 26, true).translate(upperLen - 6, -14, 0))
    .union(box(16, 28, 10, true).translate(upperLen - 10, 0, 0)),
);
upper.connector('shoulder', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 1, 0],
});
upper.connector('elbow', {
  type: 'axis',
  origin: { kind: 'vec3', value: [upperLen, 0, 0] },
  axis: [0, 1, 0],
});
upper.connector('elbow-servo-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [upperLen - 20, 34, 0] },
});

const elbowServo = arm.part(
  'elbow-servo',
  box(26, 16, 26, true).translate(upperLen - 20, 34, 0).color('actuator'),
);
elbowServo.connector('mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [upperLen - 20, 34, 0] },
});

// Forearm + distal wrist yoke fused.
const forearm = arm.part(
  'forearm-link',
  box(foreLen - 16, 14, 10, true)
    .translate(foreLen / 2, 0, 0)
    .color('beam')
    .union(box(22, 12, 18, true).translate(4, 0, 0))
    .union(box(20, 8, 22, true).translate(foreLen - 4, 12, 0))
    .union(box(20, 8, 22, true).translate(foreLen - 4, -12, 0))
    .union(box(14, 24, 8, true).translate(foreLen - 8, 0, 0)),
);
forearm.connector('elbow', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 1, 0],
});
forearm.connector('wrist', {
  type: 'axis',
  origin: { kind: 'vec3', value: [foreLen, 0, 0] },
  axis: [0, 1, 0],
});
forearm.connector('wrist-servo-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [foreLen - 16, 30, 0] },
});

const wristServo = arm.part(
  'wrist-servo',
  box(22, 14, 22, true).translate(foreLen - 16, 30, 0).color('actuator'),
);
wristServo.connector('mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [foreLen - 16, 30, 0] },
});

// Wrist / tool flange — single solid.
const wrist = arm.part(
  'wrist-link',
  box(wristLen, 12, 10, true)
    .translate(wristLen / 2, 0, 0)
    .color('tool')
    .union(box(16, 10, 16, true).translate(4, 0, 0))
    .union(cylinder(8, 10).rotate([0, 1, 0], 90).translate(wristLen, 0, -4)),
);
wrist.connector('proximal', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 1, 0],
});

arm.mate('base-yaw', 'base-frame.yaw', 'yaw-turret.yaw', 'revolute', {
  pose: baseYawDeg,
  limitsDeg: [-90, 90],
});
arm.mate('shoulder-pitch', 'yaw-turret.shoulder', 'upper-link.shoulder', 'revolute', {
  pose: shoulderDeg,
  limitsDeg: [-15, 55],
});
arm.mate('elbow-pitch', 'upper-link.elbow', 'forearm-link.elbow', 'revolute', {
  pose: elbowDeg,
  limitsDeg: [-85, 70],
});
arm.mate('wrist-pitch', 'forearm-link.wrist', 'wrist-link.proximal', 'revolute', {
  pose: wristDeg,
  limitsDeg: [-90, 90],
});

arm.mate('shoulder-servo-fix', 'yaw-turret.shoulder-servo-mount', 'shoulder-servo.mount', 'fastened');
arm.mate('elbow-servo-fix', 'upper-link.elbow-servo-mount', 'elbow-servo.mount', 'fastened');
arm.mate('wrist-servo-fix', 'forearm-link.wrist-servo-mount', 'wrist-servo.mount', 'fastened');

arm.mechanicalJoint('yaw-drive', {
  mate: 'base-yaw',
  actuator: 'base-frame',
  shaft: 'base-frame',
  supports: ['base-frame'],
  output: 'yaw-turret',
  requiredSupport: {
    kind: 'bearing',
    around: 'base-frame.yaw',
    supports: ['base-frame'],
    minBearingLengthMm: 20,
  },
});
arm.mechanicalJoint('shoulder-drive', {
  mate: 'shoulder-pitch',
  actuator: 'shoulder-servo',
  shaft: 'yaw-turret',
  supports: ['yaw-turret'],
  output: 'upper-link',
  requiredSupport: {
    kind: 'hinge-bracket',
    around: 'yaw-turret.shoulder',
    supports: ['yaw-turret'],
    minBearingLengthMm: 28,
  },
});
arm.mechanicalJoint('elbow-drive', {
  mate: 'elbow-pitch',
  actuator: 'elbow-servo',
  shaft: 'upper-link',
  supports: ['upper-link'],
  output: 'forearm-link',
  requiredSupport: {
    kind: 'hinge-bracket',
    around: 'upper-link.elbow',
    supports: ['upper-link'],
    minBearingLengthMm: 24,
  },
});
arm.mechanicalJoint('wrist-drive', {
  mate: 'wrist-pitch',
  actuator: 'wrist-servo',
  shaft: 'forearm-link',
  supports: ['forearm-link'],
  output: 'wrist-link',
  requiredSupport: {
    kind: 'hinge-bracket',
    around: 'forearm-link.wrist',
    supports: ['forearm-link'],
    minBearingLengthMm: 20,
  },
});

animationView({
  name: 'reach cycle',
  tracks: [
    {
      param: 'baseYawDeg',
      keys: [
        { atMs: 0, value: -30 },
        { atMs: 1200, value: 40, ease: 'easeInOut' },
        { atMs: 2400, value: -30, ease: 'easeInOut' },
      ],
    },
    {
      param: 'shoulderDeg',
      keys: [
        { atMs: 0, value: 15 },
        { atMs: 1200, value: 45, ease: 'easeInOut' },
        { atMs: 2400, value: 15, ease: 'easeInOut' },
      ],
    },
    {
      param: 'elbowDeg',
      keys: [
        { atMs: 0, value: -30 },
        { atMs: 1200, value: -60, ease: 'easeInOut' },
        { atMs: 2400, value: -30, ease: 'easeInOut' },
      ],
    },
    {
      param: 'wristDeg',
      keys: [
        { atMs: 0, value: 0 },
        { atMs: 1200, value: 35, ease: 'easeInOut' },
        { atMs: 2400, value: 0, ease: 'easeInOut' },
      ],
    },
  ],
  fps: 24,
});

// Optional gravity/actuator check (uncomment when validating torque margins):
// const hold = await kinematic.checkStaticHold(arm, { minTorqueMarginPct: 15 });

return arm.solvedModel({}, {
  ignore: [
    ['yaw-turret', 'upper-link'],
    ['upper-link', 'forearm-link'],
    ['forearm-link', 'wrist-link'],
    ['yaw-turret', 'shoulder-servo'],
    ['upper-link', 'elbow-servo'],
    ['forearm-link', 'wrist-servo'],
    ['shoulder-servo', 'upper-link'],
    ['elbow-servo', 'forearm-link'],
    ['wrist-servo', 'wrist-link'],
    ['base-frame', 'yaw-turret'],
  ],
});
```
