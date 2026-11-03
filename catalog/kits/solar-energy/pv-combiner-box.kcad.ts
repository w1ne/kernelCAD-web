meta({
  name: 'pv-combiner-box',
  license: 'CC0-1.0',
  title: 'PV combiner box',
  description: 'Weatherproof string combiner enclosure with front cover and top cable entries.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#78827e', { label: 'Asset color' });
const p = assembly("pv-combiner-box");
p.part("combiner-plinth", box(449.4, 200.8, 36, true).translate(0, 0, 18).scale(scale).color(color));
p.part("combiner-body", box(421.4, 172.8, 384.4, true).translate(0, 0, 231.2).scale(scale).color(color));
p.part("combiner-door-1", box(389.4, 8, 340.4, true).translate(0, 89.4, 227.2).scale(scale).color(color));
p.part("combiner-handle-1", box(12, 18, 72, true).translate(143.064, 100.4, 231.2).scale(scale).color(color));
p.part("combiner-vent-1", box(202.272, 10, 8, true).translate(0, 98.4, 100).scale(scale).color(color));
p.part("combiner-vent-2", box(202.272, 10, 8, true).translate(0, 98.4, 163.2).scale(scale).color(color));
p.part("combiner-vent-3", box(202.272, 10, 8, true).translate(0, 98.4, 226.4).scale(scale).color(color));
p.part("cable-entry-0", cylinder(34, 18, 8).translate(-137.2, 0, 426.4).scale(scale).color(color));
p.part("cable-entry-1", cylinder(34, 18, 8).translate(-44.1, 0, 426.4).scale(scale).color(color));
p.part("cable-entry-2", cylinder(34, 18, 8).translate(44.1, 0, 426.4).scale(scale).color(color));
p.part("cable-entry-3", cylinder(34, 18, 8).translate(137.2, 0, 426.4).scale(scale).color(color));

return p.model();
