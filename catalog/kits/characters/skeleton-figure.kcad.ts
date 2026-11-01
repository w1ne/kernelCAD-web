// Original kernelCAD low-poly skeleton: a faceted skull with dark sockets and
// a hinged jaw, a ribcage of hollow rib rings on a spine, a pelvis block and
// thin bone limbs with knobbly joints, rigged at the neck, jaw, waist,
// shoulders, elbows, hips and knees. Each joint connector sits at the same
// point on both links, so pose 0 is the as-built standing pose.
// Millimetres, Z up, feet on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'skeleton-figure',
  license: 'CC0-1.0',
  title: 'Skeleton',
  description: 'Spooky low-poly skeleton with a skull and hinged jaw, hollow ribcage, spine and thin bone limbs, with neck, jaw, waist, shoulder, elbow, hip and knee pivots rigged as GLB nodes. Knobs: height, hat, bone, socket and hat colours.',
  tags: ['skeleton', 'skull', 'bones', 'undead', 'halloween', 'spooky', 'enemy', 'fantasy', 'dungeon', 'humanoid', 'character', 'npc', 'rigged'],
  kit: 'characters',
  category: 'character',
  origin: 'base',
  compat: ['character', 'fantasy', 'dungeon', 'halloween', 'night'],
  triangleBudget: 900,
});

const height = param('height', '1.75m', { choices: ['1.20m', '1.75m', '2.20m'], label: 'Height' });
const hatStyle = param('hatStyle', 'none', { choices: ['none', 'helmet'], label: 'Hat' });
const bone = param('bone', '#ece4cf', { label: 'Bone' });
const socket = param('socket', '#1e1a1a', { label: 'Eye sockets' });
const hat = param('hat', '#7a7f86', { label: 'Helmet' });

presets({
  warrior: { hatStyle: 'helmet' },
  cursed: { bone: '#b8c8a0', socket: '#5aff6a' },
  obsidian: { bone: '#3a3840', socket: '#ff5a2a', hat: '#8a6a3a' },
});

const s = Number(height.value.replace('m', '')) / 1.75;
const r = assembly('skeleton-figure');
const refs: Record<string, ReturnType<typeof r.part>> = {};
const add = (name: string, shape: Shape) => { refs[name] = r.part(name, shape); };
const at = (x: number, y: number, z: number) => ({ kind: 'vec3' as const, value: [x * s, y * s, z * s] as [number, number, number] });
const hinge = (parent: string, child: string, name: string, o: { kind: 'vec3'; value: [number, number, number] }, axis: [number, number, number], limitsDeg: [number, number]) => {
  refs[parent].connector(name, { type: 'axis', origin: o, axis });
  refs[child].connector(name, { type: 'axis', origin: o, axis });
  r.mate(name, `${parent}.${name}`, `${child}.${name}`, 'revolute', { pose: 0, limitsDeg });
};
const fix = (parent: string, child: string, o: { kind: 'vec3'; value: [number, number, number] }) => {
  refs[parent].connector(child, { type: 'frame', origin: o });
  refs[child].connector(child, { type: 'frame', origin: o });
  r.mate(child, `${parent}.${child}`, `${child}.${child}`, 'fastened');
};
// Square rod from p0 to p1, w0 to w1 thick.
const rod = (p0: [number, number, number], p1: [number, number, number], w0: number, w1: number) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const sq = (w: number) => path().moveTo(-w * s / 2, -w * s / 2).lineTo(w * s / 2, -w * s / 2).lineTo(w * s / 2, w * s / 2).lineTo(-w * s / 2, w * s / 2).close();
  return sq(w0).loft(sq(w1), { spacing: len * s, ruled: true })
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0] * s, p0[1] * s, p0[2] * s);
};
// Corner-to-corner box.
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box((x1 - x0) * s, (y1 - y0) * s, (z1 - z0) * s).translate(x0 * s, y0 * s, z0 * s);
// Faceted stack of rings [radius, z] with n sides.
const ngon = (rad: number, n: number, rot = 0) => {
  let p = path().moveTo(rad * s * Math.cos(rot), rad * s * Math.sin(rot));
  for (let i = 1; i < n; i++) {
    const a = rot + (2 * Math.PI * i) / n;
    p = p.lineTo(rad * s * Math.cos(a), rad * s * Math.sin(a));
  }
  return p.close();
};
const seg = (x: number, z0: number, z1: number, r0: number, r1: number, n = 6) =>
  ngon(r0, n, Math.PI / n).loft(ngon(r1, n, Math.PI / n), { spacing: (z1 - z0) * s, ruled: true }).translate(x * s, 0, z0 * s);
// Thin bone from p0 to p1 with a knob at each end.
const boneRod = (x: number, z0: number, z1: number, w: number) =>
  rod([x, 0, z0 + 20], [x, 0, z1], w, w).union(blk(x - w, -w, z0, x + w, w, z0 + 40));

