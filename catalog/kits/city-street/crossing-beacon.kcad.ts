// Original kernelCAD low-poly crossing beacon: a pole painted in alternating
// bands topped by a faceted amber globe, as found beside zebra crossings.
// Millimetres, Z up.

meta({
  name: 'crossing-beacon',
  license: 'CC0-1.0',
  title: 'Crossing beacon',
  description: 'Zebra crossing beacon: a banded pole with a faceted amber globe on top. Knobs: height, bands, two band colours and globe colour.',
  tags: ['beacon', 'crossing', 'zebra crossing', 'belisha beacon', 'pole', 'pedestrian', 'street'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street', 'road'],
  triangleBudget: 400,
});

const heightMm = param('heightMm', '2800', { choices: ['2400', '2800', '3200'], label: 'Height (mm)' });
const bands = param('bands', '8', { choices: ['6', '8', '10'], label: 'Bands' });
const band1 = param('band1', '#1b1c1d', { label: 'Band A' });
const band2 = param('band2', '#f2f2ee', { label: 'Band B' });
const globe = param('globe', '#f29a1c', { label: 'Globe' });

presets({
  lit: { globe: '#ffc94a' },
  yellow: { band1: '#1b1c1d', band2: '#f2c418' },
});

const H = Number(heightMm.value);
const n = Number(bands.value);
const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};

const cb = assembly('crossing-beacon');
cb.part('foot', ngon(70, 8).extrude(60).color(band1));
const bh = (H - 60) / n;
for (let i = 0; i < n; i++) {
  cb.part(`band-${i + 1}`, ngon(45, 6).extrude(bh).translate(0, 0, 60 + i * bh).color(i % 2 === 0 ? band1 : band2));
}
cb.part('cup', ngon(45, 8).loft(ngon(80, 8), { spacing: 60, ruled: true }).translate(0, 0, H).color(band1));
const gz = H + 60;
cb.part('globe', ngon(80, 10).loft([ngon(150, 10, Math.PI / 10), ngon(170, 10), ngon(150, 10, Math.PI / 10), ngon(70, 10)], {
  planes: [
    { plane: 'XY', origin: [0, 0, gz - 5] },
    { plane: 'XY', origin: [0, 0, gz + 70] },
    { plane: 'XY', origin: [0, 0, gz + 170] },
    { plane: 'XY', origin: [0, 0, gz + 270] },
    { plane: 'XY', origin: [0, 0, gz + 340] },
  ],
  ruled: true,
}).color(globe));

return cb.model();
