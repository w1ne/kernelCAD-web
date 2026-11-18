// Original kernelCAD low-poly vase of flowers: a faceted bulb vase with a
// neck, holding tulip-like cup blooms on thin stems with blade leaves.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0.

meta({
  name: 'vase-with-flowers',
  license: 'CC0-1.0',
  title: 'Vase with flowers',
  description: 'Table vase holding a bunch of tulip-like flowers with stems and leaves. Knobs: flower count, vase shape, vase, flower, second flower and stem colours.',
  tags: ['vase', 'flowers', 'tulips', 'bouquet', 'centerpiece', 'decor', 'plant', 'table'],
  kit: 'interior',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'dining-room', 'living-room', 'kitchen', 'office'],
  triangleBudget: 500,
});

const count = param('count', '7', { choices: ['5', '7', '9'], label: 'Flowers' });
const shape = param('shape', 'bulb', { choices: ['bulb', 'tall'], label: 'Vase shape' });
const vase = param('vase', '#3c6e9f', { label: 'Vase' });
const flowerA = param('flowerA', '#e04a3a', { label: 'Flowers A' });
const flowerB = param('flowerB', '#f2c230', { label: 'Flowers B' });
const stem = param('stem', '#4f8f3a', { label: 'Stems and leaves' });

presets({
  pastel: { vase: '#efeee9', flowerA: '#e8a0b8', flowerB: '#f4f0d0' },
  purple: { vase: '#2b2d30', flowerA: '#7a4ab8', flowerB: '#efeee9' },
});

const n = Number(count.value);
const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const rings = (rs: [number, number][], s: number) =>
  ngon(rs[0][0], s).loft(rs.slice(1).map(([r]) => ngon(r, s)), {
    planes: rs.map(([, z]) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  });

const v = assembly('vase-with-flowers');
const tall = shape.value === 'tall';
const vh = tall ? 300 : 220;
v.part('vase', (tall ? rings([[50, 0], [62, 120], [42, 260], [48, vh]], 8) : rings([[55, 0], [95, 80], [40, 180], [50, vh]], 8)).color(vase));
const mouth = 40;
for (let i = 0; i < n; i++) {
  const a = (2 * Math.PI * i) / n + 0.3;
  const r = i === 0 ? 0 : mouth * 0.6;
  const lean = i === 0 ? 0 : 14 + 6 * (i % 2);
  const len = 260 + 50 * Math.sin(i * 2.3);
  const bx = r * Math.cos(a);
  const by = r * Math.sin(a);
  const deg = (a * 180) / Math.PI;
  // Stem from inside the vase neck, leaning outward.
  const stemShape = ngon(4, 3).extrude(len + 80).translate(0, 0, -80).rotateY(lean).rotateZ(deg).translate(bx, by, vh);
  v.part(`stem-${i + 1}`, stemShape.color(stem));
  // Cup bloom: a six-sided tulip cup at the stem tip.
  const tx = bx + Math.sin((lean * Math.PI) / 180) * len * Math.cos(a);
  const ty = by + Math.sin((lean * Math.PI) / 180) * len * Math.sin(a);
  const tz = vh + Math.cos((lean * Math.PI) / 180) * len;
  const cup = ngon(14, 6).loft([ngon(26, 6, Math.PI / 6), ngon(20, 6)], {
    planes: [
      { plane: 'XY', origin: [0, 0, -8] },
      { plane: 'XY', origin: [0, 0, 30] },
      { plane: 'XY', origin: [0, 0, 60] },
    ],
    ruled: true,
  });
  v.part(`bloom-${i + 1}`, cup.rotateY(lean).rotateZ(deg).translate(tx, ty, tz).color(i % 2 === 0 ? flowerA : flowerB));
}
// A few blade leaves spraying out of the neck.
for (let k = 0; k < 3; k++) {
  const leaf = extrudePolygon([[0, 0], [16, 70], [0, 170], [-16, 70]], 5).translate(0, 0, -2.5).rotateX(90).rotateY(35).rotateZ(120 * k + 50);
  v.part(`leaf-${k + 1}`, leaf.translate(0, 0, vh - 30).color(stem));
}

return v.model();
