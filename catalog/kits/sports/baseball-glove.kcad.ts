meta({
  name: 'baseball-glove',
  license: 'CC0-1.0',
  title: 'Baseball glove',
  description: 'Open mitt-shaped glove prop with a broad palm, wrist cuff and raised finger pads.',
  tags: ['baseball glove', 'mitt', 'baseball', 'sports equipment', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#9a5938', { label: 'Asset color' });
const p = assembly('baseball-glove');
p.part('wrist-cuff', box(70, 62, 38, true).translate(0, 0, 19).scale(scale).color(color));
p.part('palm', sphere(66).scale([1.12, 0.85, 0.58]).translate(0, 0, 86).scale(scale).color(color));
p.part('finger-one', sphere(25).translate(-47, 0, 142).scale(scale).color(color));
p.part('finger-two', sphere(25).translate(-16, 0, 153).scale(scale).color(color));
p.part('finger-three', sphere(25).translate(16, 0, 153).scale(scale).color(color));
p.part('finger-four', sphere(25).translate(47, 0, 142).scale(scale).color(color));
p.part('thumb', sphere(29).scale([0.82, 0.82, 1.35]).translate(73, -4, 100).scale(scale).color(color));

return p.model();
