meta({
  name: 'cricket-wicket',
  license: 'CC0-1.0',
  title: 'Cricket wicket',
  description: 'Three-stump wicket set on a low ground plate with two cross bails.',
  tags: ['cricket wicket', 'stumps', 'cricket', 'field sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#b18b5f', { label: 'Asset color' });
const p = assembly('cricket-wicket');
p.part('ground-plate', box(116, 58, 6, true).translate(0, 0, 3).scale(scale).color(color));
p.part('stump-left', cylinder(58, 4, 8).translate(-18, 0, 6).scale(scale).color(color));
p.part('stump-middle', cylinder(58, 4, 8).translate(0, 0, 6).scale(scale).color(color));
p.part('stump-right', cylinder(58, 4, 8).translate(18, 0, 6).scale(scale).color(color));
p.part('bail-left', box(26, 6, 5, true).translate(-12, 0, 61).scale(scale).color(color));
p.part('bail-right', box(26, 6, 5, true).translate(12, 0, 61).scale(scale).color(color));

return p.model();
