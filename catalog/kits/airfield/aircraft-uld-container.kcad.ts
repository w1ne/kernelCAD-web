meta({
  name: 'aircraft-uld-container',
  license: 'CC0-1.0',
  title: 'Aircraft ULD container',
  description: 'Rounded-corner air cargo unit load device with a raised roof and pallet base.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#8b9697', { label: 'Asset color' });
const p = assembly("aircraft-uld-container");
p.part("pallet", box(240, 210, 22, true).translate(0, 0, 11).scale(scale).color(color));
p.part("cargo-body", box(228, 198, 196, true).translate(0, 0, 120).scale(scale).color(color));
p.part("roof", box(196, 178, 26, true).translate(0, 0, 231).scale(scale).color(color));
p.part("front-lip", box(240, 18, 22, true).translate(0, 104, 29).scale(scale).color(color));

return p.model();
