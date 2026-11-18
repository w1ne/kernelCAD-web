// Original kernelCAD low-poly manhole cover: a cast-iron lid with raised grip
// bars and a rim ring, seated in a square paving frame. Millimetres, Z up,
// frame top 60 mm above z = 0, lid just proud of it.

meta({
  name: 'manhole-cover',
  license: 'CC0-1.0',
  title: 'Manhole cover',
  description: 'Round or square cast-iron manhole lid with raised grip bars in a square frame, to drop onto road or pavement. Knobs: shape, grip bars, frame and lid colours.',
  tags: ['manhole', 'cover', 'drain', 'sewer', 'lid', 'road', 'pavement', 'street'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street', 'road'],
  triangleBudget: 300,
});

const shape = param('shape', 'round', { choices: ['round', 'square'], label: 'Lid shape' });
const bars = param('bars', '5', { choices: ['3', '5', '7'], label: 'Grip bars' });
const frame = param('frame', '#8d8c88', { label: 'Frame' });
const lid = param('lid', '#3b3d40', { label: 'Lid' });

presets({
  rusty: { lid: '#6b4a34', frame: '#7a776f' },
  asphalt: { frame: '#3e3f42', lid: '#55585c' },
});

const round = shape.value === 'round';
const n = Number(bars.value);
const R = 330;
const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const outline = (r: number) => (round ? ngon(r, 12) : ngon(r * Math.SQRT2, 4, Math.PI / 4));

const m = assembly('manhole-cover');
m.part('frame', box(820, 820, 60, true).translate(0, 0, 30).color(frame));
m.part('lid', outline(R).extrude(66).color(lid));
m.part('rim', outline(R - 10).extrude(10).subtract(outline(R - 45).extrude(30).translate(0, 0, -10)).translate(0, 0, 60).color(lid));
// Parallel grip bars inside the rim, each trimmed to the lid outline.
const inner = R - 65;
for (let i = 0; i < n; i++) {
  const y = -inner + ((2 * inner) * (i + 0.5)) / n;
  const half = round ? Math.sqrt(inner * inner - y * y) : inner;
  m.part(`bar-${i + 1}`, box(2 * half, 26, 10, true).translate(0, y, 70).color(lid));
}

return m.model();
