meta({
  name: 'dumbbell',
  license: 'CC0-1.0',
  title: 'Dumbbell',
  description: 'Compact low-poly dumbbell with a horizontal handle and weighted ends.',
  tags: ['dumbbell', 'free weights', 'gym', 'training', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#69747a', { label: 'Asset color' });
const p = assembly('dumbbell');
p.part('handle', box(115, 18, 18, true).translate(0, 0, 40).scale(scale).color(color));
p.part('left-weight', sphere(40).scale([0.68, 1, 1]).translate(-76, 0, 40).scale(scale).color(color));
p.part('right-weight', sphere(40).scale([0.68, 1, 1]).translate(76, 0, 40).scale(scale).color(color));

return p.model();
