// Original kernelCAD low-poly rabbit: a sitting chamfered body, a head with
// tall flat ears and a pink nose, short front legs, big folded haunches with
// long hind feet and a pom-pom tail, all rigged through revolute mates. Each
// joint connector sits at the same point on both links, so pose 0 is the
// as-built sitting pose.
// Millimetres, Z up, sitting on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'rabbit',
  license: 'CC0-1.0',
  title: 'Rabbit',
  description: 'Sitting low-poly rabbit with tall flat ears, pink nose, big haunches, long hind feet and pom-pom tail, with neck, ear, shoulder, hip, ankle and tail pivots rigged as GLB nodes. Knobs: size, ears, fur, belly, nose and eye colours.',
  tags: ['rabbit', 'bunny', 'hare', 'pet', 'easter', 'meadow', 'animal', 'wildlife', 'rigged', 'cute'],
  kit: 'characters',
  category: 'animal',
  origin: 'base',
  compat: ['character', 'meadow', 'forest', 'farm', 'outdoor'],
  triangleBudget: 600,
});

const size = param('size', 'adult', { choices: ['baby', 'adult', 'giant'], label: 'Size' });
const ears = param('ears', 'upright', { choices: ['upright', 'lop'], label: 'Ears' });
const fur = param('fur', '#b89a7a', { label: 'Fur' });
const belly = param('belly', '#f4eee4', { label: 'Belly and tail' });
const nose = param('nose', '#e88a9a', { label: 'Nose and inner ears' });
const eye = param('eye', '#1e1614', { label: 'Eyes' });

presets({
  white: { fur: '#f6f4f0', belly: '#ffffff', eye: '#c8263a' },
  grey: { fur: '#8a8a8e', belly: '#e0e0e2' },
  chocolate: { fur: '#5a3a26', belly: '#c8a888' },
});

const s = size.value === 'baby' ? 0.55 : size.value === 'giant' ? 1.8 : 1;
const r = assembly('rabbit');
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

// Sitting body: rings rise toward the chest.
add('body', sweepY(0, 150, 0, [[0, 170, 170, 130], [70, 220, 230, 150], [220, 200, 230, 210], [290, 150, 170, 260]]).color(fur));
add('belly', sweepY(0, -40, 0, [[0, 150, 150, 200], [112, 124, 124, 255]]).color(belly));
fix('body', 'belly', at(0, -100, 220));
add('tail', stack([[30, 90], [55, 120], [30, 160]], 6).translate(0, 170 * s, 0).color(belly));
hinge('body', 'tail', 'tail-flick', at(0, 150, 120), [1, 0, 0], [-25, 25]);

// Head nods about X; ears swivel about Y at their roots.
const nz = 330;
add('head', sweepY(0, -80, 400, [[0, 150, 150, 0], [110, 160, 150, -10], [170, 110, 100, -30]]).union(rod([0, -100, nz - 20], [0, -110, 400], 90, 90)).color(fur));
add('nose', blk(-20, -262, 360, 20, -248, 385).color(nose));
fix('head', 'nose', at(0, -255, 372));
for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  add(`${nm}-eye`, blk(sd * 55 - 14, -215, 410, sd * 55 + 14, -200, 435).color(eye));
  fix('head', `${nm}-eye`, at(sd * 55, -207, 422));
  const ear = ears.value === 'upright'
    ? side([[-170, 450], [-120, 450], [-95, 620], [-130, 720], [-165, 640]], 24, sd * 42 - 12)
    : side([[-120, 485], [-170, 485], [-205, 330], [-175, 270], [-140, 330]], 24, sd < 0 ? -104 : 80);
  add(`${nm}-ear`, ear.color(fur));
  hinge('head', `${nm}-ear`, `${nm}-ear-swivel`, at(sd * 42, -140, 460), [0, 1, 0], [-30, 30]);
}
hinge('body', 'head', 'neck', at(0, -100, nz), [1, 0, 0], [-35, 30]);

for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  add(`${nm}-arm`, rod([sd * 55, -110, 190], [sd * 55, -135, 25], 40, 32).union(blk(sd * 55 - 24, -170, 0, sd * 55 + 24, -110, 28)).color(fur));
  hinge('body', `${nm}-arm`, `${nm}-shoulder`, at(sd * 55, -110, 190), [1, 0, 0], [-60, 40]);
  add(`${nm}-haunch`, stack([[60, 30], [95, 90], [65, 180]], 6).scale([0.8, 1.4, 1]).translate(sd * 95 * s, 60 * s, 0).color(fur));
  hinge('body', `${nm}-haunch`, `${nm}-hip`, at(sd * 95, 60, 120), [1, 0, 0], [-60, 30]);
  add(`${nm}-foot`, blk(sd * 95 - 32, -70, 0, sd * 95 + 32, 140, 32).color(fur));
  hinge(`${nm}-haunch`, `${nm}-foot`, `${nm}-ankle`, at(sd * 95, 110, 25), [1, 0, 0], [-20, 60]);
}

return r.model();
