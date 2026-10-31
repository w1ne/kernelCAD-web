// Original kernelCAD low-poly desktop robot arm: a turntable base, shoulder,
// elbow and wrist links on revolute mates and a two-finger gripper whose
// fingers slide on prismatic mates. Pose 0 is the as-built pose.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, reaches toward -Y.

meta({
  name: 'robot-arm',
  license: 'CC0-1.0',
  title: 'Robot arm',
  description: 'Desktop articulated robot arm with base yaw, shoulder, elbow and wrist pivots and a sliding two-finger gripper, rigged as GLB nodes. Knobs: reach, body, accent, joint and gripper colours.',
  tags: ['robot arm', 'robotic arm', 'manipulator', 'industrial robot', 'gripper', 'factory', 'lab', 'mech', 'rigged'],
  kit: 'characters',
  category: 'character',
  origin: 'base',
  compat: ['robot', 'sci-fi', 'industrial'],
  triangleBudget: 600,
});

const reach = param('reach', 'standard', { choices: ['compact', 'standard', 'long'], label: 'Reach' });
const body = param('body', '#f28c28', { label: 'Body' });
const accent = param('accent', '#2b2f33', { label: 'Accent' });
const joint = param('joint', '#9aa3ab', { label: 'Joints' });
const gripper = param('gripper', '#4a4f55', { label: 'Gripper' });

presets({
  lab: { body: '#eef0f2', accent: '#3b7dd8' },
  heavy: { body: '#f2c21b', accent: '#1b1d20', reach: 'long' },
});

const L = reach.value === 'compact' ? 0.75 : reach.value === 'long' ? 1.3 : 1;
const r = assembly('robot-arm');
const refs: Record<string, ReturnType<typeof r.part>> = {};
const add = (name: string, shape: Shape) => { refs[name] = r.part(name, shape); };
const at = (x: number, y: number, z: number) => ({ kind: 'vec3' as const, value: [x, y, z] as [number, number, number] });
const joinAxis = (parent: string, child: string, name: string, o: { kind: 'vec3'; value: [number, number, number] }, axis: [number, number, number], kind: 'revolute' | 'prismatic', limits: [number, number]) => {
  refs[parent].connector(name, { type: 'axis', origin: o, axis });
  refs[child].connector(name, { type: 'axis', origin: o, axis });
  r.mate(name, `${parent}.${name}`, `${child}.${name}`, kind, kind === 'revolute' ? { pose: 0, limitsDeg: limits } : { pose: 0, limitsMm: limits });
};

const baseH = 70;
const turretH = 90;
const shoulderZ = baseH + turretH;
const upper = 260 * L;
const fore = 220 * L;
const elbowZ = shoulderZ + upper;
const linkW = 60;

add('base', cylinder(baseH, 120).color(accent));
add('turret', cylinder(turretH - 20, 85).translate(0, 0, baseH)
  .union(box(140, 90, 60, true).translate(0, 0, shoulderZ - 10)).color(body));
joinAxis('base', 'turret', 'yaw', at(0, 0, baseH), [0, 0, 1], 'revolute', [-170, 170]);

// Upper arm stands straight up from the shoulder; forearm points forward (-Y).
add('upper-arm', box(linkW, linkW, upper, true).translate(0, 0, shoulderZ + upper / 2)
  .union(cylinder(linkW + 30, 42).rotateY(90).translate(-(linkW + 30) / 2, 0, shoulderZ))
  .union(cylinder(linkW + 10, 36).rotateY(90).translate(-(linkW + 10) / 2, 0, elbowZ)).color(body));
joinAxis('turret', 'upper-arm', 'shoulder', at(0, 0, shoulderZ), [1, 0, 0], 'revolute', [-90, 90]);

add('forearm', box(linkW - 10, fore, linkW - 10, true).translate(0, -fore / 2, elbowZ).color(body));
joinAxis('upper-arm', 'forearm', 'elbow', at(0, 0, elbowZ), [1, 0, 0], 'revolute', [-135, 135]);

const wristY = -fore;
add('wrist', box(70, 50, 70, true).translate(0, wristY - 25, elbowZ)
  .union(box(110, 20, 40, true).translate(0, wristY - 60, elbowZ)).color(joint));
joinAxis('forearm', 'wrist', 'wrist-pitch', at(0, wristY, elbowZ), [1, 0, 0], 'revolute', [-100, 100]);

// Fingers slide toward each other along X.
for (const side of [-1, 1]) {
  const name = `finger-${side < 0 ? 'l' : 'r'}`;
  add(name, box(14, 70, 30, true).translate(side * 40, wristY - 105, elbowZ).color(gripper));
  joinAxis('wrist', name, `${name}-slide`, at(side * 40, wristY - 70, elbowZ), [-side, 0, 0], 'prismatic', [0, 28]);
}
add('base-ring', cylinder(15, 125).translate(0, 0, baseH - 35).color(body));
refs.base.connector('ring', { type: 'frame', origin: at(0, 0, baseH - 35) });
refs['base-ring'].connector('ring', { type: 'frame', origin: at(0, 0, baseH - 35) });
r.mate('base-ring', 'base.ring', 'base-ring.ring', 'fastened');

return r.model();
