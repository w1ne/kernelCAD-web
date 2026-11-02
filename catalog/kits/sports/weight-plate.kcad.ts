meta({
  name: 'weight-plate',
  license: 'CC0-1.0',
  title: 'Weight plate',
  description: 'Low-poly round gym weight plate with a central bore.',
  tags: ['weight plate', 'weight', 'gym', 'training', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#5b666b', { label: 'Asset color' });
const p = assembly('weight-plate');
p.part('plate', cylinder(22, 82, 16).subtract(cylinder(24, 22, 12).translate(0, 0, -1)).scale(scale).color(color));

return p.model();
