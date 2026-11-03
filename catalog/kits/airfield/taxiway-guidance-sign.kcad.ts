meta({
  name: 'taxiway-guidance-sign',
  license: 'CC0-1.0',
  title: 'Taxiway guidance sign',
  description: 'Freestanding airfield guidance sign with a wide panel, two posts and weighted feet.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#a88f4d', { label: 'Asset color' });
const p = assembly("taxiway-guidance-sign");
p.part("panel", box(270, 38, 116, true).translate(0, 0, 225).scale(scale).color(color));
p.part("left-post", box(14, 14, 192, true).translate(-96, 0, 96).scale(scale).color(color));
p.part("right-post", box(14, 14, 192, true).translate(96, 0, 96).scale(scale).color(color));
p.part("left-foot", box(60, 54, 16, true).translate(-96, 0, 8).scale(scale).color(color));
p.part("right-foot", box(60, 54, 16, true).translate(96, 0, 8).scale(scale).color(color));

return p.model();
