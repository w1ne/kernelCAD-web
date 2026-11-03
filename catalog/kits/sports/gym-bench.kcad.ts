meta({
  name: 'gym-bench',
  license: 'CC0-1.0',
  title: 'Gym bench',
  description: 'Low-poly adjustable bench prop with padded top, support frame and floor feet.',
  tags: ['gym bench', 'weight bench', 'gym', 'training', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#555e65', { label: 'Asset color' });
const p = assembly('gym-bench');
p.part('pad', box(330, 112, 30, true).translate(0, 0, 330).scale(scale).color(color));
p.part('front-leg', box(24, 86, 290, true).translate(-102, 0, 145).scale(scale).color(color));
p.part('rear-leg', box(24, 86, 252, true).translate(108, 0, 126).scale(scale).color(color));
p.part('crossbar', box(220, 22, 18, true).translate(2, 0, 75).scale(scale).color(color));
p.part('front-foot', box(105, 32, 12, true).translate(-102, 0, 6).scale(scale).color(color));
p.part('rear-foot', box(105, 32, 12, true).translate(108, 0, 6).scale(scale).color(color));

return p.model();
