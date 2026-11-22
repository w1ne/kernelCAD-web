// Solid pipe-end closure with a raised sealing face, selectable bolt circle,
// and optional installed flange fasteners.
meta({
  name: 'blind-flange',
  license: 'CC0-1.0',
  title: 'Blind flange',
  description: 'Solid cast-iron pipe-end closure with a raised sealing face, four- or eight-hole bolt circle and optional installed bolts. Knobs: size, bolt count, fasteners, cast iron, bronze and zinc finishes.',
  tags: ['blind flange', 'pipe cap', 'flange', 'plumbing'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 1500,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const boltCount = param('boltCount', '4', { choices: ['4', '8'], label: 'Bolt circle holes' });
const fasteners = param('fasteners', 'open', { choices: ['open', 'installed'], label: 'Flange bolts' });
const castIron = param('castIron', '#68747a', { label: 'Cast iron' });
const bronze = param('bronze', '#98714c', { label: 'Raised sealing face bronze' });
const zinc = param('zinc', '#b7c0c5', { label: 'Bolt zinc plating' });
presets({
  dark: { castIron: '#3b4246', bronze: '#684d37', zinc: '#727c81' },
  brass: { castIron: '#69645b', bronze: '#b0804d', zinc: '#a28b68' },
  weathered: { castIron: '#4d4b46', bronze: '#6e583f', zinc: '#756d62' },
  clean: { castIron: '#a9b1b6', bronze: '#b18a53', zinc: '#c4cbd0' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const count = Number(boltCount.value);
const a = assembly('blind-flange');
const boltPositions: [number, number][] = [];
for (let i = 0; i < count; i++) {
  const angle = ((i * 360) / count + (count === 4 ? 45 : 22.5)) * Math.PI / 180;
  boltPositions.push([20.5 * Math.cos(angle), 20.5 * Math.sin(angle)]);
}

let flange = cylinder(8 * s, 28 * s, 16);
for (const [x, y] of boltPositions) {
  flange = flange.subtract(cylinder(10 * s, 3.2 * s, 12).translate(x * s, y * s, -s));
}
a.part('blind-flange-body', flange.color(castIron));
a.part('raised-sealing-face', cylinder(2.2 * s, 10.5 * s, 16).translate(0, 0, 8 * s).color(bronze));

if (fasteners.value === 'installed') {
  for (const [index, [x, y]] of boltPositions.entries()) {
    const bolt = cylinder(8 * s, 2.35 * s, 10)
      .union(cylinder(2.3 * s, 4.15 * s, 6).translate(0, 0, 7.85 * s));
    a.part(`flange-bolt-${index + 1}`, bolt.translate(x * s, y * s, 0).color(zinc));
  }
}

return a.model();
