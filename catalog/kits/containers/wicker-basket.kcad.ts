// Original kernelCAD low-poly wicker basket: a flared round body lofted
// through rings that alternate their facet phase (the zig-zag facets read
// as weave), a thick rolled rim and an arched carry handle.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, handle across X.

meta({
  name: 'wicker-basket',
  license: 'CC0-1.0',
  title: 'Wicker basket',
  description: 'Round woven wicker basket with a flared body, rolled rim and arched carry handle, empty or filled with apples or bread. Knobs: size, handle, contents, wicker, rim, handle and contents colours.',
  tags: ['basket', 'wicker basket', 'woven', 'picnic', 'market', 'harvest', 'farm', 'container'],
  kit: 'containers',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'outdoor', 'farm', 'market', 'medieval', 'kitchen', 'garden'],
  triangleBudget: 460,
});

const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Size' });
const handle = param('handle', 'arch', { choices: ['arch', 'none'], label: 'Handle' });
const fill = param('fill', 'apples', { choices: ['empty', 'apples'], label: 'Contents' });
const wicker = param('wicker', '#c89a5a', { label: 'Wicker' });
const rim = param('rim', '#9a6e3a', { label: 'Rim' });
const grip = param('grip', '#8a5e30', { label: 'Handle' });
const goods = param('goods', '#c8302a', { label: 'Contents' });

presets({
  dark: { wicker: '#8a6a44', rim: '#5e4428', grip: '#5e4428' },
  bread: { goods: '#d8a050' },
  pale: { wicker: '#e0c48e', rim: '#c09a5e', grip: '#c09a5e', goods: '#7ac043' },
});

const s = size.value === 'small' ? 0.7 : size.value === 'large' ? 1.35 : 1;
const n = 10;
const H = 220 * s;
const r0 = 150 * s;
const r1 = 200 * s;
const ngon = (r: number, rot = 0, k0 = n) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < k0; k++) p = p.lineTo(r * Math.cos(rot + (2 * Math.PI * k) / k0), r * Math.sin(rot + (2 * Math.PI * k) / k0));
  return p.close();
};
const rAt = (z: number) => r0 + ((r1 - r0) * z) / H;
// Woven body: five courses, every other ring turned half a facet.
const courses = 5;
const zs = Array.from({ length: courses + 1 }, (_, i) => (H * i) / courses);
const half = Math.PI / n;
const body = ngon(r0, 0).loft(zs.slice(1).map((z, i) => ngon(rAt(z) + ((i + 1) % 2) * 6 * s, ((i + 1) % 2) * half)), {
  planes: zs.map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
  ruled: true,
});

const b = assembly('wicker-basket');
b.part('body', body.subtract(ngon(r0 - 14 * s).loft(ngon(r1 - 14 * s), { spacing: H, ruled: true }).translate(0, 0, 18 * s)).color(wicker));
b.part('rim', ngon(r1 + 16 * s).extrude(26 * s).subtract(ngon(r1 - 16 * s).extrude(60 * s).translate(0, 0, -10)).translate(0, 0, H - 14 * s).color(rim));

if (handle.value === 'arch') {
  // Arched handle: one flat bent band (outer and inner polyline) across X.
  const top = H + 230 * s;
  const th = 22 * s;
  const outer: [number, number][] = [[-r1 - 4 * s, H - 30 * s], [-r1 * 0.88, H + 120 * s], [-r1 * 0.45, top], [r1 * 0.45, top], [r1 * 0.88, H + 120 * s], [r1 + 4 * s, H - 30 * s]];
  const inner: [number, number][] = outer.map(([x, z], i) => [x - Math.sign(x) * th * (i === 2 || i === 3 ? 0.4 : 1), z - (i === 0 || i === 5 ? 0 : th)]);
  const h = extrudePolygon([...outer, ...inner.reverse()], 34 * s).rotateX(90).translate(0, 17 * s, 0);
  b.part('handle', h.color(grip));
}

if (fill.value === 'apples') {
  // A domed heap with a few loose apples (faceted bipyramids) on top.
  const zt = H - 40 * s;
  b.part('heap', ngon(r1 - 18 * s).loft([ngon(r1 * 0.75, half), ngon(r1 * 0.3)], {
    planes: [
      { plane: 'XY', origin: [0, 0, zt] },
      { plane: 'XY', origin: [0, 0, H + 15 * s] },
      { plane: 'XY', origin: [0, 0, H + 45 * s] },
    ],
    ruled: true,
  }).color(goods));
  const ar = 42 * s;
  const apple = (x: number, y: number, z: number) =>
    ngon(ar * 0.5, 0, 6).loft([ngon(ar, half, 6), ngon(ar * 0.55, 0, 6)], {
      planes: [
        { plane: 'XY', origin: [0, 0, -ar * 0.75] },
        { plane: 'XY', origin: [0, 0, 0] },
        { plane: 'XY', origin: [0, 0, ar * 0.7] },
      ],
      ruled: true,
    }).translate(x, y, z);
  [[r1 * 0.4, -r1 * 0.35, H + 25 * s], [-r1 * 0.45, -r1 * 0.25, H + 22 * s], [r1 * 0.05, r1 * 0.35, H + 45 * s]]
    .forEach(([x, y, z], i) => b.part(`apple-${i + 1}`, apple(x, y, z).color(goods)));
}

return b.model();
