meta({
  name: 'baseball-bat',
  license: 'CC0-1.0',
  title: 'Baseball bat',
  description: 'Upright low-poly baseball bat with a narrow grip and widened barrel.',
  tags: ['baseball bat', 'bat', 'baseball', 'sports equipment', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#9b7046', { label: 'Asset color' });
const p = assembly('baseball-bat');
p.part('grip', cylinder(125, 12, 10).scale(scale).color(color));
p.part('taper', cylinder(90, 17, 10).translate(0, 0, 115).scale(scale).color(color));
p.part('barrel', cylinder(250, 25, 12).translate(0, 0, 195).scale(scale).color(color));
p.part('knob', cylinder(10, 19, 10).translate(0, 0, 0).scale(scale).color(color));

return p.model();
