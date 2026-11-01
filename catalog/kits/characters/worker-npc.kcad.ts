// Original kernelCAD low-poly construction worker: a faceted figure in a
// hard hat, hi-vis vest with reflective bands, work trousers, gloves and
// boots, optionally carrying a shovel, rigged at the neck, waist, shoulders,
// elbows, hips and knees. Each joint connector sits at the same point on both
// links, so pose 0 is the as-built standing pose.
// Millimetres, Z up, feet on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'worker-npc',
  license: 'CC0-1.0',
  title: 'Construction worker',
  description: 'Construction worker NPC in a hard hat, hi-vis vest with reflective bands, work trousers and boots, optionally carrying a shovel, with neck, waist, shoulder, elbow, hip and knee pivots rigged as GLB nodes. Knobs: tool, height, skin, hat, vest, shirt, reflective band, trouser and boot colours.',
  tags: ['worker', 'construction', 'builder', 'hard hat', 'hi-vis', 'person', 'human', 'npc', 'humanoid', 'character', 'city', 'rigged'],
  kit: 'characters',
  category: 'character',
  origin: 'base',
  compat: ['character', 'city', 'street', 'construction', 'placeholder'],
  triangleBudget: 800,
});

const tool = param('tool', 'shovel', { choices: ['shovel', 'none'], label: 'Tool' });
const height = param('height', '1.80m', { choices: ['1.65m', '1.80m', '1.95m'], label: 'Height' });
const skin = param('skin', '#c68a5e', { label: 'Skin' });
const hat = param('hat', '#f2c219', { label: 'Hard hat' });
const vest = param('vest', '#ff7a1a', { label: 'Vest' });
const shirt = param('shirt', '#3e5a7a', { label: 'Shirt' });
const reflect = param('reflect', '#dfe3e6', { label: 'Reflective bands' });
const trousers = param('trousers', '#4a4a44', { label: 'Trousers and gloves' });
const boots = param('boots', '#5a3a22', { label: 'Boots and tool handle' });

presets({
  site: { hat: '#f4f4f0', vest: '#c8e83a', shirt: '#2e3036' },
  road: { hat: '#ff7a1a', vest: '#ff7a1a', shirt: '#f2f2ee' },
  rail: { hat: '#2f6fd8', vest: '#f2e01a', skin: '#7a5034' },
});

const s = Number(height.value.replace('m', '')) / 1.8;
const r = assembly('worker-npc');
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
// Chamfered-rectangle ring, w wide (X) and h tall, centred at (0, dz); mm, unscaled.
const ring = (w: number, h: number, dz: number) => {
  const a = (w / 2) * s;
  const b = (h / 2) * s;
  const c = Math.min(w, h) * 0.25 * s;
  const z = dz * s;
  return path().moveTo(-a + c, z - b).lineTo(a - c, z - b).lineTo(a, z - b + c).lineTo(a, z + b - c)
    .lineTo(a - c, z + b).lineTo(-a + c, z + b).lineTo(-a, z + b - c).lineTo(-a, z - b + c).close();
};
// Sweep rings toward -Y from (x, y0, z0); stations are [distance, w, h, dz].
const sweepY = (x: number, y0: number, z0: number, st: [number, number, number, number][]) =>
  ring(st[0][1], st[0][2], st[0][3]).loft(st.slice(1).map(([, w, hh, dz]) => ring(w, hh, dz)), {
    planes: st.map(([d]) => ({ plane: 'XY' as const, origin: [0, 0, d * s] as [number, number, number] })),
    ruled: true,
  }).rotateX(90).translate(x * s, y0 * s, z0 * s);
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
// Side-profile prism: points are (y, z), thickness t starting at x0.
const side = (pts: [number, number][], t: number, x0 = -t / 2) =>
  extrudePolygon(pts.map(([y, z]) => [y * s, z * s] as [number, number]), t * s).rotateX(90).rotateZ(90).translate(x0 * s, 0, 0);
// Faceted stack of rings [radius, z] with n sides.
const ngon = (rad: number, n: number, rot = 0) => {
  let p = path().moveTo(rad * s * Math.cos(rot), rad * s * Math.sin(rot));
  for (let i = 1; i < n; i++) {
    const a = rot + (2 * Math.PI * i) / n;
    p = p.lineTo(rad * s * Math.cos(a), rad * s * Math.sin(a));
  }
  return p.close();
};
const stack = (rings: [number, number][], n: number) =>
  ngon(rings[0][0], n, Math.PI / n).loft(rings.slice(1).map(([rr]) => ngon(rr, n, Math.PI / n)), {
    planes: rings.map(([, z]) => ({ plane: 'XY' as const, origin: [0, 0, z * s] as [number, number, number] })),
    ruled: true,
  });
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

