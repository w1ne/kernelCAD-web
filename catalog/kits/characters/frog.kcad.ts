// Original kernelCAD low-poly frog: a squat chamfered body with a pale belly,
// bulging eyes, a wide hinged jaw, short front legs and folded three-link
// hind legs with webbed feet, all rigged through revolute mates. Each joint
// connector sits at the same point on both links, so pose 0 is the as-built
// sitting pose.
// Millimetres, Z up, sitting on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'frog',
  license: 'CC0-1.0',
  title: 'Frog',
  description: 'Squat low-poly frog with bulging eyes, a wide opening mouth, short front legs and folded hind legs with webbed feet, with jaw, shoulder, hip, knee and ankle pivots rigged as GLB nodes. Knobs: size, skin, belly, spot, eye and pupil colours.',
  tags: ['frog', 'toad', 'amphibian', 'pond', 'swamp', 'animal', 'wildlife', 'rigged', 'cute', 'jump'],
  kit: 'characters',
  category: 'animal',
  origin: 'base',
  compat: ['character', 'pond', 'swamp', 'forest', 'outdoor'],
  triangleBudget: 600,
});

const size = param('size', 'giant', { choices: ['real', 'giant'], label: 'Size' });
const skin = param('skin', '#5aa83a', { label: 'Skin' });
const belly = param('belly', '#e8e2a0', { label: 'Belly and mouth' });
const spot = param('spot', '#3a7a2a', { label: 'Back spots' });
const eye = param('eye', '#f4e85a', { label: 'Eyes' });
const pupil = param('pupil', '#141414', { label: 'Pupils' });

presets({
  toad: { skin: '#8a6a3e', belly: '#d8c8a0', spot: '#5a4026', eye: '#d9a03a' },
  poison: { skin: '#2f6fd8', belly: '#1e1e28', spot: '#141418', eye: '#141418', pupil: '#2f6fd8' },
});

const s = size.value === 'real' ? 0.4 : 1;
const r = assembly('frog');
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

// Body tilted nose-up: rings grow taller toward the head.
add('body', sweepY(0, 150, 110, [[0, 160, 90, 0], [70, 230, 130, 15], [210, 240, 140, 35], [290, 200, 110, 45]]).color(skin));
add('belly', sweepY(0, 120, 110, [[0, 140, 40, -40], [240, 200, 50, -15]]).color(belly));
fix('body', 'belly', at(0, 0, 80));
for (const [i, x, y] of [[1, -50, 40], [2, 55, -20], [3, 0, 100]]) {
  add(`spot-${i}`, blk(x - 25, y - 25, 175, x + 25, y + 25, 190 + (y < 0 ? 20 : 0)).color(spot));
  fix('body', `spot-${i}`, at(x, y, 180));
}
for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  add(`${nm}-eye`, stack([[40, 180], [48, 215], [30, 250]], 6).translate(sd * 70 * s, -95 * s, 0).color(eye));
  fix('body', `${nm}-eye`, at(sd * 70, -95, 200));
  add(`${nm}-pupil`, blk(sd * 70 - 16, -144, 212, sd * 70 + 16, -128, 238).color(pupil));
  fix(`${nm}-eye`, `${nm}-pupil`, at(sd * 70, -135, 220));
}

// Wide lower jaw drops about X at the hinge under the eyes.
add('jaw', sweepY(0, -60, 110, [[0, 220, 40, -15], [90, 190, 36, -5], [100, 150, 30, -2]]).color(belly));
hinge('body', 'jaw', 'jaw-open', at(0, -60, 100), [1, 0, 0], [-30, 0]);

// Front legs prop the chest up, swinging at the shoulder.
for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  const hand = extrudePolygon([[-35, 20], [35, 20], [45, -40], [15, -30], [0, -55], [-15, -30], [-45, -40]], 12)
    .scale([s, s, s]).translate(sd * 120 * s, -130 * s, 0);
  add(`${nm}-arm`, rod([sd * 85, -90, 100], [sd * 120, -125, 16], 36, 24).union(hand).color(skin));
  hinge('body', `${nm}-arm`, `${nm}-shoulder`, at(sd * 85, -90, 100), [1, 0, 0], [-40, 40]);
}

// Folded hind legs: thigh out and forward, shin back, long webbed foot.
for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  const hip: [number, number, number] = [sd * 95, 110, 80];
  const knee: [number, number, number] = [sd * 190, 0, 70];
  const ankle: [number, number, number] = [sd * 160, 150, 30];
  add(`${nm}-thigh`, rod([sd * 70, 120, 80], knee, 70, 50).color(skin));
  add(`${nm}-shin`, rod(knee, ankle, 46, 34).color(skin));
  const foot = extrudePolygon([[-25, 20], [25, 20], [55, -120], [20, -100], [0, -140], [-20, -100], [-55, -120]], 12)
    .scale([s, s, s]).translate(sd * 175 * s, 140 * s, 0);
  add(`${nm}-foot`, rod(ankle, [sd * 175, 130, 16], 30, 22).union(foot).color(skin));
  hinge('body', `${nm}-thigh`, `${nm}-hip`, at(...hip), [1, 0, 0], [-80, 20]);
  hinge(`${nm}-thigh`, `${nm}-shin`, `${nm}-knee`, at(...knee), [0, 0, 1], sd < 0 ? [-120, 30] : [-30, 120]);
  hinge(`${nm}-shin`, `${nm}-foot`, `${nm}-ankle`, at(...ankle), [1, 0, 0], [-60, 30]);
}

return r.model();
