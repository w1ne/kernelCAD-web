meta({
  name: 'pole-mount-transformer',
  license: 'CC0-1.0',
  title: 'Pole-mount transformer',
  description: 'Utility pole carrying a cylindrical transformer tank and crossarm insulators.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#78817a', { label: 'Asset color' });
const p = assembly("pole-mount-transformer");
p.part("utility-pole", cylinder(1307.2, 46, 8).translate(0, 0, 0).scale(scale).color(color));
p.part("transformer-tank", cylinder(425.6, 132, 12).translate(0, 0, 851.2).scale(scale).color(color));
p.part("crossarm", box(440, 56, 54, true).translate(0, 0, 1307.2).scale(scale).color(color));
p.part("insulator-0", cylinder(100, 36, 8).translate(-154, 0, 1368).scale(scale).color(color));
p.part("insulator-1", cylinder(100, 36, 8).translate(0, 0, 1368).scale(scale).color(color));
p.part("insulator-2", cylinder(100, 36, 8).translate(154, 0, 1368).scale(scale).color(color));

return p.model();
