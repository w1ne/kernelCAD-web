meta({
  name: 'shuttlecock',
  license: 'CC0-1.0',
  title: 'Shuttlecock',
  description: 'Low-poly badminton shuttlecock with a rounded cork tip and flared skirt.',
  tags: ['shuttlecock', 'badminton', 'birdie', 'court sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#e8e4d8', { label: 'Asset color' });
const p = assembly('shuttlecock');
p.part('cork', sphere(19).translate(0, 0, 19).scale(scale).color(color));
p.part('skirt', sphere(43).scale([0.9, 0.9, 0.55]).translate(0, 0, 63).scale(scale).color(color));
p.part('crown', cylinder(8, 39, 10).translate(0, 0, 91).scale(scale).color(color));

return p.model();
