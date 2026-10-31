// Original kernelCAD low-poly posable mannequin, the jointed wooden figure
// artists pose for reference: octagonal limb segments and blocky hands and
// feet joined by revolute mates at neck, waist, shoulders, elbows, wrists,
// hips, knees and ankles. Pose 0 is the as-built standing pose.
// Millimetres, Z up, feet on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'mannequin',
  license: 'CC0-1.0',
  title: 'Posable mannequin',
  description: 'Life-size jointed wooden mannequin with neck, waist, shoulder, elbow, wrist, hip, knee and ankle pivots rigged as GLB nodes, ready to pose. Knobs: height, wood and joint colours.',
  tags: ['mannequin', 'figure', 'posable', 'artist', 'dummy', 'humanoid', 'character', 'npc', 'placeholder', 'rigged'],
  kit: 'characters',
  category: 'character',
  origin: 'base',
  compat: ['character', 'interior', 'placeholder'],
  triangleBudget: 900,
});

const height = param('height', '1.75m', { choices: ['1.55m', '1.75m', '1.95m'], label: 'Height' });
const wood = param('wood', '#d9b483', { label: 'Wood' });
const joint = param('joint', '#a7814f', { label: 'Joints' });

presets({
  dark: { wood: '#6b4a2e', joint: '#3e2a1a' },
  white: { wood: '#eceae4', joint: '#b9b6ae' },
});

const h = Number(height.value.replace('m', '')) / 1.75;
const r = assembly('mannequin');
const refs: Record<string, ReturnType<typeof r.part>> = {};
const add = (name: string, shape: Shape) => { refs[name] = r.part(name, shape); };
const at = (x: number, y: number, z: number) => ({ kind: 'vec3' as const, value: [x, y, z] as [number, number, number] });
const hinge = (parent: string, child: string, name: string, o: { kind: 'vec3'; value: [number, number, number] }, axis: [number, number, number], limitsDeg: [number, number]) => {
  refs[parent].connector(name, { type: 'axis', origin: o, axis });
  refs[child].connector(name, { type: 'axis', origin: o, axis });
  r.mate(name, `${parent}.${name}`, `${child}.${name}`, 'revolute', { pose: 0, limitsDeg });
};
// Octagonal segment from z0 up to z1, tapering from radius r0 to r1.
const oct = (rad: number) => {
  let p = path().moveTo(rad * Math.cos(Math.PI / 8), rad * Math.sin(Math.PI / 8));
  for (let i = 1; i < 8; i++) {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    p = p.lineTo(rad * Math.cos(a), rad * Math.sin(a));
  }
  return p.close();
};
const seg = (x: number, z0: number, z1: number, r0: number, r1: number) =>
  oct(r0).loft(oct(r1), { spacing: z1 - z0, ruled: true }).translate(x, 0, z0);

const ankleZ = 80 * h;
const kneeZ = 500 * h;
const hipZ = 900 * h;
const waistZ = 1080 * h;
const shoulderZ = 1420 * h;
const neckZ = 1480 * h;
const elbowZ = 1130 * h;
const wristZ = 860 * h;
const hipX = 95 * h;
const shoulderX = 200 * h;

add('pelvis', oct(150 * h).loft(oct(130 * h), { spacing: waistZ - hipZ + 40 * h, ruled: true }).translate(0, 0, hipZ - 40 * h).scale([1, 0.65, 1]).color(wood));
add('chest', oct(130 * h).loft(oct(185 * h), { spacing: shoulderZ - waistZ, ruled: true }).translate(0, 0, waistZ).scale([1, 0.6, 1])
  .union(seg(0, shoulderZ - 10 * h, neckZ + 10 * h, 40 * h, 36 * h)).color(wood));
hinge('pelvis', 'chest', 'waist', at(0, 0, waistZ), [1, 0, 0], [-30, 60]);
add('head', seg(0, neckZ + 20 * h, neckZ + 250 * h, 95 * h, 80 * h).union(seg(0, neckZ, neckZ + 30 * h, 36 * h, 36 * h)).color(wood));
hinge('chest', 'head', 'neck', at(0, 0, neckZ), [0, 0, 1], [-80, 80]);

for (const side of [-1, 1]) {
  const s = side < 0 ? 'left' : 'right';
  const ax = side * shoulderX;
  add(`${s}-upper-arm`, seg(ax, elbowZ + 15 * h, shoulderZ - 20 * h, 38 * h, 48 * h).color(wood));
  add(`${s}-forearm`, seg(ax, wristZ + 15 * h, elbowZ - 15 * h, 30 * h, 38 * h)
    .union(seg(ax, elbowZ - 20 * h, elbowZ + 20 * h, 40 * h, 40 * h)).color(joint));
  add(`${s}-hand`, box(40 * h, 80 * h, 170 * h, true).translate(ax, 0, wristZ - 85 * h).color(wood));
  hinge('chest', `${s}-upper-arm`, `${s}-shoulder`, at(ax, 0, shoulderZ - 20 * h), [1, 0, 0], [-170, 60]);
  hinge(`${s}-upper-arm`, `${s}-forearm`, `${s}-elbow`, at(ax, 0, elbowZ), [1, 0, 0], [-145, 0]);
  hinge(`${s}-forearm`, `${s}-hand`, `${s}-wrist`, at(ax, 0, wristZ), [0, 1, 0], [-70, 70]);

  const lx = side * hipX;
  add(`${s}-thigh`, seg(lx, kneeZ + 15 * h, hipZ, 52 * h, 75 * h).color(wood));
  add(`${s}-shin`, seg(lx, ankleZ + 15 * h, kneeZ - 15 * h, 38 * h, 52 * h)
    .union(seg(lx, kneeZ - 22 * h, kneeZ + 22 * h, 55 * h, 55 * h)).color(joint));
  add(`${s}-foot`, box(90 * h, 250 * h, ankleZ, true).translate(lx, -60 * h, ankleZ / 2).color(wood));
  hinge('pelvis', `${s}-thigh`, `${s}-hip`, at(lx, 0, hipZ), [1, 0, 0], [-110, 45]);
  hinge(`${s}-thigh`, `${s}-shin`, `${s}-knee`, at(lx, 0, kneeZ), [1, 0, 0], [0, 140]);
  hinge(`${s}-shin`, `${s}-foot`, `${s}-ankle`, at(lx, 0, ankleZ), [1, 0, 0], [-40, 40]);
}

return r.model();
