// Original kernelCAD low-poly fern: a rosette of arching fronds. Each frond is
// an upswept stalk blade plus a drooping blade with a zig-zag leaflet edge.

meta({
  name: 'fern',
  license: 'CC0-1.0',
  title: 'Fern',
  description: 'Forest-floor fern rosette with arching tapered fronds. Knobs: size, frond count, frond and stalk colours.',
  tags: ['fern', 'plant', 'undergrowth', 'forest floor', 'jungle', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'forest', 'swamp'],
  triangleBudget: 300,
});

const size = param('size', '0.8', { choices: ['0.5', '0.8', '1.2'], label: 'Frond length (m)' });
const fronds = param('fronds', '7', { choices: ['5', '6', '7', '8'], label: 'Fronds' });
const frond = param('frond', '#3e8f3a', { label: 'Fronds' });
const stalk = param('stalk', '#5d6e2c', { label: 'Base' });

presets({
  autumn: { frond: '#b8742c', stalk: '#7a5a2e' },
  dry: { frond: '#9a9a48' },
});

const h = Number(size.value) * 1000;
const ngon = (r: number, s: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < s; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / s), r * Math.sin((2 * Math.PI * k) / s));
  return p.close();
};
const n = Number(fronds.value);

// Fronds are thin plates along +X in three pieces: a steep stalk, a wide
// leafy middle that levels out, and a drooping pointed tip.
const plate = (pts: [number, number][]) => extrudePolygon(pts, 12).translate(0, 0, -6);
const rad = (d: number) => (d * Math.PI) / 180;

const fern = assembly('fern');
fern.part('base', ngon(h * 0.07, 5).loft(ngon(h * 0.035, 5), { spacing: h * 0.1, ruled: true }).color(stalk));
const L1 = h * 0.3;
const L2 = h * 0.5;
const L3 = h * 0.4;
const w = h * 0.1;
for (let i = 0; i < n; i++) {
  const az = (360 * i) / n + (i % 2) * 15;
  const a1 = 68 + (i % 3) * 6;
  const a2 = 22 + (i % 2) * 10;
  const a3 = -28 - (i % 3) * 6;
  const p1 = [L1 * Math.cos(rad(a1)), L1 * Math.sin(rad(a1))];
  const p2 = [p1[0] + L2 * Math.cos(rad(a2)), p1[1] + L2 * Math.sin(rad(a2))];
  const pieces = [
    plate([[0, -w * 0.2], [L1, -w * 0.35], [L1, w * 0.35], [0, w * 0.2]]).rotateY(-a1),
    plate([[0, -w * 0.35], [L2, -w], [L2, w], [0, w * 0.35]]).rotateY(-a2).translate(p1[0], 0, p1[1]),
    plate([[0, -w], [L3, 0], [0, w]]).rotateY(-a3).translate(p2[0], 0, p2[1]),
  ];
  pieces.forEach((piece, k) => {
    fern.part(`frond-${i + 1}-${k + 1}`, piece.rotateZ(az).translate(0, 0, h * 0.06).color(frond));
  });
}

return fern.model();
