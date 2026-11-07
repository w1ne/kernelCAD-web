// Cricket Wicket: Three-stump wicket set on a low ground plate with two cross bails. Low-poly sports prop in millimetres, Z up; materials: wicket timber, ground rubber, bail paint.
meta({
  name: 'cricket-wicket',
  license: 'CC0-1.0',
  title: 'Cricket wicket',
  description: "Three-stump wicket set on a low ground plate with two cross bails. Material controls: wicket timber, ground rubber, bail paint.",
  tags: ['cricket wicket', 'stumps', 'cricket', 'field sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const wicketTimber = param('wicketTimber', '#b18b5f', { label: 'Wicket timber' });
const groundRubber = param('groundRubber', '#5b625d', { label: 'Ground rubber' });
const bailPaint = param('bailPaint', '#e8e1d0', { label: 'Bail paint' });
presets({ clubColors: { wicketTimber: '#8f744f', groundRubber: '#5b625d' } });
const p = assembly('cricket-wicket');
p.part('ground-plate', box(116, 58, 6, true).translate(0, 0, 3).scale(scale).color(groundRubber));
p.part('stump-left', cylinder(58, 4, 8).translate(-18, 0, 6).scale(scale).color(wicketTimber));
p.part('stump-middle', cylinder(58, 4, 8).translate(0, 0, 6).scale(scale).color(wicketTimber));
p.part('stump-right', cylinder(58, 4, 8).translate(18, 0, 6).scale(scale).color(wicketTimber));
p.part('bail-left', box(26, 6, 5, true).translate(-12, 0, 61).scale(scale).color(bailPaint));
p.part('bail-right', box(26, 6, 5, true).translate(12, 0, 61).scale(scale).color(bailPaint));

return p.model();
