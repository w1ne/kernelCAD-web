meta({
  name: 'skateboard',
  license: 'CC0-1.0',
  title: 'Skateboard',
  description: 'Low-poly skateboard deck with two trucks and four wheels.',
  tags: ['skateboard', 'skateboarding', 'board sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#a75e3b', { label: 'Asset color' });
const p = assembly('skateboard');
p.part('deck', box(310, 82, 18, true).translate(0, 0, 112).scale(scale).color(color));
p.part('front-truck', box(74, 38, 18, true).translate(-96, 0, 73).scale(scale).color(color));
p.part('rear-truck', box(74, 38, 18, true).translate(96, 0, 73).scale(scale).color(color));
p.part('wheel-front-left', sphere(24).translate(-100, -48, 24).scale(scale).color(color));
p.part('wheel-front-right', sphere(24).translate(-100, 48, 24).scale(scale).color(color));
p.part('wheel-rear-left', sphere(24).translate(100, -48, 24).scale(scale).color(color));
p.part('wheel-rear-right', sphere(24).translate(100, 48, 24).scale(scale).color(color));

return p.model();
