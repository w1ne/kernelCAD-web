meta({
  name: 'single-axis-solar-tracker',
  license: 'CC0-1.0',
  title: 'Single-axis solar tracker',
  description: 'Long PV table on a central rotating shaft with end supports and drive box.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#6c8790', { label: 'Asset color' });
const p = assembly("single-axis-solar-tracker");
p.part("tracker-table-frame", box(1740, 548.4, 22, true).translate(0, 0, 522).scale(scale).color(color));
p.part("tracker-table-surface", box(1722, 530.4, 22, true).translate(0, 0, 543).scale(scale).color(color));
p.part("torque-tube", cylinder(1890, 32, 8).rotate([0, 1, 0], 90).translate(-945, 0, 372.4).scale(scale).color(color));
p.part("tracker-pier-0", box(95, 95, 380, true).translate(-840, 0, 190).scale(scale).color(color));
p.part("tracker-pier-1", box(95, 95, 380, true).translate(0, 0, 190).scale(scale).color(color));
p.part("tracker-pier-2", box(95, 95, 380, true).translate(840, 0, 190).scale(scale).color(color));
p.part("tracker-drive", box(170, 150, 130, true).translate(756, 0, 161.2).scale(scale).color(color));

return p.model();
