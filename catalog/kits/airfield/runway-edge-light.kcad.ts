meta({
  name: 'runway-edge-light',
  license: 'CC0-1.0',
  title: 'Runway edge light',
  description: 'Low runway-edge fixture with a broad ground plate, short stem and raised light housing.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#b4a05e', { label: 'Asset color' });
const p = assembly("runway-edge-light");
p.part("ground-plate", box(92, 72, 12, true).translate(0, 0, 6).scale(scale).color(color));
p.part("light-stem", cylinder(50, 11, 8).translate(0, 0, 12).scale(scale).color(color));
p.part("lamp-housing", sphere(24).scale([1.1, 1.1, 0.72]).translate(0, 0, 62).scale(scale).color(color));

return p.model();
