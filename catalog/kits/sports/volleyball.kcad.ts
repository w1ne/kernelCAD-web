meta({
  name: 'volleyball',
  license: 'CC0-1.0',
  title: 'Volleyball',
  description: 'Low-poly volleyball prop with a faceted spherical silhouette.',
  tags: ['volleyball', 'ball', 'court sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#e7e2d6', { label: 'Asset color' });
const p = assembly('volleyball');
p.part('ball', sphere(58).translate(0, 0, 58).scale(scale).color(color));

return p.model();
