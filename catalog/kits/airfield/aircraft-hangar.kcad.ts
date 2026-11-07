meta({
  name: 'aircraft-hangar',
  license: 'CC0-1.0',
  title: 'Aircraft hangar',
  description: 'Large apron hangar with a wide front opening, deep roof, side walls and upper roof ridge.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#a0a29b', { label: 'Asset color' });
const p = assembly("aircraft-hangar");
p.part("left-wall", box(24, 540, 300, true).translate(-330, 0, 150).scale(scale).color(color));
p.part("right-wall", box(24, 540, 300, true).translate(330, 0, 150).scale(scale).color(color));
p.part("rear-wall", box(660, 24, 300, true).translate(0, -258, 150).scale(scale).color(color));
p.part("roof", box(700, 600, 34, true).translate(0, 0, 317).scale(scale).color(color));
p.part("ridge", box(700, 24, 36, true).translate(0, 0, 352).scale(scale).color(color));
p.part("door-header", box(510, 28, 36, true).translate(0, 274, 282).scale(scale).color(color));

return p.model();
