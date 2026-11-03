meta({
  name: 'american-football',
  license: 'CC0-1.0',
  title: 'American football',
  description: 'Elongated low-poly football with a pointed oval profile.',
  tags: ['american football', 'football', 'ball', 'field sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#98552f', { label: 'Asset color' });
const p = assembly('american-football');
p.part('ball', sphere(48).scale([1.55, 0.82, 0.82]).translate(0, 0, 39.36).scale(scale).color(color));

return p.model();
