// Original kernelCAD low-poly deer: a slim chamfered body on long two-link
// legs, a raised neck, a tapered head with big ears and optional branching
// antlers, and a white flag tail, rigged at the neck, poll, ears, tail, hips
// and knees. Each joint connector sits at the same point on both links, so
// pose 0 is the as-built standing pose.
// Millimetres, Z up, hooves on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'deer',
  license: 'CC0-1.0',
  title: 'Deer',
  description: 'Graceful low-poly deer with long legs, raised neck, big ears, white flag tail and optional branching antlers, with neck, poll, ear, tail, hip and knee pivots rigged as GLB nodes. Knobs: antlers, coat, belly, antler, nose and hoof colours.',
  tags: ['deer', 'stag', 'doe', 'buck', 'fawn', 'forest', 'woodland', 'animal', 'wildlife', 'rigged', 'quadruped'],
  kit: 'characters',
  category: 'animal',
  origin: 'base',
  compat: ['character', 'forest', 'meadow', 'outdoor', 'snow'],
  triangleBudget: 750,
});

const antlers = param('antlers', 'stag', { choices: ['stag', 'doe'], label: 'Antlers' });
const coat = param('coat', '#a8683a', { label: 'Coat' });
const belly = param('belly', '#f2e6d2', { label: 'Belly, muzzle and tail' });
const antler = param('antler', '#e0cfa8', { label: 'Antlers' });
const nose = param('nose', '#1e1a18', { label: 'Nose and eyes' });
const hoof = param('hoof', '#2e2622', { label: 'Hooves' });

presets({
  winter: { coat: '#7a6a5a', belly: '#e8e2d8' },
  reindeer: { coat: '#6b5444', belly: '#e8e0d0', antler: '#cdbb94' },
});

const s = 1;
const r = assembly('deer');
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

add('body', sweepY(0, 560, 900, [[0, 260, 300, 20], [120, 340, 400, 0], [940, 360, 420, 20], [1120, 300, 360, 50]]).color(coat));
add('belly', sweepY(0, 380, 900, [[0, 260, 80, -175], [820, 260, 80, -170]]).color(belly));
fix('body', 'belly', at(0, 0, 730));

// Raised neck; the head pitches at the poll.
const ny = -500;
const nz = 1000;
add('neck', rod([0, ny + 40, nz - 40], [0, ny - 140, nz + 420], 200, 140).color(coat));
hinge('body', 'neck', 'neck-raise', at(0, ny, nz), [1, 0, 0], [-40, 50]);
const py = ny - 150;
const pz = nz + 430;
add('head', sweepY(0, py + 60, pz, [[0, 170, 190, 0], [150, 180, 190, -10], [360, 100, 110, -90]]).color(coat));
add('muzzle', sweepY(0, py - 230, pz, [[0, 110, 100, -85], [80, 90, 80, -95]]).color(belly));
fix('head', 'muzzle', at(0, py - 270, pz - 90));
add('nose', blk(-30, py - 325, pz - 100, 30, py - 305, pz - 65).color(nose));
fix('muzzle', 'nose', at(0, py - 312, pz - 82));
for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  add(`${nm}-eye`, blk(sd * 70 - 18, py - 80, pz + 20, sd * 70 + 18, py - 50, pz + 45).color(nose));
  fix('head', `${nm}-eye`, at(sd * 70, py - 65, pz + 32));
  add(`${nm}-ear`, rod([sd * 60, py + 40, pz + 60], [sd * 220, py + 70, pz + 140], 80, 40).color(coat));
  hinge('head', `${nm}-ear`, `${nm}-ear-turn`, at(sd * 70, py + 40, pz + 65), [0, 0, 1], [-35, 35]);
}
if (antlers.value === 'stag') {
  let a = blk(-90, py + 10, pz + 80, 90, py + 50, pz + 110);
  for (const sd of [-1, 1]) {
    const b0: [number, number, number] = [sd * 70, py + 30, pz + 90];
    const b1: [number, number, number] = [sd * 170, py + 60, pz + 350];
    const b2: [number, number, number] = [sd * 230, py + 20, pz + 560];
    a = a.union(rod(b0, b1, 40, 32)).union(rod(b1, b2, 32, 22))
      .union(rod([sd * 120, py + 45, pz + 230], [sd * 110, py - 70, pz + 380], 26, 16))
      .union(rod([sd * 200, py + 40, pz + 460], [sd * 320, py + 60, pz + 560], 24, 14));
  }
  add('antlers', a.color(antler));
  fix('head', 'antlers', at(0, py + 30, pz + 95));
}
hinge('neck', 'head', 'poll', at(0, py, pz), [1, 0, 0], [-35, 40]);

add('tail', rod([0, 560, 1060], [0, 640, 900], 90, 70).color(belly));
hinge('body', 'tail', 'tail-flag', at(0, 570, 1060), [1, 0, 0], [-60, 10]);

legs({ hipZ: 760, kneeZ: 400, xs: 120, yf: -400, yb: 420, w0: 110, w1: 60, foot: [70, 90, 70], coat, footColor: hoof, top: 860 });

return r.model();
