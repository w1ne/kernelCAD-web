meta({
  name: 'yoga-mat',
  license: 'CC0-1.0',
  title: 'Yoga mat',
  description: 'Rolled yoga mat prop with a flat practice surface and cylindrical roll.',
  tags: ['yoga mat', 'fitness', 'yoga', 'training', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#6b8978', { label: 'Asset color' });
const p = assembly('yoga-mat');
p.part('mat', box(300, 210, 8, true).translate(0, 0, 4).scale(scale).color(color));
p.part('rolled-edge', cylinder(210, 28, 12).rotate([1, 0, 0], 90).translate(0, 105, 28).scale(scale).color(color));

return p.model();
