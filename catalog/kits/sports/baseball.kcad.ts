meta({
  name: 'baseball',
  license: 'CC0-1.0',
  title: 'Baseball',
  description: 'Compact low-poly baseball prop with a faceted spherical form.',
  tags: ['baseball', 'ball', 'bat and ball', 'field sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#eee9dd', { label: 'Asset color' });
const p = assembly('baseball');
p.part('ball', sphere(34).translate(0, 0, 34).scale(scale).color(color));

return p.model();
