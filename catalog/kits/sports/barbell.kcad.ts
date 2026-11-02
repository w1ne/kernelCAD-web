meta({
  name: 'barbell',
  license: 'CC0-1.0',
  title: 'Barbell',
  description: 'Low-poly barbell with a long horizontal shaft and stacked spherical plate forms.',
  tags: ['barbell', 'weight bar', 'gym', 'training', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#56636c', { label: 'Asset color' });
const p = assembly('barbell');
p.part('shaft', box(680, 16, 16, true).translate(0, 0, 78).scale(scale).color(color));
p.part('left-inner-plate', sphere(58).scale([0.28, 1, 1]).translate(-224, 0, 74).scale(scale).color(color));
p.part('left-outer-plate', sphere(74).scale([0.28, 1, 1]).translate(-280, 0, 74).scale(scale).color(color));
p.part('right-inner-plate', sphere(58).scale([0.28, 1, 1]).translate(224, 0, 74).scale(scale).color(color));
p.part('right-outer-plate', sphere(74).scale([0.28, 1, 1]).translate(280, 0, 74).scale(scale).color(color));

return p.model();
