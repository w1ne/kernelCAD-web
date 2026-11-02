meta({
  name: 'cricket-bat',
  license: 'CC0-1.0',
  title: 'Cricket bat',
  description: 'Low-poly cricket bat with a wide flat blade, shoulders and slim handle.',
  tags: ['cricket bat', 'bat', 'cricket', 'field sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#9a754d', { label: 'Asset color' });
const p = assembly('cricket-bat');
p.part('blade', box(82, 28, 190, true).translate(0, 0, 95).scale(scale).color(color));
p.part('shoulder', box(42, 24, 45, true).translate(0, 0, 203).scale(scale).color(color));
p.part('handle', cylinder(145, 12, 10).translate(0, 0, 225).scale(scale).color(color));
p.part('grip-cap', cylinder(8, 16, 10).translate(0, 0, 370).scale(scale).color(color));

return p.model();
