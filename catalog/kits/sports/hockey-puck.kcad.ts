meta({
  name: 'hockey-puck',
  license: 'CC0-1.0',
  title: 'Hockey puck',
  description: 'Low-poly cylindrical ice hockey puck prop.',
  tags: ['hockey puck', 'puck', 'ice hockey', 'indoor sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#383d42', { label: 'Asset color' });
const p = assembly('hockey-puck');
p.part('puck', cylinder(24, 38, 12).scale(scale).color(color));

return p.model();
