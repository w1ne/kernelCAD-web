meta({
  name: 'golf-club',
  license: 'CC0-1.0',
  title: 'Golf club',
  description: 'Low-poly golf club with a metal head, long shaft and top grip.',
  tags: ['golf club', 'golf', 'sports equipment', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#77828a', { label: 'Asset color' });
const p = assembly('golf-club');
p.part('club-head', box(118, 44, 28, true).translate(30, 0, 14).scale(scale).color(color));
p.part('shaft', cylinder(660, 7, 8).translate(4, 0, 28).scale(scale).color(color));
p.part('grip', cylinder(105, 12, 8).translate(4, 0, 590).scale(scale).color(color));

return p.model();
