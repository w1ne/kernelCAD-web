// The kernelcad.com hero. Link and motor meshes are the Apache-2.0 SO-ARM100
// simulation visuals. Every mesh is placed where so100.urdf puts it with all
// joints at zero, so the six params are the URDF joint angles and the mate
// chain reaches without re-importing the meshes on every frame.

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
type Mat3 = [Vec3, Vec3, Vec3];
type Frame = { rot: Mat3; at: Vec3 };
type Shape = { rotate: (axis: Vec3, deg: number) => Shape; translate: (x: number, y: number, z: number) => Shape };

const RAD = 180 / Math.PI;
const WORLD: Frame = { rot: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], at: [0, 0, 0] };

function mul(a: Mat3, b: Mat3): Mat3 {
  const cell = (r: number, c: number) => a[r][0] * b[0][c] + a[r][1] * b[1][c] + a[r][2] * b[2][c];
  return [0, 1, 2].map((r) => [cell(r, 0), cell(r, 1), cell(r, 2)]) as Mat3;
}

function turn(m: Mat3, v: Vec3): Vec3 {
  return m.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]) as Vec3;
}

function about(axis: 0 | 1 | 2, deg: number): Mat3 {
  const c = Math.cos(deg / RAD);
  const s = Math.sin(deg / RAD);
  if (axis === 0) return [[1, 0, 0], [0, c, -s], [0, s, c]];
  if (axis === 1) return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
  return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
}

// URDF rpy: roll about X, then pitch about Y, then yaw about Z.
function rpyMatrix(rpy: Vec3): Mat3 {
  return mul(about(2, rpy[2]), mul(about(1, rpy[1]), about(0, rpy[0])));
}

function toWorld(frame: Frame, v: Vec3): Vec3 {
  const r = turn(frame.rot, v);
  return [frame.at[0] + r[0], frame.at[1] + r[1], frame.at[2] + r[2]];
}

// One rotation that equals the frame's matrix, for shape.rotate().
function axisAngle(m: Mat3): { axis: Vec3; deg: number } {
  const cos = Math.min(1, Math.max(-1, (m[0][0] + m[1][1] + m[2][2] - 1) / 2));
  const angle = Math.acos(cos);
  if (angle < 1e-9) return { axis: [0, 0, 1], deg: 0 };
  let axis: Vec3 = [m[2][1] - m[1][2], m[0][2] - m[2][0], m[1][0] - m[0][1]];
  if (Math.PI - angle < 1e-6) {
    // Half turn: the difference above vanishes, read the axis off the diagonal.
    const x = Math.sqrt(Math.max(0, (m[0][0] + 1) / 2));
    const y = Math.sqrt(Math.max(0, (m[1][1] + 1) / 2));
    const z = Math.sqrt(Math.max(0, (m[2][2] + 1) / 2));
    axis = x >= y && x >= z
      ? [x, m[0][1] / (2 * x), m[0][2] / (2 * x)]
      : y >= z ? [m[0][1] / (2 * y), y, m[1][2] / (2 * y)] : [m[0][2] / (2 * z), m[1][2] / (2 * z), z];
  }
  const len = Math.hypot(axis[0], axis[1], axis[2]);
  return { axis: [axis[0] / len, axis[1] / len, axis[2] / len], deg: angle * RAD };
}

function place<T extends Shape>(shape: T, frame: Frame): T {
  const { axis, deg } = axisAngle(frame.rot);
  const turned = deg === 0 ? shape : shape.rotate(axis, deg);
  return turned.translate(frame.at[0], frame.at[1], frame.at[2]) as T;
}

// so100.urdf, in millimetres and degrees. `xyz`/`rpy` are the joint origin
// in the parent link frame, `axis` is in the child link frame. `shaftTip`
// (the motor's output spline, where the child link bolts on) and
// `motorCenter` are read off the parent link's *_Motor.stl, parent frame.
type Joint = {
  name: string;
  parent: string;
  child: string;
  mesh: string;
  xyz: Vec3;
  rpy: Vec3;
  axis: Vec3;
  motor: string;
  servo: string;
  shaftTip: Vec3;
  motorCenter: Vec3;
  q: ReturnType<typeof param>;
  limitsDeg: [number, number];
};

