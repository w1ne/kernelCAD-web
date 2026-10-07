// The kernelcad.com hero. Link meshes are the Apache-2.0 SO-ARM100
// visuals. Joint angles are params on a mate chain, so the arm reaches
// without re-importing the meshes on every frame.

const PRINT = '#f0c43a';

const pan = param('panDeg', 0, { min: -110, max: 110, description: 'Base yaw' });
const lift = param('liftDeg', 0, { min: 0, max: 200, description: 'Shoulder pitch' });
const elbow = param('elbowDeg', 0, { min: -180, max: 0, description: 'Elbow pitch' });
const wrist = param('wristDeg', 0, { min: -140, max: 65, description: 'Wrist pitch' });
const roll = param('rollDeg', 0, { min: -180, max: 180, description: 'Wrist roll' });
// -11° is the closed stop: the moving finger meets the fixed jaw.
// 0° leaves the pincer open; the reach animation still drives jawDeg.
const jaw = param('jawDeg', -11, { min: -11, max: 110, description: 'Gripper opening' });

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

// Printed boss on the joint axis. The vendor shells stop ~20 mm short of
// the elbow and wrist pivots, and a servo box fastened to one link is not
// the link. The boss is the revolute child; the next shell fastens to it.
function axleBoss() {
  return cylinder(46, 23).translate(0, 0, -23).rotate([0, 1, 0], 90).color(PRINT);
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

function servo(
  link: { connector: (name: string, spec: unknown) => unknown },
  linkName: string,
  name: string,
  center: Vec3,
  size: Vec3,
  incoming: Joint | null,
) {
  const body = box(size[0], size[1], size[2], true).translate(center[0], center[1], center[2]).color('servo');
  const shaped = incoming ? bake(body, incoming) : body;
  const part = arm.part(name, shaped);
  // Mount at the motor center, in the baked frame. The link uses the same
  // point, so the fastened mate does not slide the box off the motor.
  const at = spun(incoming, center);
  const origin = { kind: 'vec3' as const, value: [at[0], at[1], at[2]] as Vec3 };
  part.connector('mount', { type: 'frame', origin });
  link.connector('servo', { type: 'frame', origin: { kind: 'vec3', value: [at[0], at[1], at[2]] } });
  arm.mate(`${name}-fix`, `${linkName}.servo`, `${name}.mount`, 'fastened');
}

const base = await printed('base', 'Base.stl', null, null);
const shoulder = await printed('shoulder', 'Rotation_Pitch.stl', shoulderPan, null);
const upper = await printed('upper-arm', 'Upper_Arm.stl', shoulderLift, shoulderPan);
const lower = await printed('lower-arm', 'Lower_Arm.stl', elbowFlex, shoulderLift);
const wristLink = await printed('wrist', 'Wrist_Pitch_Roll.stl', wristFlex, elbowFlex);
const hand = await printed('hand', 'Fixed_Jaw.stl', wristRoll, wristFlex);
// The sim STL is an open shell in the jaw link frame. Baking only the
// gripper rpy (Ry 180) left that finger rolled about Y relative to the
// fixed jaw, which already carries the wrist-roll bake. The fingertip
// then sat beside the fixed finger and could not close. The STEP solid
// is the same frame in millimetres; bake the wrist roll on top of the
// gripper rpy so the finger lies in the closing plane.
const jawRaw = await lib.fromSTEP('parts/Moving_Jaw.step');
const jawLink = arm.part('jaw', bake(bake(jawRaw, gripper), wristRoll).color(PRINT));
jawLink.connector('in', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: spun(wristRoll, axisInParent(gripper)),
});
// Passive horn bolts to the jaw mount face (bolt circle at local z = -24,
// same seat as so100.kcad.ts). A couple of millimetres of the disc sit in
// the hub so the fastened connector is inside both solids; the rest of
// the aluminium disc stands proud of the knuckle.
const HORN_Z = -26.8;
const hornRaw = (await lib.fromSTEP('parts/Passive_Horn.step'))
  .finish('aluminium')
  .translate(0, 0, HORN_Z);
const jawHorn = arm.part('jaw-horn', bake(bake(hornRaw, gripper), wristRoll));
// Local (0, 0, -24.8) is inside the hub and inside the seated horn.
// Ry(90) * Ry(180) sends (0, 0, z) to (-z, 0, 0).
const hornMount: Vec3 = [24.8, 0, 0];
jawLink.connector('horn', { type: 'frame', origin: { kind: 'vec3', value: hornMount } });
jawHorn.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: hornMount } });

hinge(base, 'pan', null, shoulderPan);
hinge(shoulder, 'lift', shoulderPan, shoulderLift);
hinge(upper, 'elbow', shoulderLift, elbowFlex);
hinge(lower, 'wrist', elbowFlex, wristFlex);
hinge(wristLink, 'roll', wristFlex, wristRoll);

function boss(name: string) {
  const part = arm.part(name, axleBoss());
  part.connector('in', {
    type: 'axis',
    origin: { kind: 'vec3', value: [0, 0, 0] },
    axis: [1, 0, 0],
  });
  part.connector('link', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
  return part;
}
boss('elbow-boss');
boss('wrist-boss');
lower.connector('elbow-boss', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
wristLink.connector('wrist-boss', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
hinge(hand, 'jaw', wristRoll, gripper);

arm.mate('pan', 'base.pan', 'shoulder.in', 'revolute', { pose: pan, limitsDeg: [-110, 110] });
arm.mate('lift', 'shoulder.lift', 'upper-arm.in', 'revolute', { pose: lift, limitsDeg: [0, 200] });
arm.mate('elbow', 'upper-arm.elbow', 'elbow-boss.in', 'revolute', { pose: elbow, limitsDeg: [-180, 0] });
arm.mate('elbow-boss-fix', 'elbow-boss.link', 'lower-arm.elbow-boss', 'fastened');
arm.mate('wrist', 'lower-arm.wrist', 'wrist-boss.in', 'revolute', { pose: wrist, limitsDeg: [-140, 65] });
arm.mate('wrist-boss-fix', 'wrist-boss.link', 'wrist.wrist-boss', 'fastened');
arm.mate('roll', 'wrist.roll', 'hand.in', 'revolute', { pose: roll, limitsDeg: [-180, 180] });
arm.mate('jaw', 'hand.jaw', 'jaw.in', 'revolute', { pose: jaw, limitsDeg: [-11, 110] });
arm.mate('jaw-horn-bolts', 'jaw.horn', 'jaw-horn.mount', 'fastened');

servo(base, 'base', 'base-servo', [0, -32.7, 46.5], [25, 46, 40], null);
servo(shoulder, 'shoulder', 'shoulder-servo', [0, 90, 30.6], [40, 46, 25], shoulderPan);
servo(upper, 'upper-arm', 'upper-servo', [0, 112.6, 15.5], [40, 25, 46], shoulderLift);
servo(lower, 'lower-arm', 'lower-servo', [0, 5.2, 122.4], [40, 25, 46], elbowFlex);
servo(wristLink, 'wrist', 'wrist-servo', [-12.5, -42.8, 0], [46, 40, 25], wristFlex);
servo(hand, 'hand', 'hand-servo', [-7.7, -24.4, 0.5], [46, 25, 40], wristRoll);

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
    ['jaw', 'jaw-horn'],
    ['base', 'base-servo'],
    ['shoulder', 'shoulder-servo'],
    ['upper-arm', 'upper-servo'],
    ['lower-arm', 'lower-servo'],
    ['wrist', 'wrist-servo'],
    ['hand', 'hand-servo'],
  ],
});