const ankleZ = 90;
const kneeZ = 490;
const hipZ = 880;
const waistZ = 1060;
const shoulderZ = 1410;
const neckZ = 1470;
const elbowZ = 1130;
const wristZ = 870;
const hipX = 95;
const shoulderX = 200;

add('pelvis', extrudePolygon([[-150 * s, 0], [150 * s, 0], [110 * s, -150 * s], [-110 * s, -150 * s]], 120 * s)
  .rotateX(90).translate(0, 60 * s, (hipZ + 90) * s).union(rod([0, 30, hipZ + 60], [0, 30, waistZ + 20], 44, 44)).color(bone));

// Ribcage: hollow rib rings joined by a spine at the back and a sternum.
let chest = rod([0, 30, waistZ - 20], [0, 30, neckZ + 10], 40, 36)
  .union(blk(-20, -110, waistZ + 140, 20, -80, shoulderZ - 30))
  .union(blk(-shoulderX - 30, -30, shoulderZ - 50, shoulderX + 30, 30, shoulderZ));
for (const [i, z] of [[0, waistZ + 140], [1, waistZ + 210], [2, waistZ + 280]]) {
  const rr = 165 - 10 * (2 - i);
  chest = chest.union(ngon(rr, 6).extrude(28 * s).subtract(ngon(rr - 22, 6).extrude(40 * s).translate(0, 0, -6 * s))
    .scale([1, 0.62, 1]).translate(0, -5 * s, z * s));
}
add('chest', chest.color(bone));
hinge('pelvis', 'chest', 'waist', at(0, 30, waistZ), [1, 0, 0], [-30, 45]);

// Skull with sockets, nose hole and hinged jaw; turns about Z.
add('head', seg(0, neckZ + 60, neckZ + 270, 100, 95, 8).scale([0.95, 1, 1]).union(rod([0, 20, neckZ - 10], [0, 10, neckZ + 80], 36, 36)).color(bone));
for (const sd of [-1, 1]) {
  add(`${sd < 0 ? 'left' : 'right'}-socket`, blk(sd * 42 - 26, -100, neckZ + 150, sd * 42 + 26, -86, neckZ + 200).color(socket));
  fix('head', `${sd < 0 ? 'left' : 'right'}-socket`, at(sd * 42, -94, neckZ + 175));
}
add('nose-hole', blk(-12, -100, neckZ + 110, 12, -87, neckZ + 140).color(socket));
fix('head', 'nose-hole', at(0, -94, neckZ + 125));
add('jaw', blk(-75, -95, neckZ + 25, 75, 20, neckZ + 70).union(blk(-60, -97, neckZ + 60, 60, -85, neckZ + 90)).color(bone));
hinge('head', 'jaw', 'jaw-open', at(0, 10, neckZ + 70), [1, 0, 0], [-30, 0]);
if (hatStyle.value === 'helmet') {
  add('helmet', seg(0, neckZ + 210, neckZ + 300, 112, 100, 8).union(seg(0, neckZ + 295, neckZ + 340, 100, 50, 8))
    .union(blk(-12, -118, neckZ + 120, 12, -100, neckZ + 230)).color(hat));
  fix('head', 'helmet', at(0, 0, neckZ + 250));
}
hinge('chest', 'head', 'neck', at(0, 20, neckZ), [0, 0, 1], [-80, 80]);

for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  const ax = sd * shoulderX;
  add(`${nm}-upper-arm`, boneRod(ax, elbowZ, shoulderZ, 26).color(bone));
  add(`${nm}-forearm`, boneRod(ax, wristZ, elbowZ, 22).union(blk(ax - 18, -40, wristZ - 150, ax + 18, 40, wristZ + 10)).color(bone));
  hinge('chest', `${nm}-upper-arm`, `${nm}-shoulder`, at(ax, 0, shoulderZ - 25), [1, 0, 0], [-170, 60]);
  hinge(`${nm}-upper-arm`, `${nm}-forearm`, `${nm}-elbow`, at(ax, 0, elbowZ), [1, 0, 0], [-140, 0]);

  const lx = sd * hipX;
  add(`${nm}-thigh`, boneRod(lx, kneeZ, hipZ, 32).color(bone));
  add(`${nm}-shin`, boneRod(lx, ankleZ, kneeZ, 28).union(blk(lx - 40, -150, 0, lx + 40, 40, ankleZ)).color(bone));
  hinge('pelvis', `${nm}-thigh`, `${nm}-hip`, at(lx, 0, hipZ), [1, 0, 0], [-100, 45]);
  hinge(`${nm}-thigh`, `${nm}-shin`, `${nm}-knee`, at(lx, 0, kneeZ), [1, 0, 0], [0, 130]);
}

return r.model();
