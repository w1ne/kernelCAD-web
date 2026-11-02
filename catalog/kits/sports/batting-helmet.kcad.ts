meta({
  name: 'batting-helmet',
  license: 'CC0-1.0',
  title: 'Batting helmet',
  description: 'Protective batting helmet prop with a domed shell, face brim and side guards.',
  tags: ['batting helmet', 'helmet', 'baseball', 'sports equipment', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#4c6f9d', { label: 'Asset color' });
const p = assembly('batting-helmet');
p.part('shell', sphere(72).scale([1.12, 1, 0.82]).translate(0, 0, 59.04).scale(scale).color(color));
p.part('brim', box(138, 100, 14, true).translate(20, -18, 7).scale(scale).color(color));
p.part('ear-guard-left', box(16, 38, 48, true).translate(-67, 0, 24).scale(scale).color(color));
p.part('ear-guard-right', box(16, 38, 48, true).translate(67, 0, 24).scale(scale).color(color));

return p.model();
