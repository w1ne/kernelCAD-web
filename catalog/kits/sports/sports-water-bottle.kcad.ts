meta({
  name: 'sports-water-bottle',
  license: 'CC0-1.0',
  title: 'Sports water bottle',
  description: 'Reusable sports bottle with tapered neck and screw cap.',
  tags: ['sports bottle', 'water bottle', 'fitness', 'sports equipment', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#4b8f9e', { label: 'Asset color' });
const p = assembly('sports-water-bottle');
p.part('body', cylinder(158, 38, 12).scale(scale).color(color));
p.part('shoulder', sphere(38).scale([1, 1, 0.52]).translate(0, 0, 150).scale(scale).color(color));
p.part('neck', cylinder(28, 21, 10).translate(0, 0, 164).scale(scale).color(color));
p.part('cap', cylinder(18, 24, 10).translate(0, 0, 190).scale(scale).color(color));

return p.model();
