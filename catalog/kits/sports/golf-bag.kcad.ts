meta({
  name: 'golf-bag',
  license: 'CC0-1.0',
  title: 'Golf bag',
  description: 'Upright golf bag with a broad lower body, tapered-looking rim and club tops.',
  tags: ['golf bag', 'golf', 'sports equipment', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#42675d', { label: 'Asset color' });
const p = assembly('golf-bag');
p.part('bag-body', cylinder(380, 65, 12).translate(0, 0, 0).scale(scale).color(color));
p.part('base', cylinder(24, 76, 12).translate(0, 0, 0).scale(scale).color(color));
p.part('rim', cylinder(14, 72, 12).translate(0, 0, 380).scale(scale).color(color));
p.part('club-a', cylinder(180, 5, 8).translate(-28, -15, 392).scale(scale).color(color));
p.part('club-b', cylinder(195, 5, 8).translate(0, 0, 392).scale(scale).color(color));
p.part('club-c', cylinder(170, 5, 8).translate(28, 15, 392).scale(scale).color(color));
p.part('strap', box(14, 40, 260, true).translate(68, 0, 190).scale(scale).color(color));

return p.model();
