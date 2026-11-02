meta({
  name: 'foam-roller',
  license: 'CC0-1.0',
  title: 'Foam roller',
  description: 'Low-poly cylindrical foam roller laid horizontally on the floor.',
  tags: ['foam roller', 'fitness', 'gym', 'recovery', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#a16c60', { label: 'Asset color' });
const p = assembly('foam-roller');
p.part('roller', cylinder(220, 50, 12).rotate([1, 0, 0], 90).translate(0, 110, 50).scale(scale).color(color));

return p.model();
