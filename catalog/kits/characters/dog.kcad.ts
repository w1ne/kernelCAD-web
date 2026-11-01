// Original kernelCAD low-poly dog: a chamfered barrel body, a head with a
// boxy muzzle, black nose and floppy or pointed ears, a collar, a wagging tail
// and four two-link legs with paws, rigged at the neck, ears, tail, hips and
// knees. Each joint connector sits at the same point on both links, so pose 0
// is the as-built standing pose.
// Millimetres, Z up, paws on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'dog',
  license: 'CC0-1.0',
  title: 'Dog',
  description: 'Friendly low-poly dog with boxy muzzle, floppy or pointed ears, collar and wagging tail, with neck, ear, tail, hip and knee pivots rigged as GLB nodes. Knobs: size, ears, coat, patch, collar, nose and paw colours.',
  tags: ['dog', 'puppy', 'pet', 'hound', 'pup', 'animal', 'companion', 'rigged', 'quadruped', 'cute'],
  kit: 'characters',
  category: 'animal',
  origin: 'base',
  compat: ['character', 'farm', 'village', 'park', 'outdoor', 'interior'],
  triangleBudget: 650,
});

const size = param('size', 'medium', { choices: ['puppy', 'medium', 'large'], label: 'Size' });
const ears = param('ears', 'floppy', { choices: ['floppy', 'pointed'], label: 'Ears' });
const coat = param('coat', '#c98a4a', { label: 'Coat' });
const patch = param('patch', '#f2e8d6', { label: 'Muzzle and chest' });
const collar = param('collar', '#d8342c', { label: 'Collar' });
const nose = param('nose', '#1e1a18', { label: 'Nose, eyes and ears' });
const paw = param('paw', '#f2e8d6', { label: 'Paws' });

presets({
  husky: { ears: 'pointed', coat: '#5a5f66', patch: '#eef0f2', nose: '#1e1e22', paw: '#eef0f2', collar: '#2f6fd8' },
  black: { coat: '#24221f', patch: '#c98a4a', paw: '#c98a4a' },
  dalmatian: { coat: '#f4f2ec', patch: '#f4f2ec', nose: '#1a1a1a', paw: '#f4f2ec' },
});

const s = size.value === 'puppy' ? 0.55 : size.value === 'large' ? 1.35 : 1;
const r = assembly('dog');
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

add('body', sweepY(0, 380, 480, [[0, 230, 230, 20], [100, 290, 290, 0], [620, 310, 320, 10], [760, 260, 280, 30]]).color(coat));
add('chest', sweepY(0, -230, 480, [[0, 250, 200, -60], [165, 220, 170, -50]]).color(patch));
fix('body', 'chest', at(0, -300, 430));

// Head on a neck, nodding about X.
const ny = -330;
const nz = 560;
add('head', rod([0, ny, nz], [0, ny - 60, nz + 180], 140, 130)
  .union(sweepY(0, ny + 30, nz + 230, [[0, 230, 220, 0], [190, 240, 230, 0], [230, 200, 190, -20]])).color(coat));
add('muzzle', sweepY(0, ny - 190, nz + 230, [[0, 150, 120, -50], [150, 130, 100, -60]]).color(patch));
fix('head', 'muzzle', at(0, ny - 260, nz + 175));
add('nose', blk(-35, ny - 352, nz + 180, 35, ny - 330, nz + 225).color(nose));
fix('muzzle', 'nose', at(0, ny - 340, nz + 200));
for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  add(`${nm}-eye`, blk(sd * 65 - 15, ny - 202, nz + 250, sd * 65 + 15, ny - 190, nz + 280).color(nose));
  fix('head', `${nm}-eye`, at(sd * 65, ny - 196, nz + 265));
  const ear = ears.value === 'floppy'
    ? blk(sd * 115 - 15, ny - 120, nz + 170, sd * 115 + 15, ny - 30, nz + 330)
    : extrudePolygon([[-45 * s, 0], [45 * s, 0], [0, 120 * s]], 26 * s).rotateX(90).translate(sd * 75 * s, (ny - 60) * s, (nz + 330) * s);
  add(`${nm}-ear`, ear.color(nose));
  hinge('head', `${nm}-ear`, `${nm}-ear-flap`, at(sd * 100, ny - 75, nz + 330), [0, 1, 0], [-30, 30]);
}
add('collar', rod([0, ny + 10, nz + 30], [0, ny - 15, nz + 105], 160, 160).color(collar));
fix('head', 'collar', at(0, ny, nz + 70));
hinge('body', 'head', 'neck', at(0, ny, nz), [1, 0, 0], [-40, 35]);

add('tail', rod([0, 370, 600], [0, 520, 760], 50, 30).color(coat));
hinge('body', 'tail', 'tail-wag', at(0, 380, 600), [0, 0, 1], [-50, 50]);

legs({ hipZ: 350, kneeZ: 180, xs: 100, yf: -270, yb: 280, w0: 90, w1: 64, foot: [80, 100, 50], coat, footColor: paw, top: 420 });

return r.model();
