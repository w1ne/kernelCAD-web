meta({
  name: 'yoga-block',
  license: 'CC0-1.0',
  title: 'Yoga block',
  description: 'Simple low-poly foam yoga block with a broad rectangular profile.',
  tags: ['yoga block', 'fitness', 'yoga', 'training', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#8c6b78', { label: 'Asset color' });
const p = assembly('yoga-block');
p.part('block', box(180, 105, 65, true).translate(0, 0, 32.5).scale(scale).color(color));

return p.model();
