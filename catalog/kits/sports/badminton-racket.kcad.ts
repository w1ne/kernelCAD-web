meta({
  name: 'badminton-racket',
  license: 'CC0-1.0',
  title: 'Badminton racket',
  description: 'Lightweight low-poly badminton racket with a slim shaft and oval head.',
  tags: ['badminton racket', 'racket', 'badminton', 'court sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#596d62', { label: 'Asset color' });
const p = assembly('badminton-racket');
p.part('head-frame', sphere(76).scale([0.62, 0.1, 1]).subtract(sphere(63).scale([0.6, 0.25, 1.1])).translate(0, 0, 108).scale(scale).color(color));
p.part('throat', box(14, 12, 45, true).translate(0, 0, 58).scale(scale).color(color));
p.part('shaft', cylinder(86, 7, 8).scale(scale).color(color));
p.part('grip', cylinder(84, 10, 8).translate(0, 0, 0).scale(scale).color(color));
p.part('string-vertical-left', box(3, 3, 110, true).translate(-16, 0, 108).scale(scale).color(color));
p.part('string-vertical-centre', box(3, 3, 110, true).translate(0, 0, 108).scale(scale).color(color));
p.part('string-vertical-right', box(3, 3, 110, true).translate(16, 0, 108).scale(scale).color(color));
p.part('string-horizontal-1', box(54, 3, 3, true).translate(0, 0, 75).scale(scale).color(color));
p.part('string-horizontal-2', box(54, 3, 3, true).translate(0, 0, 95).scale(scale).color(color));
p.part('string-horizontal-3', box(54, 3, 3, true).translate(0, 0, 115).scale(scale).color(color));
p.part('string-horizontal-4', box(54, 3, 3, true).translate(0, 0, 135).scale(scale).color(color));

return p.model();
