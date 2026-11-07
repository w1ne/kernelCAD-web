meta({
  name: 'basketball',
  license: 'CC0-1.0',
  title: 'Basketball',
  description: 'Low-poly basketball prop with a faceted spherical silhouette.',
  tags: ['basketball', 'ball', 'court', 'indoor sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#d47a32', { label: 'Asset color' });
const p = assembly('basketball');
p.part('ball', sphere(62).translate(0, 0, 62).scale(scale).color(color));

return p.model();
