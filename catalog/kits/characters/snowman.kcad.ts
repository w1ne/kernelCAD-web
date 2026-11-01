// Original kernelCAD low-poly snowman: three faceted snowballs, coal eyes and
// buttons, a carrot nose, a knitted scarf with a hanging tail, a top hat and
// twig arms with forked hands, rigged at the neck, hat, shoulders, wrists and
// scarf tail. Each joint connector sits at the same point on both links, so
// pose 0 is the as-built pose.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'snowman',
  license: 'CC0-1.0',
  title: 'Snowman',
  description: 'Three-ball low-poly snowman with coal eyes and buttons, carrot nose, scarf, top hat and twig arms, with neck, hat, shoulder, wrist and scarf pivots rigged as GLB nodes. Knobs: height, hat, snow, scarf, hat, carrot, coal and twig colours.',
  tags: ['snowman', 'snow', 'winter', 'christmas', 'holiday', 'frosty', 'decoration', 'character', 'rigged', 'cute'],
  kit: 'characters',
  category: 'character',
  origin: 'base',
  compat: ['character', 'snow', 'winter', 'outdoor', 'village'],
  triangleBudget: 850,
});

const height = param('height', '1.6m', { choices: ['1.0m', '1.6m', '2.2m'], label: 'Height' });
const hatStyle = param('hatStyle', 'top-hat', { choices: ['top-hat', 'beanie'], label: 'Hat' });
const snow = param('snow', '#f2f6fa', { label: 'Snow' });
const scarf = param('scarf', '#d8342c', { label: 'Scarf' });
const hat = param('hat', '#24242a', { label: 'Hat' });
const carrot = param('carrot', '#f07a1a', { label: 'Carrot nose' });
const coal = param('coal', '#1a1a1e', { label: 'Coal' });
const twig = param('twig', '#6b4a2e', { label: 'Twig arms' });

presets({
  festive: { scarf: '#2f8f4a', hat: '#c8261e', hatStyle: 'beanie' },
  blue: { scarf: '#2f6fd8', hat: '#3a3f6a' },
});

const s = Number(height.value.replace('m', '')) / 1.6;
const r = assembly('snowman');
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
// Faceted snowball: a stack of 8-sided rings round a centre at height zc.
const ball = (rad: number, zc: number) => {
  const k = [[0.55, -0.95], [0.92, -0.5], [1, 0], [0.92, 0.5], [0.55, 0.95]];
  return stack(k.map(([f, dz]) => [rad * f, zc + dz * rad] as [number, number]), 8);
};

add('base', ball(380, 361).color(snow));
add('body', ball(290, 960).color(snow));
fix('base', 'body', at(0, 0, 700));
for (const [i, z] of [[1, 880], [2, 1000], [3, 1110]]) {
  add(`button-${i}`, blk(-28, -300 + (Math.abs(z - 960) * 0.25), z - 28, 28, -260, z + 28).color(coal));
  fix('body', `button-${i}`, at(0, -270, z));
}

// Head turns about Z on the body; hat tips about X on the head.
add('head', ball(210, 1400).color(snow));
add('nose', rod([0, -190, 1400], [0, -400, 1370], 60, 12).color(carrot));
fix('head', 'nose', at(0, -200, 1400));
for (const sd of [-1, 1]) {
  add(`${sd < 0 ? 'left' : 'right'}-eye`, blk(sd * 70 - 22, -205, 1450, sd * 70 + 22, -170, 1494).color(coal));
  fix('head', `${sd < 0 ? 'left' : 'right'}-eye`, at(sd * 70, -190, 1472));
}
hinge('body', 'head', 'neck', at(0, 0, 1200), [0, 0, 1], [-80, 80]);
if (hatStyle.value === 'top-hat') {
  add('hat', ngon(240, 8, Math.PI / 8).extrude(30 * s).translate(0, 0, 1570 * s)
    .union(ngon(150, 8, Math.PI / 8).extrude(300 * s).translate(0, 0, 1590 * s)).color(hat));
  add('hat-band', ngon(156, 8, Math.PI / 8).extrude(50 * s).translate(0, 0, 1610 * s).color(scarf));
  fix('hat', 'hat-band', at(0, 0, 1635));
} else {
  add('hat', stack([[180, 1530], [175, 1620], [110, 1720], [30, 1760]], 8).union(stack([[40, 1750], [70, 1790], [30, 1840]], 6)).color(hat));
  add('hat-band', stack([[205, 1520], [200, 1580]], 8).color(scarf));
  fix('hat', 'hat-band', at(0, 0, 1550));
}
hinge('head', 'hat', 'hat-tip', at(0, 0, 1570), [1, 0, 0], [-25, 25]);

// Scarf ring round the neck and a hanging tail that flutters.
add('scarf', stack([[230, 1180], [235, 1250]], 8).color(scarf));
fix('body', 'scarf', at(0, 0, 1215));
add('scarf-tail', blk(80, -250, 900, 180, -215, 1230).union(blk(80, -235, 1180, 180, -190, 1250)).color(scarf));
hinge('scarf', 'scarf-tail', 'scarf-flutter', at(130, -220, 1220), [1, 0, 0], [-40, 20]);

// Twig arms swing at the shoulders; forked hands bend at the wrists.
for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  const sh: [number, number, number] = [sd * 230, 0, 1010];
  const wr: [number, number, number] = [sd * 600, -20, 1260];
  add(`${nm}-arm`, rod([sd * 180, 0, 990], wr, 34, 26).union(rod([sd * 430, -10, 1140], [sd * 470, -60, 1250], 18, 12)).color(twig));
  add(`${nm}-hand`, rod(wr, [sd * 740, -40, 1330], 24, 14).union(rod(wr, [sd * 700, 40, 1400], 20, 12)).union(rod(wr, [sd * 730, -10, 1220], 18, 10)).color(twig));
  hinge('body', `${nm}-arm`, `${nm}-shoulder`, at(...sh), [0, 1, 0], [-40, 40]);
  hinge(`${nm}-arm`, `${nm}-hand`, `${nm}-wrist`, at(...wr), [0, 1, 0], [-45, 45]);
}

return r.model();
