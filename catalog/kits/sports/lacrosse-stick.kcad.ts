meta({
  name: 'lacrosse-stick',
  license: 'CC0-1.0',
  title: 'Lacrosse stick',
  description: 'Low-poly lacrosse stick with a long shaft and broad oval head.',
  tags: ['lacrosse stick', 'stick', 'lacrosse', 'field sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#78756c', { label: 'Asset color' });
const p = assembly('lacrosse-stick');
p.part('shaft', cylinder(580, 9, 10).scale(scale).color(color));
p.part('head', sphere(68).scale([0.72, 1.05, 0.14]).translate(0, 0, 618).scale(scale).color(color));
p.part('throat', box(16, 16, 42, true).translate(0, 0, 580).scale(scale).color(color));

return p.model();
