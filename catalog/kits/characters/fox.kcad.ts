// Original kernelCAD low-poly fox: a slim chamfered body, a wedge head with a
// pointed snout and tall ears, a white bib, dark socks and a big bushy
// two-piece tail with a white tip, rigged at the neck, ears, tail, hips and
// knees. Each joint connector sits at the same point on both links, so pose 0
// is the as-built standing pose.
// Millimetres, Z up, paws on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'fox',
  license: 'CC0-1.0',
  title: 'Fox',
  description: 'Slim low-poly red fox with pointed snout, tall ears, white bib, dark socks and a bushy white-tipped tail, with neck, ear, tail, hip and knee pivots rigged as GLB nodes. Knobs: size, coat, bib, sock and nose colours.',
  tags: ['fox', 'red fox', 'vixen', 'wild', 'forest', 'woodland', 'animal', 'wildlife', 'rigged', 'quadruped', 'cute'],
  kit: 'characters',
  category: 'animal',
  origin: 'base',
  compat: ['character', 'forest', 'meadow', 'outdoor', 'snow'],
  triangleBudget: 650,
});

const size = param('size', 'adult', { choices: ['kit', 'adult'], label: 'Size' });
const coat = param('coat', '#d9692a', { label: 'Coat' });
const bib = param('bib', '#f6efe4', { label: 'Bib and tail tip' });
const sock = param('sock', '#2a2220', { label: 'Socks and ear backs' });
const nose = param('nose', '#1a1614', { label: 'Nose and eyes' });

presets({
  arctic: { coat: '#eef2f4', bib: '#ffffff', sock: '#cfd6dc', nose: '#2a2a2e' },
  silver: { coat: '#4a4a50', bib: '#d8d8dc', sock: '#1e1e22' },
});

const s = size.value === 'kit' ? 0.55 : 1;
const r = assembly('fox');
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

add('body', sweepY(0, 330, 360, [[0, 180, 190, 20], [90, 230, 240, 0], [540, 240, 250, 10], [660, 200, 220, 20]]).color(coat));
add('bib', sweepY(0, -200, 360, [[0, 190, 150, -40], [150, 170, 130, -30]]).color(bib));
fix('body', 'bib', at(0, -280, 320));

// Head: wedge skull and long snout on a short neck, nodding about X.
const ny = -290;
const nz = 420;
add('head', rod([0, ny, nz], [0, ny - 50, nz + 120], 120, 110)
  .union(sweepY(0, ny + 10, nz + 150, [[0, 200, 180, 0], [150, 210, 170, -10], [200, 150, 120, -40], [340, 60, 60, -60]])).color(coat));
add('cheeks', sweepY(0, ny - 130, nz + 150, [[0, 190, 70, -70], [140, 70, 40, -70]]).color(bib));
fix('head', 'cheeks', at(0, ny - 180, nz + 80));
add('nose', blk(-22, ny - 345, nz + 75, 22, ny - 325, nz + 110).color(nose));
fix('head', 'nose', at(0, ny - 335, nz + 92));
for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  add(`${nm}-eye`, blk(sd * 55 - 14, ny - 175, nz + 165, sd * 55 + 14, ny - 160, nz + 185).color(nose));
  fix('head', `${nm}-eye`, at(sd * 55, ny - 168, nz + 175));
  add(`${nm}-ear`, extrudePolygon([[-45 * s, 0], [45 * s, 0], [8 * s, 150 * s]], 24 * s).rotateX(90).translate(sd * 60 * s, (ny - 30) * s, (nz + 225) * s).color(sock));
  hinge('head', `${nm}-ear`, `${nm}-ear-turn`, at(sd * 60, ny - 42, nz + 235), [0, 0, 1], [-35, 35]);
}
hinge('body', 'head', 'neck', at(0, ny, nz), [1, 0, 0], [-40, 35]);

// Bushy tail: a thick base plume and a white-tipped end, each swinging.
add('tail', sweepY(0, 280, 390, [[0, 80, 80, 0], [-200, 170, 170, -50], [-380, 180, 180, -110]]).color(coat));
hinge('body', 'tail', 'tail-sweep', at(0, 300, 390), [0, 0, 1], [-45, 45]);
add('tail-tip', sweepY(0, 660, 280, [[0, 180, 180, 0], [-150, 90, 90, -20]]).color(bib));
hinge('tail', 'tail-tip', 'tail-flick', at(0, 660, 280), [1, 0, 0], [-30, 30]);

legs({ hipZ: 270, kneeZ: 140, xs: 75, yf: -230, yb: 240, w0: 70, w1: 46, foot: [60, 80, 60], coat, footColor: sock, top: 330 });

return r.model();
