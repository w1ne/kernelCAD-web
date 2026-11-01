// Original kernelCAD low-poly house cat: a slim chamfered body, a rounded
// head with pointed ears and a small muzzle, a long two-piece tail held up in
// a curve and four slim two-link legs with white paws, rigged at the neck,
// ears, tail, hips and knees. Each joint connector sits at the same point on
// both links, so pose 0 is the as-built standing pose.
// Millimetres, Z up, paws on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'house-cat',
  license: 'CC0-1.0',
  title: 'House cat',
  description: 'Low-poly domestic cat with pointed ears, small muzzle, white paws and a long curving tail, with neck, ear, tail, hip and knee pivots rigged as GLB nodes. Knobs: size, fur, chest, eye, nose and paw colours.',
  tags: ['cat', 'kitten', 'kitty', 'pet', 'house cat', 'tabby', 'animal', 'companion', 'rigged', 'quadruped', 'cute'],
  kit: 'characters',
  category: 'animal',
  origin: 'base',
  compat: ['character', 'interior', 'village', 'city', 'outdoor'],
  triangleBudget: 650,
});

const size = param('size', 'adult', { choices: ['kitten', 'adult'], label: 'Size' });
const fur = param('fur', '#d98a3a', { label: 'Fur' });
const chest = param('chest', '#f6ecdc', { label: 'Chest and muzzle' });
const eye = param('eye', '#8ad13a', { label: 'Eyes' });
const nose = param('nose', '#d86a7a', { label: 'Nose and inner ears' });
const paw = param('paw', '#f6ecdc', { label: 'Paws' });

presets({
  black: { fur: '#1e1e22', chest: '#2a2a2e', paw: '#2a2a2e', eye: '#f2c219' },
  grey: { fur: '#7d838a', chest: '#d8dadc', eye: '#3ab0d1' },
  siamese: { fur: '#efe4cf', chest: '#efe4cf', paw: '#4a3a30', eye: '#3a8ad8', nose: '#4a3a30' },
});

const s = size.value === 'kitten' ? 0.6 : 1;
const r = assembly('house-cat');
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

add('body', sweepY(0, 230, 230, [[0, 130, 130, 10], [60, 160, 160, 0], [380, 160, 170, 10], [460, 140, 150, 20]]).color(fur));
add('chest', sweepY(0, -150, 230, [[0, 130, 110, -20], [90, 110, 90, -10]]).color(chest));
fix('body', 'chest', at(0, -200, 210));

// Head on a short neck, nodding about X; ears turn about Z.
const ny = -200;
const nz = 280;
add('head', rod([0, ny, nz - 20], [0, ny - 30, nz + 70], 80, 80)
  .union(sweepY(0, ny - 10, nz + 100, [[0, 150, 130, 0], [100, 160, 130, 0], [140, 120, 100, -10]])).color(fur));
add('muzzle', sweepY(0, ny - 130, nz + 100, [[0, 80, 50, -30], [40, 64, 40, -32]]).color(chest));
fix('head', 'muzzle', at(0, ny - 150, nz + 70));
add('nose', blk(-14, ny - 176, nz + 70, 14, ny - 166, nz + 90).color(nose));
fix('muzzle', 'nose', at(0, ny - 170, nz + 80));
for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  add(`${nm}-eye`, blk(sd * 38 - 14, ny - 154, nz + 100, sd * 38 + 14, ny - 146, nz + 122).color(eye));
  fix('head', `${nm}-eye`, at(sd * 38, ny - 150, nz + 111));
  add(`${nm}-ear`, extrudePolygon([[-34 * s, 0], [34 * s, 0], [6 * s, 75 * s]], 16 * s).rotateX(90).translate(sd * 45 * s, (ny - 60) * s, (nz + 155) * s).color(fur));
  hinge('head', `${nm}-ear`, `${nm}-ear-turn`, at(sd * 45, ny - 68, nz + 160), [0, 0, 1], [-35, 35]);
}
hinge('body', 'head', 'neck', at(0, ny, nz), [1, 0, 0], [-40, 35]);

// Long tail: base rises behind, tip curls forward.
add('tail', rod([0, 220, 280], [0, 330, 450], 36, 30).color(fur));
hinge('body', 'tail', 'tail-sweep', at(0, 225, 285), [0, 0, 1], [-50, 50]);
add('tail-tip', rod([0, 330, 450], [0, 300, 600], 30, 22).color(fur));
hinge('tail', 'tail-tip', 'tail-curl', at(0, 330, 450), [1, 0, 0], [-50, 50]);

legs({ hipZ: 180, kneeZ: 95, xs: 50, yf: -170, yb: 180, w0: 50, w1: 34, foot: [44, 54, 30], coat: fur, footColor: paw, top: 220 });

return r.model();
