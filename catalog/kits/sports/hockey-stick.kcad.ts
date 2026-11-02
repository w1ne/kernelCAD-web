meta({
  name: 'hockey-stick',
  license: 'CC0-1.0',
  title: 'Field hockey stick',
  description: 'Low-poly field hockey stick with a long shaft and hooked blade.',
  tags: ['hockey stick', 'field hockey', 'stick', 'field sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#8a6844', { label: 'Asset color' });
const p = assembly('hockey-stick');
p.part('shaft', box(18, 20, 620, true).translate(0, 0, 310).scale(scale).color(color));
p.part('blade', box(112, 22, 22, true).translate(44, 0, 11).scale(scale).color(color));
p.part('heel', box(34, 22, 54, true).translate(6, 0, 38).scale(scale).color(color));

return p.model();
