// Pole-mount transformer: Utility pole carrying a cylindrical transformer tank and crossarm insulators
meta({
  name: 'pole-mount-transformer',
  license: 'CC0-1.0',
  title: 'Pole-mount transformer',
  description: 'Utility pole carrying a cylindrical transformer tank and crossarm insulators. Material controls: treated wood, powder-coated steel, porcelain ceramic.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const wood = param('wood', '#856849', { label: 'Treated wood' });
const powderCoat = param('powderCoat', '#687c7c', { label: 'Powder-coated steel' });
const ceramic = param('ceramic', '#eee8d8', { label: 'Porcelain ceramic' });
presets({
  fieldService: { wood: '#755b43', powderCoat: '#7a807b', ceramic: '#e7e0ce' },
  highVisibility: { wood: '#8a6440', powderCoat: '#d1722b', ceramic: '#fff3d1' },
});
const p = assembly("pole-mount-transformer");
p.part("utility-pole", cylinder(1307.2, 46, 8).translate(0, 0, 0).scale(scale).color(wood));
p.part("transformer-tank", cylinder(425.6, 132, 12).translate(0, 0, 851.2).scale(scale).color(powderCoat));
p.part("crossarm", box(440, 56, 54, true).translate(0, 0, 1307.2).scale(scale).color(wood));
p.part("insulator-0", cylinder(100, 36, 8).translate(-154, 0, 1368).scale(scale).color(ceramic));
p.part("insulator-1", cylinder(100, 36, 8).translate(0, 0, 1368).scale(scale).color(ceramic));
p.part("insulator-2", cylinder(100, 36, 8).translate(154, 0, 1368).scale(scale).color(ceramic));

return p.model();
