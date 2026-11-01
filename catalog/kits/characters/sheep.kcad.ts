// Original kernelCAD low-poly sheep: a fluffy wool barrel with faceted wool
// lumps, a dark face with a wool cap, sideways ears, optional curled horns, a
// stubby tail and four thin two-link legs with hooves, rigged at the neck,
// ears, tail, hips and knees. Each joint connector sits at the same point on
// both links, so pose 0 is the as-built standing pose.
// Millimetres, Z up, hooves on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'sheep',
  license: 'CC0-1.0',
  title: 'Sheep',
  description: 'Fluffy low-poly sheep with lumpy wool, dark face, sideways ears, optional curled horns and stubby tail, with neck, ear, tail, hip and knee pivots rigged as GLB nodes. Knobs: size, horns, wool, face, horn and hoof colours.',
  tags: ['sheep', 'lamb', 'ram', 'ewe', 'wool', 'farm', 'animal', 'livestock', 'rigged', 'quadruped', 'cute'],
  kit: 'characters',
  category: 'animal',
  origin: 'base',
  compat: ['character', 'farm', 'village', 'meadow', 'outdoor'],
  triangleBudget: 750,
});

const size = param('size', 'adult', { choices: ['lamb', 'adult'], label: 'Size' });
const horns = param('horns', 'none', { choices: ['none', 'curled'], label: 'Horns' });
const wool = param('wool', '#f0ece2', { label: 'Wool' });
const face = param('face', '#2e2a28', { label: 'Face and legs' });
const horn = param('horn', '#d9c8a0', { label: 'Horns and eyes' });
const hoof = param('hoof', '#1c1a18', { label: 'Hooves' });

presets({
  black: { wool: '#3a3634', face: '#1e1c1a' },
  brown: { wool: '#a8805a', face: '#4a3424' },
  ram: { horns: 'curled' },
});

const s = size.value === 'lamb' ? 0.55 : 1;
const r = assembly('sheep');
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
// Four two-link legs with hooves/paws: hip and knee pivots per leg.
const legs = (o: { hipZ: number; kneeZ: number; xs: number; yf: number; yb: number; w0: number; w1: number; foot: [number, number, number]; coat: ReturnType<typeof param>; footColor: ReturnType<typeof param>; top: number }) => {
  for (const [end, y] of [['front', o.yf], ['back', o.yb]] as const) {
    for (const sd of [-1, 1]) {
      const nm = `${end}-${sd < 0 ? 'left' : 'right'}`;
      const x = sd * o.xs;
      add(`${nm}-thigh`, rod([x, y, o.top], [x, y, o.kneeZ - 15], o.w0, o.w1 * 1.1).color(o.coat));
      add(`${nm}-shin`, rod([x, y, o.kneeZ + 15], [x, y, o.foot[2] - 5], o.w1, o.w1 * 0.9).color(o.coat));
      add(`${nm}-foot`, blk(x - o.foot[0] / 2, y - o.foot[1] * 0.6, 0, x + o.foot[0] / 2, y + o.foot[1] * 0.4, o.foot[2]).color(o.footColor));
      hinge('body', `${nm}-thigh`, `${nm}-hip`, at(x, y, o.hipZ), [1, 0, 0], [-45, 45]);
      hinge(`${nm}-thigh`, `${nm}-shin`, `${nm}-knee`, at(x, y, o.kneeZ), [1, 0, 0], end === 'front' ? [0, 100] : [-100, 0]);
      fix(`${nm}-shin`, `${nm}-foot`, at(x, y, o.foot[2] / 2));
    }
  }
};

add('body', sweepY(0, 520, 560, [[0, 420, 420, 20], [120, 600, 560, 0], [860, 620, 580, 10], [1040, 480, 460, 30]]).color(wool));
for (const [i, x, y, rr] of [[1, 0, -250, 190], [2, -60, 120, 210], [3, 70, 330, 170]]) {
  add(`wool-${i}`, stack([[rr * 0.7, 780], [rr, 840], [rr * 0.55, 900]], 6).translate(x * s, y * s, 0).color(wool));
  fix('body', `wool-${i}`, at(x, y, 820));
}

// Dark face with a wool cap; nods about X at the neck.
add('head', sweepY(0, -450, 720, [[0, 240, 280, 0], [200, 230, 280, -20], [400, 170, 200, -110]]).color(face));
add('cap', sweepY(0, -440, 720, [[0, 300, 140, 110], [180, 280, 120, 110]]).color(wool));
fix('head', 'cap', at(0, -530, 830));
for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  add(`${nm}-eye`, blk(sd * 115 - 10, -660, 720, sd * 115 + 10, -620, 750).color(horn));
  fix('head', `${nm}-eye`, at(sd * 115, -640, 735));
  add(`${nm}-ear`, rod([sd * 100, -560, 760], [sd * 260, -540, 720], 70, 40).color(face));
  hinge('head', `${nm}-ear`, `${nm}-ear-flick`, at(sd * 110, -560, 760), [0, 1, 0], [-30, 30]);
}
if (horns.value === 'curled') {
  add('horns', rod([-100, -470, 820], [-200, -400, 860], 70, 60).union(rod([-200, -400, 860], [-230, -480, 720], 60, 40))
    .union(rod([100, -470, 820], [200, -400, 860], 70, 60)).union(rod([200, -400, 860], [230, -480, 720], 60, 40))
    .union(blk(-110, -500, 790, 110, -440, 840)).color(horn));
  fix('head', 'horns', at(0, -470, 815));
}
hinge('body', 'head', 'neck', at(0, -450, 720), [1, 0, 0], [-35, 30]);

add('tail', blk(-60, 500, 520, 60, 600, 700).color(wool));
hinge('body', 'tail', 'tail-wag', at(0, 520, 690), [0, 0, 1], [-35, 35]);

legs({ hipZ: 380, kneeZ: 200, xs: 160, yf: -340, yb: 360, w0: 90, w1: 66, foot: [80, 95, 60], coat: face, footColor: hoof, top: 450 });

return r.model();
