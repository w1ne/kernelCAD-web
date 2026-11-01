// Original kernelCAD low-poly duck: a boat-shaped side-profile body with an
// upturned tail, a round head with a flat opening bill on a curved neck,
// folded wings that flap and short legs with webbed feet, all rigged through
// revolute mates. Pose 0 is the as-built standing pose.
// Millimetres, Z up, feet on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'duck',
  license: 'CC0-1.0',
  title: 'Duck',
  description: 'Low-poly duck with boat-shaped body, flat opening bill, neck ring, flapping wings and webbed feet, with neck, bill, wing, tail and hip pivots rigged as GLB nodes. Knobs: size, body, head, ring, wing, bill and eye colours.',
  tags: ['duck', 'mallard', 'duckling', 'drake', 'bird', 'pond', 'farm', 'animal', 'rigged', 'cute'],
  kit: 'characters',
  category: 'animal',
  origin: 'base',
  compat: ['character', 'pond', 'farm', 'park', 'outdoor'],
  triangleBudget: 500,
});

const size = param('size', 'adult', { choices: ['duckling', 'adult'], label: 'Size' });
const bodyColor = param('bodyColor', '#9a8a78', { label: 'Body' });
const headColor = param('headColor', '#2f7a4a', { label: 'Head' });
const ringColor = param('ringColor', '#f4f2ec', { label: 'Neck ring' });
const wing = param('wing', '#6b5a4a', { label: 'Wings and tail' });
const bill = param('bill', '#f2c219', { label: 'Bill and feet' });
const eye = param('eye', '#141414', { label: 'Eyes' });

presets({
  white: { bodyColor: '#f6f4ee', headColor: '#f6f4ee', ringColor: '#f6f4ee', wing: '#e6e2d8', bill: '#f29a2e' },
  duckling: { size: 'duckling', bodyColor: '#f6dc5a', headColor: '#f6dc5a', ringColor: '#f6dc5a', wing: '#e8c84a', bill: '#f29a2e' },
  hen: { headColor: '#8a7058', ringColor: '#8a7058', bodyColor: '#a88a6a' },
});

const s = size.value === 'duckling' ? 0.45 : 1;
const r = assembly('duck');
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

const bw = 200;
add('body', side([[-170, 200], [-120, 120], [140, 120], [230, 200], [260, 270], [150, 250], [-120, 290], [-180, 260]], bw)
  .union(side([[-150, 210], [-100, 140], [120, 140], [200, 200], [130, 240], [-130, 270]], bw + 20)).color(bodyColor));
add('tail', side([[180, 220], [280, 260], [300, 310], [240, 280], [170, 250]], 90).color(wing));
hinge('body', 'tail', 'tail-wag', at(0, 190, 240), [0, 0, 1], [-30, 30]);

// Neck and head nod about X; the bill's lower half opens.
add('head', side([[-170, 250], [-120, 250], [-110, 340], [-80, 380], [-110, 440], [-180, 450], [-220, 400], [-190, 330]], 110).color(headColor));
add('ring', side([[-175, 300], [-120, 300], [-118, 320], [-180, 320]], 116).color(ringColor));
fix('head', 'ring', at(0, -150, 310));
add('bill', side([[-215, 390], [-300, 380], [-305, 370], [-210, 370]], 70).color(bill));
fix('head', 'bill', at(0, -215, 380));
add('lower-bill', side([[-210, 368], [-290, 366], [-210, 356]], 60).color(bill));
hinge('head', 'lower-bill', 'bill-open', at(0, -210, 362), [1, 0, 0], [-25, 0]);
for (const sd of [-1, 1]) {
  add(`${sd < 0 ? 'left' : 'right'}-eye`, blk(sd * 56 - 6, -185, 400, sd * 56 + 6, -165, 420).color(eye));
  fix('head', `${sd < 0 ? 'left' : 'right'}-eye`, at(sd * 56, -175, 410));
}
hinge('body', 'head', 'neck', at(0, -140, 260), [1, 0, 0], [-50, 30]);

for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  const x0 = sd < 0 ? -(bw + 20) / 2 - 16 : (bw + 20) / 2;
  add(`${nm}-wing`, side([[-80, 260], [80, 250], [220, 230], [190, 190], [-40, 190]], 16, x0).color(wing));
  hinge('body', `${nm}-wing`, `${nm}-wing-flap`, at(sd * (bw + 20) / 2, -40, 255), [0, 1, 0], sd < 0 ? [-10, 80] : [-80, 10]);
  const x = sd * 50;
  const foot = extrudePolygon([[-10, 20], [-50, -70], [0, -90], [50, -70], [10, 20]], 10).scale([s, s, s]).translate(x * s, 0, 0);
  add(`${nm}-leg`, rod([x, 0, 140], [x, -5, 8], 26, 18).union(foot).color(bill));
  hinge('body', `${nm}-leg`, `${nm}-hip`, at(x, 0, 135), [1, 0, 0], [-50, 45]);
}

return r.model();