add('pelvis', seg(0, hipZ - 70, waistZ + 20, 160, 150, 8).scale([1, 0.7, 1]).color(trousers));
add('chest', seg(0, waistZ, shoulderZ, 150, 195, 8).scale([1, 0.62, 1]).union(seg(0, shoulderZ - 20, neckZ + 10, 60, 55)).color(shirt));
add('vest', seg(0, waistZ + 20, shoulderZ - 20, 162, 200, 8).scale([1, 0.66, 1]).color(vest));
fix('chest', 'vest', at(0, 0, waistZ + 200));
for (const [i, z] of [[1, waistZ + 90], [2, waistZ + 200]]) {
  add(`band-${i}`, seg(0, z, z + 35, 172, 178, 8).scale([1, 0.68, 1]).color(reflect));
  fix('vest', `band-${i}`, at(0, 0, z + 17));
}
hinge('pelvis', 'chest', 'waist', at(0, 0, waistZ), [1, 0, 0], [-25, 45]);

// Head with nose, eyes and hard hat (dome plus brim); turns about Z.
add('head', seg(0, neckZ, neckZ + 230, 95, 90).union(blk(-18, -110, neckZ + 90, 18, -80, neckZ + 140)).color(skin));
for (const sd of [-1, 1]) {
  add(`${sd < 0 ? 'left' : 'right'}-eye`, blk(sd * 38 - 12, -95, neckZ + 145, sd * 38 + 12, -82, neckZ + 165).color(boots));
  fix('head', `${sd < 0 ? 'left' : 'right'}-eye`, at(sd * 38, -88, neckZ + 155));
}
add('hard-hat', seg(0, neckZ + 190, neckZ + 230, 135, 130, 8).union(seg(0, neckZ + 225, neckZ + 320, 112, 70, 8))
  .union(blk(-14, -100, neckZ + 225, 14, 100, neckZ + 330)).color(hat));
fix('head', 'hard-hat', at(0, 0, neckZ + 230));
hinge('chest', 'head', 'neck', at(0, 0, neckZ), [0, 0, 1], [-70, 70]);

for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  const ax = sd * shoulderX;
  add(`${nm}-upper-arm`, seg(ax, elbowZ, shoulderZ + 10, 46, 56).color(shirt));
  add(`${nm}-forearm`, seg(ax, wristZ, elbowZ, 38, 46).color(skin));
  add(`${nm}-glove`, blk(ax - 40, -45, wristZ - 150, ax + 40, 45, wristZ + 10).color(trousers));
  fix(`${nm}-forearm`, `${nm}-glove`, at(ax, 0, wristZ - 60));
  hinge('chest', `${nm}-upper-arm`, `${nm}-shoulder`, at(ax, 0, shoulderZ - 30), [1, 0, 0], [-170, 60]);
  hinge(`${nm}-upper-arm`, `${nm}-forearm`, `${nm}-elbow`, at(ax, 0, elbowZ), [1, 0, 0], [-140, 0]);

  const lx = sd * hipX;
  add(`${nm}-thigh`, seg(lx, kneeZ, hipZ, 60, 78).color(trousers));
  add(`${nm}-shin`, seg(lx, ankleZ + 40, kneeZ, 50, 60).color(trousers));
  add(`${nm}-boot`, blk(lx - 60, -170, 0, lx + 60, 70, ankleZ + 60).color(boots));
  fix(`${nm}-shin`, `${nm}-boot`, at(lx, 0, ankleZ));
  hinge('pelvis', `${nm}-thigh`, `${nm}-hip`, at(lx, 0, hipZ), [1, 0, 0], [-100, 45]);
  hinge(`${nm}-thigh`, `${nm}-shin`, `${nm}-knee`, at(lx, 0, kneeZ), [1, 0, 0], [0, 130]);
}

// Shovel held upright in the right glove, blade down by the foot.
if (tool.value === 'shovel') {
  const hx = shoulderX;
  add('shovel', rod([hx, -60, 120], [hx, -60, 1150], 34, 30).union(blk(hx - 70, -75, 1120, hx + 70, -45, 1160)).color(boots));
  add('shovel-blade', extrudePolygon([[-110 * s, 0], [110 * s, 0], [110 * s, -230 * s], [0, -300 * s], [-110 * s, -230 * s]], 14 * s)
    .rotateX(90).translate(hx * s, -53 * s, 410 * s).color(hat));
  fix('right-glove', 'shovel', at(hx, -60, wristZ - 60));
  fix('shovel', 'shovel-blade', at(hx, -60, 300));
}

return r.model();
