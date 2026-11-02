meta({
  name: 'inline-skate',
  license: 'CC0-1.0',
  title: 'Inline skate',
  description: 'Low-poly inline skate boot with a cuff, chassis and three aligned wheels.',
  tags: ['inline skate', 'roller skate', 'skating', 'sports equipment', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#465c70', { label: 'Asset color' });
const p = assembly('inline-skate');
p.part('boot', box(170, 84, 88, true).translate(0, 0, 116).scale(scale).color(color));
p.part('cuff', box(92, 76, 42, true).translate(-28, 0, 174).scale(scale).color(color));
p.part('chassis', box(158, 36, 14, true).translate(0, 0, 53).scale(scale).color(color));
p.part('wheel-front', sphere(23).translate(-54, 0, 23).scale(scale).color(color));
p.part('wheel-middle', sphere(23).translate(0, 0, 23).scale(scale).color(color));
p.part('wheel-rear', sphere(23).translate(54, 0, 23).scale(scale).color(color));

return p.model();
