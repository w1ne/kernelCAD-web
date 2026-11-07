meta({
  name: 'soccer-ball',
  license: 'CC0-1.0',
  title: 'Soccer ball',
  description: 'Low-poly spherical ball prop for a football pitch or training scene.',
  tags: ['soccer ball', 'football', 'ball', 'field sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#ece8d6', { label: 'Asset color' });
const p = assembly('soccer-ball');
p.part('ball', sphere(58).translate(0, 0, 58).scale(scale).color(color));

return p.model();
