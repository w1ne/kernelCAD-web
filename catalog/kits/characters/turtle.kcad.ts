// Original kernelCAD low-poly tortoise: a faceted domed shell with a rim band
// and a raised top scute over a flat belly plate, a head with a hinged jaw on
// a nodding neck, four stubby legs and a short tail, all rigged through
// revolute mates. Pose 0 is the as-built standing pose.
// Millimetres, Z up, feet on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'turtle',
  license: 'CC0-1.0',
  title: 'Tortoise',
  description: 'Low-poly tortoise with a faceted domed shell, rim band and raised scute, a nodding head with opening jaw, stubby legs and a short tail, with neck, jaw, leg and tail pivots rigged as GLB nodes. Knobs: size, shell, scute, rim, skin and eye colours.',
  tags: ['turtle', 'tortoise', 'terrapin', 'reptile', 'pond', 'beach', 'garden', 'animal', 'pet', 'rigged', 'cute', 'slow'],
  kit: 'characters',
  category: 'animal',
  origin: 'base',
  compat: ['character', 'pond', 'beach', 'garden', 'outdoor'],
  triangleBudget: 600,
});

const size = param('size', 'medium', { choices: ['small', 'medium', 'giant'], label: 'Size' });
const shell = param('shell', '#6b7a3a', { label: 'Shell' });
const scute = param('scute', '#a8a050', { label: 'Top scute' });
const rim = param('rim', '#4a5428', { label: 'Shell rim and belly' });
const skin = param('skin', '#9aa86a', { label: 'Skin' });
const eye = param('eye', '#141414', { label: 'Eyes' });

presets({
  desert: { shell: '#a8763a', scute: '#d9b06a', rim: '#6b4a26', skin: '#c8a878' },
  sea: { shell: '#3a6a5a', scute: '#6aa88a', rim: '#24463a', skin: '#8ab8a0' },
});

const s = size.value === 'small' ? 0.4 : size.value === 'giant' ? 2.5 : 1;
const r = assembly('turtle');
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

add('belly', blk(-150, -190, 50, 150, 190, 85).color(rim));
add('shell', stack([[200, 80], [235, 130], [205, 210], [120, 260]], 8).scale([1, 1.25, 1]).color(shell));
fix('belly', 'shell', at(0, 0, 85));
add('rim', stack([[210, 70], [215, 105]], 8).scale([1, 1.25, 1]).color(rim));
fix('shell', 'rim', at(0, 0, 90));
add('scute', stack([[100, 240], [90, 272]], 6).scale([1, 1.25, 1]).color(scute));
fix('shell', 'scute', at(0, 0, 255));

// Head nods about X on the neck; the jaw drops.
add('head', rod([0, -210, 100], [0, -300, 150], 70, 60).union(blk(-50, -400, 120, 50, -290, 200)).color(skin));
add('jaw', blk(-46, -392, 100, 46, -300, 122).color(skin));
hinge('head', 'jaw', 'jaw-open', at(0, -300, 120), [1, 0, 0], [-25, 0]);
for (const sd of [-1, 1]) {
  add(`${sd < 0 ? 'left' : 'right'}-eye`, blk(sd * 50 - 8, -375, 165, sd * 50 + 8, -350, 185).color(eye));
  fix('head', `${sd < 0 ? 'left' : 'right'}-eye`, at(sd * 50, -362, 175));
}
hinge('belly', 'head', 'neck', at(0, -210, 100), [1, 0, 0], [-30, 30]);

add('tail', rod([0, 220, 90], [0, 300, 50], 40, 16).color(skin));
hinge('belly', 'tail', 'tail-wag', at(0, 220, 90), [0, 0, 1], [-35, 35]);

for (const [end, y] of [['front', -150], ['back', 150]] as const) {
  for (const sd of [-1, 1]) {
    const nm = `${end}-${sd < 0 ? 'left' : 'right'}`;
    const x = sd * 165;
    add(`${nm}-leg`, rod([sd * 130, y, 95], [x, y, 30], 70, 60).union(blk(x - 40, y - 45, 0, x + 40, y + 35, 34)).color(skin));
    hinge('belly', `${nm}-leg`, `${nm}-hip`, at(sd * 130, y, 90), [1, 0, 0], [-35, 35]);
  }
}

return r.model();
