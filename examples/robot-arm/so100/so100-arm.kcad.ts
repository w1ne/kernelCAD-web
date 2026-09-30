// The kernelcad.com hero. Link meshes are the Apache-2.0 SO-ARM100
// visuals. Joint angles are params on a mate chain, so the arm reaches
// without re-importing the meshes on every frame.

const PRINT = '#f0c43a';

const pan = param('panDeg', 0, { min: -110, max: 110, description: 'Base yaw' });
const lift = param('liftDeg', 0, { min: 0, max: 200, description: 'Shoulder pitch' });
const elbow = param('elbowDeg', 0, { min: -180, max: 0, description: 'Elbow pitch' });
const wrist = param('wristDeg', 0, { min: -140, max: 65, description: 'Wrist pitch' });
const roll = param('rollDeg', 0, { min: -180, max: 180, description: 'Wrist roll' });
const jaw = param('jawDeg', 0, { min: -11, max: 110, description: 'Gripper opening' });

type Vec3 = [number, number, number];
type Joint = { xyz: Vec3; rpy: Vec3; axis: Vec3; q: ReturnType<typeof param> };

const shoulderPan: Joint = { xyz: [0, -45.2, 16.5], rpy: [90, 0, 0], axis: [0, 1, 0], q: pan };
const shoulderLift: Joint = { xyz: [0, 102.5, 30.6], rpy: [-103.132, 0, 0], axis: [1, 0, 0], q: lift };
const elbowFlex: Joint = { xyz: [0, 112.57, 28], rpy: [90, 0, 0], axis: [1, 0, 0], q: elbow };
const wristFlex: Joint = { xyz: [0, 5.2, 134.9], rpy: [-57.296, 0, 0], axis: [1, 0, 0], q: wrist };
const wristRoll: Joint = { xyz: [0, -60.1, 0], rpy: [0, 90, 0], axis: [0, 1, 0], q: roll };
const gripper: Joint = { xyz: [-20.2, -24.4, 0], rpy: [0, 180, 0], axis: [0, 0, 1], q: jaw };

function rotX(v: Vec3, deg: number): Vec3 {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
}

function rotY(v: Vec3, deg: number): Vec3 {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}

function rotZ(v: Vec3, deg: number): Vec3 {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
}

function spun(j: Joint | null, v: Vec3): Vec3 {
  if (!j) return v;
  return rotZ(rotY(rotX(v, j.rpy[0]), j.rpy[1]), j.rpy[2]);
}

function axisInParent(j: Joint): Vec3 {
  return spun(j, j.axis);
}

function bake(shape: { rotate: (axis: Vec3, deg: number) => typeof shape }, j: Joint) {
  return shape.rotate([1, 0, 0], j.rpy[0]).rotate([0, 1, 0], j.rpy[1]).rotate([0, 0, 1], j.rpy[2]);
}

const arm = assembly('so100-arm');

async function printed(name: string, file: string, incoming: Joint | null, parentBake: Joint | null) {
  const raw = await lib.fromSTL(`parts/sim/${file}`, { allowOpen: true });
  const shaped = incoming ? bake(raw.scale(1000), incoming) : raw.scale(1000);
  const part = arm.part(name, shaped.color(PRINT));
  if (incoming) {
    part.connector('in', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: spun(parentBake, axisInParent(incoming)),
    });
  }
  return part;
}

function hinge(part: { connector: (name: string, spec: unknown) => unknown }, name: string, bakeBy: Joint | null, joint: Joint) {
  part.connector(name, {
    type: 'axis',
    origin: { kind: 'vec3', value: spun(bakeBy, joint.xyz) },
    axis: spun(bakeBy, axisInParent(joint)),
  });
}

function servo(name: string, center: Vec3, size: Vec3, incoming: Joint | null) {
  const body = box(size[0], size[1], size[2], true).translate(center[0], center[1], center[2]).color('servo');
  const shaped = incoming ? bake(body, incoming) : body;
  const part = arm.part(name, shaped);
  part.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
  return part;
}

const base = await printed('base', 'Base.stl', null, null);
const shoulder = await printed('shoulder', 'Rotation_Pitch.stl', shoulderPan, null);
const upper = await printed('upper-arm', 'Upper_Arm.stl', shoulderLift, shoulderPan);
const lower = await printed('lower-arm', 'Lower_Arm.stl', elbowFlex, shoulderLift);
const wristLink = await printed('wrist', 'Wrist_Pitch_Roll.stl', wristFlex, elbowFlex);
const hand = await printed('hand', 'Fixed_Jaw.stl', wristRoll, wristFlex);
const jawLink = await printed('jaw', 'Moving_Jaw.stl', gripper, wristRoll);

hinge(base, 'pan', null, shoulderPan);
hinge(shoulder, 'lift', shoulderPan, shoulderLift);
hinge(upper, 'elbow', shoulderLift, elbowFlex);
hinge(lower, 'wrist', elbowFlex, wristFlex);
hinge(wristLink, 'roll', wristFlex, wristRoll);
hinge(hand, 'jaw', wristRoll, gripper);

