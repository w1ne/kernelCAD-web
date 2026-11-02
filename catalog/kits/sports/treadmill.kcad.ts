meta({
  name: 'treadmill',
  license: 'CC0-1.0',
  title: 'Treadmill',
  description: 'Low-poly treadmill with running deck, front uprights, hand rails and console.',
  tags: ['treadmill', 'cardio', 'gym', 'training', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#46545c', { label: 'Asset color' });
const p = assembly('treadmill');
p.part('deck', box(360, 142, 36, true).translate(0, 0, 105).scale(scale).color(color));
p.part('front-upright-left', box(18, 18, 245, true).translate(-126, 0, 242.5).scale(scale).color(color));
p.part('front-upright-right', box(18, 18, 245, true).translate(126, 0, 242.5).scale(scale).color(color));
p.part('console', box(300, 34, 40, true).translate(0, 0, 365).scale(scale).color(color));
p.part('console-screen', box(160, 6, 44, true).translate(0, -20, 366).scale(scale).color(color));
p.part('left-foot', box(420, 32, 12, true).translate(0, 0, 6).scale(scale).color(color));

return p.model();
