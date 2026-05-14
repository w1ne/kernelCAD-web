// Tool-built compact robot arm trial.
//
// Purpose: exercise the kernelCAD authoring skill + deterministic review loop
// on a fresh arm, using explicit support contracts so "moving but floating"
// joints are rejected.

const baseYawDeg = param('baseYawDeg', 15, { min: -90, max: 90 });
const shoulderDeg = param('shoulderDeg', 24, { min: -20, max: 50 });
const elbowDeg = param('elbowDeg', -38, { min: -85, max: 80 });
const gripDeg = param('gripDeg', 10, { min: 0, max: 30 });

const arm = assembly('skill-built supported robot arm');

// Root frame: desk plate, compact yaw servo block, and two bearing towers.
// The yaw connector is supported by the towers while the center remains open
// for the rotating turret, avoiding the "post embedded in bearing" failure.
const baseFrameShape = box(130, 100, 6, true)
  .translate(0, 0, 3)
  .union(box(42, 32, 34, true).translate(0, 0, 23))
  .union(box(30, 30, 4, true).translate(0, 0, 42))
  .union(box(18, 56, 6, true).translate(0, 0, 40))
  .color('plate');
const baseFrame = arm.part('base-frame', baseFrameShape);

// Yaw turret: central column stops below the shoulder axis. The shoulder yoke
// is carried by side cheeks, leaving the centerline clear for the upper link.
const turretShape = box(28, 22, 38, true)
  .translate(0, 0, 19)
  .union(box(20, 48, 8, true).translate(0, 0, 34))
  .union(box(18, 7, 24, true).translate(0, 20, 82))
  .union(box(18, 7, 24, true).translate(0, -20, 82))
  .union(box(12, 7, 52, true).translate(0, 20, 57))
  .union(box(12, 7, 52, true).translate(0, -20, 57))
  .color('frame');
const turret = arm.part('yaw-turret', turretShape);

// Upper link integrates the shoulder root and elbow yoke into one load path.
const upperLen = 115;
const upperShape = box(upperLen - 18, 14, 10, true)
  .translate((upperLen - 18) / 2 + 6, 0, 0)
  .union(box(10, 12, 16, true).translate(0, 0, 0))
  .union(box(12, 4, 14, true).translate(0, 12.5, 0))
  .union(box(12, 4, 14, true).translate(0, -12.5, 0))
  .union(box(12, 7, 20, true).translate(upperLen, 15, 0))
  .union(box(12, 7, 20, true).translate(upperLen, -15, 0))
  .color('beam');
const upper = arm.part('upper-link', upperShape);

// Forearm link with a distal mounting face for the gripper palm.
const foreLen = 92;
const foreShape = box(foreLen, 15, 8, true)
  .translate(foreLen / 2, 0, 0)
  .union(box(17, 20, 17, true).translate(0, 0, 0))
  .union(box(10, 18, 14, true).translate(foreLen, 0, 0))
  .union(box(foreLen - 24, 3, 6, true).translate(foreLen / 2, 0, 7))
  .color('beam');
const forearm = arm.part('forearm-link', foreShape);

// Gripper palm: compact one-piece palm with hinge axes kept close to the body.
const palmX = foreLen + 10;
const hingeX = foreLen + 19;
const palmShape = box(10, 40, 24, true)
  .translate(palmX, 0, 0)
  .union(cylinder(2, 4, 24).translate(hingeX, 19, 4))
  .union(cylinder(2, 4, 24).translate(hingeX, 19, -6))
  .union(cylinder(2, 4, 24).translate(hingeX, -19, 4))
  .union(cylinder(2, 4, 24).translate(hingeX, -19, -6))
  .color('tool');
const palm = arm.part('gripper-palm', palmShape);

const leftFinger = arm.part(
  'left-finger',
  box(34, 5, 5, true).translate(17, 0, 0).color('tool'),
);
const rightFinger = arm.part(
  'right-finger',
  box(34, 5, 5, true).translate(17, 0, 0).color('tool'),
);

// Connectors.
baseFrame
  .connector('yaw-out', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 44] }, axis: [0, 0, 1] });

turret
  .connector('yaw-in', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
  .connector('shoulder-axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 82] }, axis: [0, 1, 0] });

upper
  .connector('shoulder-in', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] })
  .connector('elbow-out', { type: 'axis', origin: { kind: 'vec3', value: [upperLen, 0, 0] }, axis: [0, 1, 0] });

forearm
  .connector('elbow-in', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] })
  .connector('palm-mount', { type: 'frame', origin: { kind: 'vec3', value: [foreLen, 0, 0] } });

palm
  .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [foreLen, 0, 0] } })
  .connector('drive-axis', { type: 'axis', origin: { kind: 'vec3', value: [palmX + 4, 0, 14] }, axis: [0, 0, 1] })
  .connector('left-hinge', { type: 'axis', origin: { kind: 'vec3', value: [hingeX, 19, 0] }, axis: [0, 0, 1] })
  .connector('right-hinge', { type: 'axis', origin: { kind: 'vec3', value: [hingeX, -19, 0] }, axis: [0, 0, 1] })
  .connector('tool-tip', { type: 'frame', origin: { kind: 'vec3', value: [hingeX + 34, 0, 0] } });

leftFinger
  .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
  .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [34, 0, 0] } });
rightFinger
  .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
  .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [34, 0, 0] } });

// Mate graph and support contracts.
arm.mate('base-yaw', 'base-frame.yaw-out', 'yaw-turret.yaw-in', 'revolute', {
  pose: baseYawDeg,
  limitsDeg: [-90, 90],
});
arm.mate('shoulder-pitch', 'yaw-turret.shoulder-axis', 'upper-link.shoulder-in', 'revolute', {
  pose: shoulderDeg,
  limitsDeg: [-20, 50],
});
arm.mate('elbow-pitch', 'upper-link.elbow-out', 'forearm-link.elbow-in', 'revolute', {
  pose: elbowDeg,
  limitsDeg: [-85, 80],
});
arm.mate('palm-fix', 'forearm-link.palm-mount', 'gripper-palm.mount', 'fastened');
arm.mate('left-curl', 'gripper-palm.left-hinge', 'left-finger.hinge', 'revolute', {
  pose: gripDeg,
  limitsDeg: [0, 30],
});
arm.mate('right-curl', 'gripper-palm.right-hinge', 'right-finger.hinge', 'revolute');
arm.coupleMates('right-curl', { source: 'left-curl', ratio: -1 });
arm.transmission('finger-synchronizer', {
  kind: 'gear-pair',
  sourceMate: 'left-curl',
  drivenMates: ['right-curl'],
  input: 'left-finger',
  output: 'right-finger',
  path: ['left-finger', 'gripper-palm', 'right-finger'],
  ratio: -1,
  notes: 'Opposed finger motion is synchronized through the palm-mounted hinge/gear path rather than a free mate coupling.',
});

return arm.solvedModel({});
