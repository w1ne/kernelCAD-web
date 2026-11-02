meta({
  name: 'tennis-ball',
  license: 'CC0-1.0',
  title: 'Tennis ball',
  description: 'Compact low-poly tennis ball prop.',
  tags: ['tennis ball', 'ball', 'tennis', 'court sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#b6c84c', { label: 'Asset color' });
const p = assembly('tennis-ball');
p.part('ball', sphere(34).translate(0, 0, 34).scale(scale).color(color));

return p.model();
