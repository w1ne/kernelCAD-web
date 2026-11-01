// Original kernelCAD low-poly owl: an upright faceted egg body with a pale
// chest, a big head that swivels with a flat face disc, large round eyes, a
// hooked beak and ear tufts, folded wings, a short tail and taloned feet, all
// rigged through revolute mates. Pose 0 is the as-built standing pose.
// Millimetres, Z up, feet on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'owl',
  license: 'CC0-1.0',
  title: 'Owl',
  description: 'Upright low-poly owl with swivelling head, face disc, big eyes, ear tufts, folded wings and taloned feet, with neck, tuft, wing, tail and foot pivots rigged as GLB nodes. Knobs: size, tufts, feathers, chest, face, eye and beak colours.',
  tags: ['owl', 'bird', 'night', 'forest', 'woodland', 'wise', 'animal', 'wildlife', 'rigged', 'cute', 'halloween'],
  kit: 'characters',
  category: 'animal',
  origin: 'base',
  compat: ['character', 'forest', 'night', 'outdoor', 'fantasy'],
  triangleBudget: 650,
});

const size = param('size', 'medium', { choices: ['owlet', 'medium', 'great'], label: 'Size' });
const tufts = param('tufts', 'yes', { choices: ['yes', 'no'], label: 'Ear tufts' });
const feathers = param('feathers', '#8a6440', { label: 'Feathers' });
const chest = param('chest', '#d9c09a', { label: 'Chest' });
const face = param('face', '#ecdcc0', { label: 'Face disc' });
const eye = param('eye', '#f2a019', { label: 'Eyes' });
const beak = param('beak', '#3a3230', { label: 'Beak, pupils and talons' });

presets({
  snowy: { feathers: '#eef0f0', chest: '#f8f8f6', face: '#ffffff', eye: '#f2d019', tufts: 'no' },
  barn: { feathers: '#c89a5a', chest: '#f4ece0', face: '#fbf6ee', eye: '#1a1414', tufts: 'no' },
});

const s = size.value === 'owlet' ? 0.6 : size.value === 'great' ? 1.4 : 1;
const r = assembly('owl');
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

add('body', stack([[90, 40], [150, 120], [160, 260], [125, 380]], 8).scale([1, 0.9, 1]).color(feathers));
add('chest', stack([[80, 60], [130, 130], [135, 250], [100, 350]], 8).scale([0.8, 0.82, 1]).translate(0, -45 * s, 0).color(chest));
fix('body', 'chest', at(0, -110, 200));
add('tail', side([[100, 120], [190, 40], [180, 20], [90, 80]], 110).color(feathers));
hinge('body', 'tail', 'tail-flick', at(0, 100, 100), [1, 0, 0], [-25, 25]);

// Big head swivels about Z: face disc, eyes, pupils and beak ride on it.
add('head', stack([[120, 360], [165, 420], [160, 540], [110, 600]], 8).scale([1, 0.9, 1]).color(feathers));
add('face', side([[-130, 390], [-150, 450], [-150, 540], [-130, 570], [-120, 480]], 230).color(face));
fix('head', 'face', at(0, -140, 480));
for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  add(`${nm}-eye`, ngon(42, 8, Math.PI / 8).extrude(16 * s).rotateX(90).translate(sd * 55 * s, -150 * s, 500 * s).color(eye));
  fix('head', `${nm}-eye`, at(sd * 55, -158, 500));
  add(`${nm}-pupil`, ngon(18, 6).extrude(10 * s).rotateX(90).translate(sd * 55 * s, -164 * s, 500 * s).color(beak));
  fix(`${nm}-eye`, `${nm}-pupil`, at(sd * 55, -168, 500));
  if (tufts.value === 'yes') {
    add(`${nm}-tuft`, extrudePolygon([[-30 * s, 0], [35 * s, 0], [sd * 40 * s, 110 * s]], 24 * s).rotateX(90).translate(sd * 95 * s, -20 * s, 570 * s).color(feathers));
  } else {
    add(`${nm}-tuft`, blk(sd * 95 - 30, -40, 570, sd * 95 + 30, 0, 600).color(feathers));
  }
  hinge('head', `${nm}-tuft`, `${nm}-tuft-perk`, at(sd * 95, -30, 580), [0, 1, 0], [-30, 30]);
}
add('beak', side([[-150, 470], [-175, 445], [-150, 400], [-140, 440]], 34).color(beak));
fix('head', 'beak', at(0, -155, 440));
hinge('body', 'head', 'neck', at(0, 0, 370), [0, 0, 1], [-170, 170]);

for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  const x0 = sd < 0 ? -160 - 22 : 155;
  add(`${nm}-wing`, side([[-70, 350], [80, 340], [110, 160], [80, 60], [-20, 110], [-80, 250]], 26, x0).color(feathers));
  hinge('body', `${nm}-wing`, `${nm}-wing-open`, at(sd * 155, 0, 340), [0, 1, 0], sd < 0 ? [-10, 90] : [-90, 10]);
  const x = sd * 55;
  add(`${nm}-foot`, blk(x - 30, -30, 30, x + 30, 30, 70)
    .union(blk(x - 35, -80, 0, x - 15, 10, 30)).union(blk(x - 10, -90, 0, x + 10, 10, 30)).union(blk(x + 15, -80, 0, x + 35, 10, 30)).color(beak));
  hinge('body', `${nm}-foot`, `${nm}-ankle`, at(x, 0, 50), [1, 0, 0], [-30, 30]);
}

return r.model();
