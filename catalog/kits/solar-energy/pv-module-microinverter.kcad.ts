meta({
  name: 'pv-module-microinverter',
  license: 'CC0-1.0',
  title: 'PV module with microinverter',
  description: 'Single framed module with a compact inverter enclosure fixed beneath its back rail.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#557c94', { label: 'Asset color' });
const p = assembly("pv-module-microinverter");
p.part("pv-frame", box(657.6, 356.4, 22, true).translate(0, 0, 180).scale(scale).color(color));
p.part("pv-surface", box(639.6, 338.4, 22, true).translate(0, 0, 201).scale(scale).color(color));
p.part("pv-cell-bar-x-0", box(4, 318.4, 2, true).translate(-159.9, 0, 213).scale(scale).color(color));
p.part("pv-cell-bar-x-1", box(4, 318.4, 2, true).translate(0, 0, 213).scale(scale).color(color));
p.part("pv-cell-bar-x-2", box(4, 318.4, 2, true).translate(159.9, 0, 213).scale(scale).color(color));
p.part("pv-cell-bar-y-0", box(619.6, 4, 2, true).translate(0, -84.6, 213).scale(scale).color(color));
p.part("pv-cell-bar-y-1", box(619.6, 4, 2, true).translate(0, 0, 213).scale(scale).color(color));
p.part("pv-cell-bar-y-2", box(619.6, 4, 2, true).translate(0, 84.6, 213).scale(scale).color(color));
p.part("rack-rail-left", box(665.6, 22, 30, true).translate(0, -115.056, 170).scale(scale).color(color));
p.part("rack-rail-right", box(665.6, 22, 30, true).translate(0, 115.056, 170).scale(scale).color(color));
p.part("rack-leg-0-0", box(28, 28, 150, true).translate(-230.256, -115.056, 107).scale(scale).color(color));
p.part("rack-leg-0-1", box(28, 28, 150, true).translate(-230.256, 115.056, 107).scale(scale).color(color));
p.part("rack-leg-1-0", box(28, 28, 150, true).translate(230.256, -115.056, 107).scale(scale).color(color));
p.part("rack-leg-1-1", box(28, 28, 150, true).translate(230.256, 115.056, 107).scale(scale).color(color));
p.part("microinverter-case", box(196.8, 103.4, 48, true).translate(0, 0, 145).scale(scale).color(color));
p.part("microinverter-port-left", cylinder(22, 13, 8).translate(-98.4, 0, 116).scale(scale).color(color));
p.part("microinverter-port-right", cylinder(22, 13, 8).translate(98.4, 0, 116).scale(scale).color(color));

return p.model();
