meta({
  name: 'track-hurdle',
  license: 'CC0-1.0',
  title: 'Track hurdle',
  description: 'Portable low-poly running hurdle with two feet, uprights and a crossbar.',
  tags: ['track hurdle', 'hurdle', 'athletics', 'track', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#c95748', { label: 'Asset color' });
const p = assembly('track-hurdle');
p.part('left-upright', cylinder(170, 6, 8).translate(-115, 0, 0).scale(scale).color(color));
p.part('right-upright', cylinder(170, 6, 8).translate(115, 0, 0).scale(scale).color(color));
p.part('crossbar', box(250, 16, 14, true).translate(0, 0, 170).scale(scale).color(color));
p.part('left-foot', box(88, 24, 8, true).translate(-115, 0, 4).scale(scale).color(color));
p.part('right-foot', box(88, 24, 8, true).translate(115, 0, 4).scale(scale).color(color));

return p.model();
