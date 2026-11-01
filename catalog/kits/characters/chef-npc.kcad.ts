// Original kernelCAD low-poly chef: a faceted figure in a tall pleated toque,
// a double-breasted white jacket with buttons, a neckerchief, a long apron,
// checked-style trousers and clogs, optionally holding a frying pan, rigged
// at the neck, waist, shoulders, elbows, hips and knees. Each joint connector
// sits at the same point on both links, so pose 0 is the as-built pose.
// Millimetres, Z up, feet on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'chef-npc',
  license: 'CC0-1.0',
  title: 'Chef',
  description: 'Chef NPC in a tall toque, double-breasted jacket, neckerchief and long apron, optionally holding a frying pan, with neck, waist, shoulder, elbow, hip and knee pivots rigged as GLB nodes. Knobs: tool, height, skin, jacket, apron, neckerchief, trouser, button and clog colours.',
  tags: ['chef', 'cook', 'kitchen', 'restaurant', 'baker', 'person', 'human', 'npc', 'humanoid', 'character', 'rigged'],
  kit: 'characters',
  category: 'character',
  origin: 'base',
  compat: ['character', 'kitchen', 'interior', 'city', 'village', 'placeholder'],
  triangleBudget: 850,
});

const tool = param('tool', 'pan', { choices: ['pan', 'none'], label: 'Tool' });
const height = param('height', '1.75m', { choices: ['1.60m', '1.75m', '1.90m'], label: 'Height' });
const skin = param('skin', '#e0ac7e', { label: 'Skin' });
const jacket = param('jacket', '#f6f4ee', { label: 'Jacket and toque' });
const apron = param('apron', '#e8e4da', { label: 'Apron' });
const scarf = param('scarf', '#d8342c', { label: 'Neckerchief' });
const trousers = param('trousers', '#2e3036', { label: 'Trousers' });
const buttons = param('buttons', '#2a2a2e', { label: 'Buttons, eyes and pan' });
const clogs = param('clogs', '#1e1e20', { label: 'Clogs' });

presets({
  pastry: { apron: '#f4c6d0', scarf: '#f4c6d0', trousers: '#f6f4ee' },
  head: { jacket: '#24262a', apron: '#24262a', scarf: '#d9a62a', buttons: '#d9a62a' },
  sushi: { apron: '#2f4f7a', scarf: '#2f4f7a', skin: '#d9a77a' },
});

const s = Number(height.value.replace('m', '')) / 1.8;
const r = assembly('chef-npc');
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

const ankleZ = 100;
const kneeZ = 500;
const hipZ = 900;
const waistZ = 1060;
const shoulderZ = 1420;
const neckZ = 1480;
const elbowZ = 1140;
const wristZ = 880;
const hipX = 100;
const shoulderX = 215;

add('pelvis', seg(0, hipZ - 70, waistZ + 20, 160, 155, 8).scale([1, 0.7, 1]).color(trousers));
add('chest', seg(0, waistZ - 40, shoulderZ, 168, 198, 8).scale([1, 0.66, 1]).union(seg(0, shoulderZ - 20, neckZ + 10, 60, 55)).color(jacket));
for (const [i, z] of [[1, waistZ + 80], [2, waistZ + 170], [3, waistZ + 260]]) {
  for (const sd of [-1, 1]) {
    const id = `button-${i}-${sd < 0 ? 'l' : 'r'}`;
    add(id, blk(sd * 60 - 14, -128, z - 14, sd * 60 + 14, -118, z + 14).color(buttons));
    fix('chest', id, at(sd * 60, -122, z));
  }
}
add('neckerchief', seg(0, shoulderZ - 30, shoulderZ + 30, 80, 76, 8).union(blk(-40, -100, shoulderZ - 110, 40, -60, shoulderZ)).color(scarf));
fix('chest', 'neckerchief', at(0, 0, shoulderZ));
hinge('pelvis', 'chest', 'waist', at(0, 0, waistZ), [1, 0, 0], [-25, 45]);
add('apron', blk(-150, -132, 520, 150, -112, waistZ + 40).union(blk(-165, -125, waistZ - 10, 165, 115, waistZ + 30)).color(apron));
fix('pelvis', 'apron', at(0, -120, waistZ));

// Head with nose and eyes under a tall pleated toque; turns about Z.
add('head', seg(0, neckZ, neckZ + 230, 95, 90).union(blk(-18, -110, neckZ + 90, 18, -80, neckZ + 140)).color(skin));
for (const sd of [-1, 1]) {
  add(`${sd < 0 ? 'left' : 'right'}-eye`, blk(sd * 38 - 12, -95, neckZ + 145, sd * 38 + 12, -82, neckZ + 165).color(buttons));
  fix('head', `${sd < 0 ? 'left' : 'right'}-eye`, at(sd * 38, -88, neckZ + 155));
}
add('toque', seg(0, neckZ + 190, neckZ + 260, 100, 100, 8).union(seg(0, neckZ + 255, neckZ + 380, 112, 135, 8))
  .union(seg(0, neckZ + 375, neckZ + 440, 135, 90, 8)).color(jacket));
fix('head', 'toque', at(0, 0, neckZ + 240));
hinge('chest', 'head', 'neck', at(0, 0, neckZ), [0, 0, 1], [-70, 70]);

for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  const ax = sd * shoulderX;
  add(`${nm}-upper-arm`, seg(ax, elbowZ, shoulderZ + 10, 48, 58).color(jacket));
  add(`${nm}-forearm`, seg(ax, wristZ, elbowZ, 40, 48).union(blk(ax - 38, -42, wristZ - 140, ax + 38, 42, wristZ + 10)).color(skin));
  hinge('chest', `${nm}-upper-arm`, `${nm}-shoulder`, at(ax, 0, shoulderZ - 30), [1, 0, 0], [-170, 60]);
  hinge(`${nm}-upper-arm`, `${nm}-forearm`, `${nm}-elbow`, at(ax, 0, elbowZ), [1, 0, 0], [-140, 0]);

  const lx = sd * hipX;
  add(`${nm}-thigh`, seg(lx, kneeZ, hipZ, 60, 78).color(trousers));
  add(`${nm}-shin`, seg(lx, ankleZ + 40, kneeZ, 52, 60).color(trousers));
  add(`${nm}-clog`, blk(lx - 62, -160, 0, lx + 62, 70, ankleZ + 50).color(clogs));
  fix(`${nm}-shin`, `${nm}-clog`, at(lx, 0, ankleZ));
  hinge('pelvis', `${nm}-thigh`, `${nm}-hip`, at(lx, 0, hipZ), [1, 0, 0], [-100, 45]);
  hinge(`${nm}-thigh`, `${nm}-shin`, `${nm}-knee`, at(lx, 0, kneeZ), [1, 0, 0], [0, 130]);
}

// Frying pan held out in the right hand: handle forward, pan beyond.
if (tool.value === 'pan') {
  const hx = shoulderX;
  add('pan', rod([hx, 0, wristZ - 70], [hx, -300, wristZ - 80], 34, 30)
    .union(ngon(150, 8, Math.PI / 8).extrude(40 * s).translate(hx * s, -400 * s, (wristZ - 95) * s))
    .color(buttons));
  fix('right-forearm', 'pan', at(hx, 0, wristZ - 70));
}

return r.model();
