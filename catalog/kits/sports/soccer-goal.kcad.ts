meta({
  name: 'soccer-goal',
  license: 'CC0-1.0',
  title: 'Soccer goal',
  description: 'Small freestanding soccer goal with posts, crossbar and a simplified open net frame.',
  tags: ['soccer goal', 'football goal', 'net', 'field sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#e5e9e7', { label: 'Asset color' });
const p = assembly('soccer-goal');
p.part('left-post', cylinder(210, 7, 10).translate(-145, 0, 0).scale(scale).color(color));
p.part('right-post', cylinder(210, 7, 10).translate(145, 0, 0).scale(scale).color(color));
p.part('crossbar', box(302, 14, 14, true).translate(0, 0, 210).scale(scale).color(color));
p.part('net-roof', box(282, 90, 5, true).translate(0, 42, 205).scale(scale).color(color));
p.part('net-side-left', box(5, 90, 205, true).translate(-140, 42, 105).scale(scale).color(color));
p.part('net-side-right', box(5, 90, 205, true).translate(140, 42, 105).scale(scale).color(color));
p.part('net-floor', box(282, 90, 5, true).translate(0, 42, 4).scale(scale).color(color));

return p.model();