const baseServo = servo('base-servo', [0, -32.7, 46.5], [25, 46, 40], null);
const shoulderServo = servo('shoulder-servo', [0, 90, 30.6], [40, 46, 25], shoulderPan);
const upperServo = servo('upper-servo', [0, 112.6, 15.5], [40, 25, 46], shoulderLift);
const lowerServo = servo('lower-servo', [0, 5.2, 122.4], [40, 25, 46], elbowFlex);
const wristServo = servo('wrist-servo', [-12.5, -42.8, 0], [46, 40, 25], wristFlex);
const handServo = servo('hand-servo', [-7.7, -24.4, 0.5], [46, 25, 40], wristRoll);

base.connector('servo', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
shoulder.connector('servo', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
upper.connector('servo', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
lower.connector('servo', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
wristLink.connector('servo', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
hand.connector('servo', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });

arm.mate('pan', 'base.pan', 'shoulder.in', 'revolute', { pose: pan, limitsDeg: [-110, 110] });
arm.mate('lift', 'shoulder.lift', 'upper-arm.in', 'revolute', { pose: lift, limitsDeg: [0, 200] });
arm.mate('elbow', 'upper-arm.elbow', 'lower-arm.in', 'revolute', { pose: elbow, limitsDeg: [-180, 0] });
arm.mate('wrist', 'lower-arm.wrist', 'wrist.in', 'revolute', { pose: wrist, limitsDeg: [-140, 65] });
arm.mate('roll', 'wrist.roll', 'hand.in', 'revolute', { pose: roll, limitsDeg: [-180, 180] });
arm.mate('jaw', 'hand.jaw', 'jaw.in', 'revolute', { pose: jaw, limitsDeg: [-11, 110] });
arm.mate('base-servo-fix', 'base.servo', 'base-servo.mount', 'fastened');
arm.mate('shoulder-servo-fix', 'shoulder.servo', 'shoulder-servo.mount', 'fastened');
arm.mate('upper-servo-fix', 'upper-arm.servo', 'upper-servo.mount', 'fastened');
arm.mate('lower-servo-fix', 'lower-arm.servo', 'lower-servo.mount', 'fastened');
arm.mate('wrist-servo-fix', 'wrist.servo', 'wrist-servo.mount', 'fastened');
arm.mate('hand-servo-fix', 'hand.servo', 'hand-servo.mount', 'fastened');

animationView({
  name: 'reach',
  fps: 24,
  tracks: [
    { param: 'panDeg', keys: [
      { atMs: 0, value: -25 },
      { atMs: 2500, value: 50, ease: 'easeInOut' },
      { atMs: 5200, value: -40, ease: 'easeInOut' },
      { atMs: 8000, value: -25, ease: 'easeInOut' },
    ] },
    { param: 'liftDeg', keys: [
      { atMs: 0, value: 105 },
      { atMs: 2500, value: 140, ease: 'easeInOut' },
      { atMs: 5200, value: 90, ease: 'easeInOut' },
      { atMs: 8000, value: 105, ease: 'easeInOut' },
    ] },
    { param: 'elbowDeg', keys: [
      { atMs: 0, value: -95 },
      { atMs: 2500, value: -60, ease: 'easeInOut' },
      { atMs: 5200, value: -125, ease: 'easeInOut' },
      { atMs: 8000, value: -95, ease: 'easeInOut' },
    ] },
    { param: 'wristDeg', keys: [
      { atMs: 0, value: 5 },
      { atMs: 2500, value: -40, ease: 'easeInOut' },
      { atMs: 5200, value: 35, ease: 'easeInOut' },
      { atMs: 8000, value: 5, ease: 'easeInOut' },
    ] },
    { param: 'rollDeg', keys: [
      { atMs: 0, value: 0 },
      { atMs: 2500, value: 60, ease: 'easeInOut' },
      { atMs: 5200, value: -50, ease: 'easeInOut' },
      { atMs: 8000, value: 0, ease: 'easeInOut' },
    ] },
    { param: 'jawDeg', keys: [
      { atMs: 0, value: 25 },
      { atMs: 1800, value: 95, ease: 'easeInOut' },
      { atMs: 3600, value: 4, ease: 'easeInOut' },
      { atMs: 5600, value: 80, ease: 'easeInOut' },
      { atMs: 8000, value: 25, ease: 'easeInOut' },
    ] },
  ],
});

return arm.solvedModel({}, {
  ignore: [
    ['base', 'shoulder'],
    ['shoulder', 'upper-arm'],
    ['upper-arm', 'lower-arm'],
    ['lower-arm', 'wrist'],
    ['wrist', 'hand'],
    ['hand', 'jaw'],
    ['base', 'base-servo'],
    ['shoulder', 'shoulder-servo'],
    ['upper-arm', 'upper-servo'],
    ['lower-arm', 'lower-servo'],
    ['wrist', 'wrist-servo'],
    ['hand', 'hand-servo'],
  ],
});
