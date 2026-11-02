meta({
  name: 'solar-battery-container',
  license: 'CC0-1.0',
  title: 'Solar battery container',
  description: 'Large storage enclosure with paired access doors, end vents and corner lifting blocks.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#737d78', { label: 'Asset color' });
const p = assembly("solar-battery-container");
p.part("battery-container-plinth", box(1594, 819.2, 36, true).translate(0, 0, 18).scale(scale).color(color));
p.part("battery-container-body", box(1566, 791.2, 1073.2, true).translate(0, 0, 575.6).scale(scale).color(color));
p.part("battery-container-door-1", box(763, 8, 1029.2, true).translate(-385.5, 398.6, 571.6).scale(scale).color(color));
p.part("battery-container-handle-1", box(12, 18, 72, true).translate(-107.94, 409.6, 575.6).scale(scale).color(color));
p.part("battery-container-door-2", box(763, 8, 1029.2, true).translate(385.5, 398.6, 571.6).scale(scale).color(color));
p.part("battery-container-handle-2", box(12, 18, 72, true).translate(663.06, 409.6, 575.6).scale(scale).color(color));
p.part("battery-container-vent-1", box(751.68, 10, 8, true).translate(0, 407.6, 100).scale(scale).color(color));
p.part("battery-container-vent-2", box(751.68, 10, 8, true).translate(0, 407.6, 235.867).scale(scale).color(color));
p.part("battery-container-vent-3", box(751.68, 10, 8, true).translate(0, 407.6, 371.733).scale(scale).color(color));
p.part("battery-container-vent-4", box(751.68, 10, 8, true).translate(0, 407.6, 507.6).scale(scale).color(color));
p.part("battery-container-vent-5", box(751.68, 10, 8, true).translate(0, 407.6, 643.467).scale(scale).color(color));
p.part("battery-container-vent-6", box(751.68, 10, 8, true).translate(0, 407.6, 779.333).scale(scale).color(color));
p.part("battery-container-vent-7", box(751.68, 10, 8, true).translate(0, 407.6, 915.2).scale(scale).color(color));
p.part("lifting-corner-0", box(120, 828, 120, true).translate(-730.8, 0, 1251.2).scale(scale).color(color));
p.part("lifting-corner-1", box(120, 828, 120, true).translate(730.8, 0, 1251.2).scale(scale).color(color));
p.part("cooling-unit-0", box(313.2, 90, 462.4, true).translate(0, -349.6, 571.2).scale(scale).color(color));
p.part("cooling-unit-1", box(313.2, 90, 462.4, true).translate(0, 349.6, 571.2).scale(scale).color(color));

return p.model();
