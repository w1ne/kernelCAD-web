// Original kernelCAD low-poly dandelion patch: a flat rosette of jagged
// toothed leaves with yellow flower heads and white seed clocks on stems.

meta({
  name: 'dandelion-patch',
  license: 'CC0-1.0',
  title: 'Dandelion patch',
  description: 'Dandelion rosette of jagged leaves with yellow flower heads and fluffy white seed clocks on slim stems, for lawns and meadows. Knobs: flowers, seed clocks, leaf, flower and seed colours.',
  tags: ['dandelion', 'weed', 'wildflower', 'seed head', 'lawn', 'meadow', 'spring', 'flower', 'plant', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'meadow', 'garden', 'park'],
  triangleBudget: 480,
});

const flowers = param('flowers', '3', { choices: ['1', '3', '5'], label: 'Flowers' });
const clocks = param('clocks', '2', { choices: ['0', '1', '2', '3'], label: 'Seed clocks' });
const leaf = param('leaf', '#4f8f34', { label: 'Leaves and stems' });
const flower = param('flower', '#f4c41a', { label: 'Flowers' });
const seed = param('seed', '#f2f2ec', { label: 'Seed clocks' });

presets({
  late: { flowers: '1', clocks: '3' },
  orange: { flower: '#f09a1a' },
});

const nf = Number(flowers.value);
const nc = Number(clocks.value);

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Toothed leaf lying along +X: saw-tooth edges narrowing to a point.
const toothed = (len: number, w: number) => extrudePolygon([
  [0, -w * 0.2], [len * 0.45, -w * 0.6], [len * 0.5, -w * 0.15], [len, 0], [len * 0.65, w * 0.6], [len * 0.6, w * 0.15], [0, w * 0.2],
], 6);

const patch = assembly('dandelion-patch');
const nl = 6;
for (let i = 0; i < nl; i++) {
  const az = (360 * i) / nl + 10 * (i % 2);
  // Leaves lie almost flat, tipped up 8 degrees.
  patch.part(`leaf-${i + 1}`, toothed(200 + 30 * (i % 3), 70).rotateY(-8).rotateZ(az).translate(0, 0, 2).color(leaf));
}
const stem = (x: number, y: number, sh: number) => ngon(4, 3).extrude(sh).translate(x, y, 0);
for (let i = 0; i < nf; i++) {
  const a = i * 2.39996;
  const d = i === 0 ? 0 : 50;
  const x = d * Math.cos(a);
  const y = d * Math.sin(a);
  const sh = 160 + 50 * ((i * 0.618) % 1);
  patch.part(`stem-${i + 1}`, stem(x, y, sh).color(leaf));
  patch.part(`flower-${i + 1}`, ngon(14, 6).loft([ngon(30, 6, 0.52), ngon(22, 6)], {
    planes: [
      { plane: 'XY', origin: [x, y, sh - 6] },
      { plane: 'XY', origin: [x, y, sh + 10] },
      { plane: 'XY', origin: [x, y, sh + 20] },
    ],
    ruled: true,
  }).color(flower));
}
// Seed clocks: taller stems with a round faceted puff ball.
for (let i = 0; i < nc; i++) {
  const a = i * 2.1 + 1.2;
  const x = 70 * Math.cos(a);
  const y = 70 * Math.sin(a);
  const sh = 260 + 40 * i;
  const r = 38;
  patch.part(`clock-stem-${i + 1}`, stem(x, y, sh).color(leaf));
  patch.part(`clock-${i + 1}`, ngon(r * 0.5, 6).loft([ngon(r, 6, 0.52), ngon(r * 0.5, 6)], {
    planes: [
      { plane: 'XY', origin: [x, y, sh - r * 0.2] },
      { plane: 'XY', origin: [x, y, sh + r * 0.7] },
      { plane: 'XY', origin: [x, y, sh + r * 1.6] },
    ],
    ruled: true,
  }).color(seed));
}

return patch.model();
