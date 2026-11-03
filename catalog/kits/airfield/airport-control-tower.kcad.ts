meta({
  name: 'airport-control-tower',
  license: 'CC0-1.0',
  title: 'Airport control tower',
  description: 'Air traffic control tower with a tapered shaft, glazed cab and broad roof cap.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#82949a', { label: 'Asset color' });
const p = assembly("airport-control-tower");
p.part("base", box(230, 230, 140, true).translate(0, 0, 70).scale(scale).color(color));
p.part("shaft", box(150, 150, 540, true).translate(0, 0, 410).scale(scale).color(color));
p.part("control-cab", box(300, 280, 130, true).translate(0, 0, 745).scale(scale).color(color));
p.part("roof-cap", box(330, 310, 24, true).translate(0, 0, 822).scale(scale).color(color));
p.part("left-cab-window-band", box(18, 232, 72, true).translate(-104, 0, 745).scale(scale).color(color));
p.part("right-cab-window-band", box(18, 232, 72, true).translate(104, 0, 745).scale(scale).color(color));

return p.model();
