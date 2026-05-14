// Iteration 01: intentionally preserved failed robot-arm attempt.
//
// This is the kind of output the loop must reject: the kinematic chain moves,
// but the base, turret, shoulder root, and shaft all occupy the same volume at
// the shoulder envelope. Keep this file as visual evidence for the build record.

const baseYawDeg = param('baseYawDeg', 15, { min: -90, max: 90 });
const shoulderDeg = param('shoulderDeg', 28, { min: -20, max: 75 });
const elbowDeg = param('elbowDeg', -38, { min: -85, max: 80 });
const gripDeg = param('gripDeg', 10, { min: 0, max: 30 });

const arm = assembly('iteration 01 colliding robot arm');

const baseFrame = arm.part(
  'base-frame',
  box(130, 100, 6, true)
    .translate(0, 0, 3)
    .union(box(42, 32, 34, true).translate(0, 0, 23))
    .union(cylinder(8, 16, 40).translate(0, 0, 40))
    .color('plate'),
);

const turret = arm.part(
  'yaw-turret',
  box(28, 24, 50, true)
    .translate(0, 0, 25)
    .union(box(18, 7, 22, true).translate(0, 19, 52))
    .union(box(18, 7, 22, true).translate(0, -19, 52))
    .union(box(32, 18, 26, true).translate(0, 34, 50))
    .color('frame'),
);

const upperLen = 115;
const upper = arm.part(
  'upper-link',
  box(upperLen, 18, 10, true)
    .translate(upperLen / 2, 0, 0)
    .union(box(12, 14, 18, true).translate(0, 0, 0))
    .union(box(14, 14, 18, true).translate(upperLen, 0, 0))
    .union(box(upperLen - 32, 4, 7, true).translate(upperLen / 2, 0, 8))
    .color('beam'),
);

const foreLen = 92;
const forearm = arm.part(
  'forearm-link',
  box(foreLen, 15, 8, true)
    .translate(foreLen / 2, 0, 0)
    .union(box(12, 13, 16, true).translate(0, 0, 0))
    .union(box(10, 18, 14, true).translate(foreLen, 0, 0))
    .union(box(foreLen - 24, 3, 6, true).translate(foreLen / 2, 0, 7))
    .color('beam'),
);

const palmX = foreLen + 10;
const hingeX = foreLen + 19;
const palm = arm.part(
  'gripper-palm',
  box(10, 40, 24, true)
    .translate(palmX, 0, 0)
    .union(box(16, 13, 2, true).translate(hingeX - 8, 21, 5))
    .union(box(16, 13, 2, true).translate(hingeX - 8, 21, -5))
    .union(box(16, 13, 2, true).translate(hingeX - 8, -21, 5))
    .union(box(16, 13, 2, true).translate(hingeX - 8, -21, -5))
    .color('tool'),
);

const leftFinger = arm.part('left-finger', box(34, 5, 5, true).translate(17, 0, 0).color('tool'));
const rightFinger = arm.part('right-finger', box(34, 5, 5, true).translate(17, 0, 0).color('tool'));
const shoulderShaft = arm.part(
  'shoulder-shaft',
  cylinder(8, 3, 32).alongAxis([0, 1, 0]).translate(0, -4, 0).color('shaft'),
);

baseFrame.connector('yaw-out', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 44] }, axis: [0, 0, 1] });
turret
  .connector('yaw-in', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
  .connector('shoulder-axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 52] }, axis: [0, 1, 0] })
  .connector('shoulder-shaft-mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 52] } });
upper
  .connector('shoulder-in', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] })
  .connector('elbow-out', { type: 'axis', origin: { kind: 'vec3', value: [upperLen, 0, 0] }, axis: [0, 1, 0] });
forearm
  .connector('elbow-in', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] })
  .connector('palm-mount', { type: 'frame', origin: { kind: 'vec3', value: [foreLen, 0, 0] } });
palm
  .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [foreLen, 0, 0] } })
  .connector('left-hinge', { type: 'axis', origin: { kind: 'vec3', value: [hingeX, 21, 0] }, axis: [0, 0, 1] })
  .connector('right-hinge', { type: 'axis', origin: { kind: 'vec3', value: [hingeX, -21, 0] }, axis: [0, 0, 1] })
  .connector('tool-tip', { type: 'frame', origin: { kind: 'vec3', value: [hingeX + 34, 0, 0] } });
leftFinger
  .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
  .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [34, 0, 0] } });
rightFinger
  .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
  .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [34, 0, 0] } });
shoulderShaft.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });

arm.mate('base-yaw', 'base-frame.yaw-out', 'yaw-turret.yaw-in', 'revolute', {
  pose: baseYawDeg,
  limitsDeg: [-90, 90],
});
arm.mate('shoulder-shaft-fix', 'yaw-turret.shoulder-shaft-mount', 'shoulder-shaft.mount', 'fastened');
arm.mate('shoulder-pitch', 'yaw-turret.shoulder-axis', 'upper-link.shoulder-in', 'revolute', {
  pose: shoulderDeg,
  limitsDeg: [-20, 75],
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

return arm.solvedModel({});
