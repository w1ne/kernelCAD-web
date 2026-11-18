// Slip-on pipe flange with a hollow raised neck, a four/eight-hole bolt
// circle, and an optional set of installed mounting bolts.
meta({
  name: 'pipe-flange',
  license: 'CC0-1.0',
  title: 'Pipe flange',
  description: 'Slip-on pipe flange with a hollow raised neck, four- or eight-hole bolt circle and optional installed bolts. Knobs: size, bolt count, fasteners, cast iron, stainless steel and zinc finishes.',
  tags: ['pipe flange', 'flange', 'pipe fitting', 'plumbing'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 1500,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const boltCount = param('boltCount', '4', { choices: ['4', '8'], label: 'Bolt circle holes' });
const fasteners = param('fasteners', 'open', { choices: ['open', 'installed'], label: 'Flange bolts' });
const stainless = param('stainless', '#b8c1c6', { label: 'Neck stainless steel' });
const castIron = param('castIron', '#68747a', { label: 'Flange cast iron' });
const zinc = param('zinc', '#b7c0c5', { label: 'Bolt zinc plating' });
presets({
  dark: { stainless: '#7d8a91', castIron: '#3b4246', zinc: '#727c81' },
  brass: { stainless: '#b38b52', castIron: '#69645b', zinc: '#a28b68' },
  weathered: { stainless: '#8b8275', castIron: '#4d4b46', zinc: '#756d62' },
  clean: { stainless: '#d2d9dd', castIron: '#9ba6ac', zinc: '#c4cbd0' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const count = Number(boltCount.value);
const a = assembly('pipe-flange');
const boltPositions: [number, number][] = [];
for (let i = 0; i < count; i++) {
  const angle = ((i * 360) / count + (count === 4 ? 45 : 22.5)) * Math.PI / 180;
  boltPositions.push([20.5 * Math.cos(angle), 20.5 * Math.sin(angle)]);
}

let flange = cylinder(6 * s, 28 * s, 16)
  .subtract(cylinder(8 * s, 12 * s, 16).translate(0, 0, -s));
for (const [x, y] of boltPositions) {
  flange = flange.subtract(cylinder(8 * s, 3.2 * s, 12).translate(x * s, y * s, -s));
}
a.part('flange-ring', flange.color(castIron));

const neck = cylinder(18 * s, 14 * s, 16)
  .subtract(cylinder(20 * s, 11 * s, 16).translate(0, 0, -s))
  .translate(0, 0, 5.8 * s);
a.part('slip-on-neck', neck.color(stainless));

if (fasteners.value === 'installed') {
  for (const [index, [x, y]] of boltPositions.entries()) {
    const bolt = cylinder(6 * s, 2.35 * s, 10)
      .union(cylinder(2.1 * s, 4.1 * s, 6).translate(0, 0, 5.85 * s));
    a.part(`flange-bolt-${index + 1}`, bolt.translate(x * s, y * s, 0).color(zinc));
  }
}

return a.model();
