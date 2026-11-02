meta({
  name: 'basketball-hoop',
  license: 'CC0-1.0',
  title: 'Basketball hoop',
  description: 'Freestanding court hoop with backboard, support arm, hollow rim and weighted floor base.',
  tags: ['basketball hoop', 'backboard', 'court', 'sports equipment', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#647987', { label: 'Asset color' });
const p = assembly('basketball-hoop');
p.part('base', box(120, 92, 18, true).translate(0, 0, 9).scale(scale).color(color));
p.part('upright', cylinder(330, 13, 10).scale(scale).color(color));
p.part('support-arm', box(100, 16, 16, true).translate(0, 0, 265).scale(scale).color(color));
p.part('backboard', box(220, 14, 150, true).translate(0, 0, 340).scale(scale).color(color));
p.part('rim', cylinder(8, 56, 16).subtract(cylinder(10, 43, 16).translate(0, 0, -1)).translate(0, 0, 236).scale(scale).color(color));

return p.model();
