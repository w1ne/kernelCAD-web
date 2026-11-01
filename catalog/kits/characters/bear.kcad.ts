// Original kernelCAD low-poly bear: a heavy chamfered body with a shoulder
// hump, a broad head with round ears and a pale muzzle, a stubby tail and four
// thick two-link legs with dark paws, rigged at the neck, ears, tail, hips and
// knees. Each joint connector sits at the same point on both links, so pose 0
// is the as-built standing pose.
// Millimetres, Z up, paws on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'bear',
  license: 'CC0-1.0',
  title: 'Bear',
  description: 'Heavy low-poly bear with shoulder hump, round ears, pale muzzle and thick legs, with neck, ear, tail, hip and knee pivots rigged as GLB nodes. Knobs: size, fur, muzzle, nose and paw colours.',
  tags: ['bear', 'brown bear', 'grizzly', 'polar bear', 'cub', 'forest', 'wild', 'animal', 'wildlife', 'enemy', 'rigged', 'quadruped'],
  kit: 'characters',
  category: 'animal',
  origin: 'base',
  compat: ['character', 'forest', 'snow', 'mountain', 'outdoor'],
  triangleBudget: 650,
});

const size = param('size', 'adult', { choices: ['cub', 'adult', 'giant'], label: 'Size' });
const fur = param('fur', '#6b4428', { label: 'Fur' });
const muzzle = param('muzzle', '#b08a62', { label: 'Muzzle and inner ears' });
const nose = param('nose', '#1a1412', { label: 'Nose and eyes' });
const paw = param('paw', '#3a2618', { label: 'Paws' });

presets({
  polar: { fur: '#eef0ec', muzzle: '#dcdcd2', nose: '#1a1a1a', paw: '#c8c8c0' },
  black: { fur: '#24201e', muzzle: '#a07a54', paw: '#141210' },
  honey: { fur: '#b8782e', muzzle: '#e0b878', paw: '#6b4428' },
});

const s = size.value === 'cub' ? 0.45 : size.value === 'giant' ? 1.4 : 1;
const r = assembly('bear');
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

add('body', sweepY(0, 700, 800, [[0, 480, 500, 30], [160, 680, 700, 0], [1050, 720, 760, 50], [1380, 560, 600, 70]]).color(fur));

// Broad head with round ears and pale muzzle; nods about X.
const ny = -620;
const nz = 900;
add('head', sweepY(0, ny + 40, nz, [[0, 400, 400, 0], [260, 430, 420, -10], [330, 300, 280, -60]]).color(fur));
add('muzzle', sweepY(0, ny - 270, nz, [[0, 230, 200, -80], [160, 190, 160, -100]]).color(muzzle));
fix('head', 'muzzle', at(0, ny - 350, nz - 90));
add('nose', blk(-55, ny - 450, nz - 70, 55, ny - 420, nz - 10).color(nose));
fix('muzzle', 'nose', at(0, ny - 435, nz - 40));
for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  add(`${nm}-eye`, blk(sd * 95 - 22, ny - 300, nz + 20, sd * 95 + 22, ny - 278, nz + 64).color(nose));
  fix('head', `${nm}-eye`, at(sd * 95, ny - 290, nz + 42));
  add(`${nm}-ear`, ngon(80, 6).extrude(50 * s).rotateX(90).translate(sd * 150 * s, (ny - 90) * s, (nz + 230) * s).color(fur));
  hinge('head', `${nm}-ear`, `${nm}-ear-turn`, at(sd * 150, ny - 115, nz + 170), [0, 0, 1], [-30, 30]);
}
hinge('body', 'head', 'neck', at(0, ny, nz), [1, 0, 0], [-35, 35]);

add('tail', blk(-70, 680, 900, 70, 780, 1020).color(fur));
hinge('body', 'tail', 'tail-wag', at(0, 690, 960), [0, 0, 1], [-30, 30]);

legs({ hipZ: 560, kneeZ: 290, xs: 220, yf: -440, yb: 470, w0: 260, w1: 190, foot: [220, 270, 90], coat: fur, footColor: paw, top: 720 });

return r.model();
