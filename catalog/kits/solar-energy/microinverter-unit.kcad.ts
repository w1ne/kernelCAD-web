meta({
  name: 'microinverter-unit',
  license: 'CC0-1.0',
  title: 'Microinverter unit',
  description: 'Compact sealed microinverter case with mounting ears, cooling fins and cable ends.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#65777d', { label: 'Asset color' });
const p = assembly("microinverter-unit");
p.part("microinverter-body", box(235.6, 155.8, 75.6, true).translate(0, 0, 44.1).scale(scale).color(color));
p.part("heat-fin-0", box(223.2, 12, 8, true).translate(0, -60.8, 90.3).scale(scale).color(color));
p.part("heat-fin-1", box(223.2, 12, 8, true).translate(0, -30.4, 90.3).scale(scale).color(color));
p.part("heat-fin-2", box(223.2, 12, 8, true).translate(0, 0, 90.3).scale(scale).color(color));
p.part("heat-fin-3", box(223.2, 12, 8, true).translate(0, 30.4, 90.3).scale(scale).color(color));
p.part("heat-fin-4", box(223.2, 12, 8, true).translate(0, 60.8, 90.3).scale(scale).color(color));
p.part("mount-ear-0", box(48, 85.5, 18, true).translate(-124, 0, 25).scale(scale).color(color));
p.part("mount-ear-1", box(48, 85.5, 18, true).translate(124, 0, 25).scale(scale).color(color));
p.part("lead-0", cylinder(68.2, 11, 8).rotate([0, 1, 0], 90).translate(-86.8, 0, 18).scale(scale).color(color));
p.part("lead-1", cylinder(68.2, 11, 8).rotate([0, 1, 0], 90).translate(86.8, 0, 18).scale(scale).color(color));

return p.model();