const joints: Joint[] = [
  {
    name: 'pan', parent: 'base', child: 'shoulder', mesh: 'Rotation_Pitch',
    xyz: [0, -45.2, 16.5], rpy: [90, 0, 0], axis: [0, 1, 0],
    motor: 'Base_Motor', servo: 'base-servo', shaftTip: [0, -45.2, 66.3], motorCenter: [0, -32.7, 46.5],
    q: pan, limitsDeg: [-110, 110],
  },
  {
    name: 'lift', parent: 'shoulder', child: 'upper-arm', mesh: 'Upper_Arm',
    xyz: [0, 102.5, 30.6], rpy: [-1.8 * RAD, 0, 0], axis: [1, 0, 0],
    motor: 'Rotation_Pitch_Motor', servo: 'shoulder-servo', shaftTip: [-19.8, 102.5, 30.6], motorCenter: [0, 90, 30.6],
    q: lift, limitsDeg: [0, 200],
  },
  {
    name: 'elbow', parent: 'upper-arm', child: 'lower-arm', mesh: 'Lower_Arm',
    xyz: [0, 112.57, 28], rpy: [90, 0, 0], axis: [1, 0, 0],
    motor: 'Upper_Arm_Motor', servo: 'upper-servo', shaftTip: [-19.8, 112.57, 28], motorCenter: [0, 112.57, 15.5],
    q: elbow, limitsDeg: [-180, 0],
  },
  {
    name: 'wrist', parent: 'lower-arm', child: 'wrist', mesh: 'Wrist_Pitch_Roll',
    xyz: [0, 5.2, 134.9], rpy: [-1 * RAD, 0, 0], axis: [1, 0, 0],
    motor: 'Lower_Arm_Motor', servo: 'lower-servo', shaftTip: [-19.8, 5.2, 134.9], motorCenter: [0, 5.2, 122.4],
    q: wrist, limitsDeg: [-140, 65],
  },
  {
    name: 'roll', parent: 'wrist', child: 'hand', mesh: 'Fixed_Jaw',
    xyz: [0, -60.1, 0], rpy: [0, 90, 0], axis: [0, 1, 0],
    motor: 'Wrist_Pitch_Roll_Motor', servo: 'wrist-servo', shaftTip: [0, -62.6, 0], motorCenter: [-12.5, -42.8, 0],
    q: roll, limitsDeg: [-180, 180],
  },
  {
    name: 'jaw', parent: 'hand', child: 'jaw', mesh: 'Moving_Jaw',
    xyz: [-20.2, -24.4, 0], rpy: [0, 180, 0], axis: [0, 0, 1],
    motor: 'Fixed_Jaw_Motor', servo: 'hand-servo', shaftTip: [-20.2, -24.4, 20.3], motorCenter: [-7.7, -24.4, 0.5],
    q: jaw, limitsDeg: [-11, 110],
  },
];

const arm = assembly('so100-arm');
const frames: Record<string, Frame> = { base: WORLD };

async function mesh(file: string, frame: Frame, allowOpen: boolean) {
  const raw = await lib.fromSTL(`parts/sim/${file}.stl`, allowOpen ? { allowOpen: true } : {});
  return place(raw.scale(1000), frame);
}

// Links first, so the base is the grounded part.
const links: Record<string, ReturnType<typeof arm.part>> = {
  base: arm.part('base', (await mesh('Base', WORLD, true)).color(PRINT)),
};
for (const joint of joints) {
  const parent = frames[joint.parent];
  const frame: Frame = { rot: mul(parent.rot, rpyMatrix(joint.rpy)), at: toWorld(parent, joint.xyz) };
  frames[joint.child] = frame;
  links[joint.child] = arm.part(joint.child, (await mesh(joint.mesh, frame, true)).color(PRINT));
}

// Each motor is bolted into its parent link and turns the child link on its
// output shaft: link -> motor is fastened, motor shaft -> child is the joint.
const skipClash: [string, string][] = [];
for (const joint of joints) {
  const parent = frames[joint.parent];
  const servoName = joint.servo;
  const servo = arm.part(servoName, (await mesh(joint.motor, parent, false)).color('servo'));

  const seat = { kind: 'vec3' as const, value: toWorld(parent, joint.motorCenter) };
  links[joint.parent].connector('servo', { type: 'frame', origin: seat });
  servo.connector('mount', { type: 'frame', origin: seat });
  arm.mate(`${servoName}-fix`, `${joint.parent}.servo`, `${servoName}.mount`, 'fastened');

  const shaft = {
    type: 'axis' as const,
    origin: { kind: 'vec3' as const, value: toWorld(parent, joint.shaftTip) },
    axis: turn(frames[joint.child].rot, joint.axis),
  };
  servo.connector('shaft', shaft);
  links[joint.child].connector('in', shaft);
  arm.mate(joint.name, `${servoName}.shaft`, `${joint.child}.in`, 'revolute', { pose: joint.q, limitsDeg: joint.limitsDeg });

  skipClash.push([joint.parent, joint.child], [joint.parent, servoName], [servoName, joint.child]);
}

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
      { atMs: 0, value: 70 },
      { atMs: 2500, value: 105, ease: 'easeInOut' },
      { atMs: 5200, value: 80, ease: 'easeInOut' },
      { atMs: 8000, value: 70, ease: 'easeInOut' },
    ] },
    { param: 'elbowDeg', keys: [
      { atMs: 0, value: -70 },
      { atMs: 2500, value: -65, ease: 'easeInOut' },
      { atMs: 5200, value: -105, ease: 'easeInOut' },
      { atMs: 8000, value: -70, ease: 'easeInOut' },
    ] },
    { param: 'wristDeg', keys: [
      { atMs: 0, value: 10 },
      { atMs: 2500, value: -20, ease: 'easeInOut' },
      { atMs: 5200, value: 25, ease: 'easeInOut' },
      { atMs: 8000, value: 10, ease: 'easeInOut' },
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

return arm.solvedModel({}, { ignore: skipClash });
