meta({
  name: 'jump-rope',
  license: 'CC0-1.0',
  title: 'Jump rope',
  description: 'Jump rope prop with a low-poly loop and two upright grip handles.',
  tags: ['jump rope', 'skipping rope', 'training', 'gym', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#bd5c4b', { label: 'Asset color' });
const p = assembly('jump-rope');
p.part('rope-loop', cylinder(5, 168, 20).subtract(cylinder(7, 158, 20).translate(0, 0, -1)).scale(scale).color(color));
p.part('left-handle', cylinder(94, 9, 10).translate(-166, 0, 0).scale(scale).color(color));
p.part('right-handle', cylinder(94, 9, 10).translate(166, 0, 0).scale(scale).color(color));
p.part('left-grip', cylinder(50, 13, 10).translate(-166, 0, 20).scale(scale).color(color));
p.part('right-grip', cylinder(50, 13, 10).translate(166, 0, 20).scale(scale).color(color));

return p.model();
