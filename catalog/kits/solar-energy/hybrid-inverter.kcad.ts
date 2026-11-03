meta({
  name: 'hybrid-inverter',
  license: 'CC0-1.0',
  title: 'Hybrid inverter',
  description: 'Hybrid conversion cabinet with deep side fins, front display and paired lower ports.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#6f7f82', { label: 'Asset color' });
const p = assembly("hybrid-inverter");
p.part("hybrid-plinth", box(431.2, 226.4, 36, true).translate(0, 0, 18).scale(scale).color(color));
p.part("hybrid-body", box(403.2, 198.4, 573, true).translate(0, 0, 325.5).scale(scale).color(color));
p.part("hybrid-door-1", box(371.2, 8, 529, true).translate(0, 102.2, 321.5).scale(scale).color(color));
p.part("hybrid-handle-1", box(12, 18, 72, true).translate(136.512, 113.2, 325.5).scale(scale).color(color));
p.part("hybrid-vent-1", box(193.536, 10, 8, true).translate(0, 111.2, 100).scale(scale).color(color));
p.part("hybrid-vent-2", box(193.536, 10, 8, true).translate(0, 111.2, 178.75).scale(scale).color(color));
p.part("hybrid-vent-3", box(193.536, 10, 8, true).translate(0, 111.2, 257.5).scale(scale).color(color));
p.part("hybrid-vent-4", box(193.536, 10, 8, true).translate(0, 111.2, 336.25).scale(scale).color(color));
p.part("hybrid-vent-5", box(193.536, 10, 8, true).translate(0, 111.2, 415).scale(scale).color(color));
p.part("hybrid-cooling-fin-0", box(22, 230.4, 344.4, true).translate(-240.8, 0, 557.6).scale(scale).color(color));
p.part("hybrid-cooling-fin-1", box(22, 230.4, 344.4, true).translate(-162.4, 0, 557.6).scale(scale).color(color));
p.part("hybrid-cooling-fin-2", box(22, 230.4, 344.4, true).translate(-84, 0, 557.6).scale(scale).color(color));
p.part("hybrid-cooling-fin-3", box(22, 230.4, 344.4, true).translate(-5.6, 0, 557.6).scale(scale).color(color));
p.part("hybrid-cooling-fin-4", box(22, 230.4, 344.4, true).translate(72.8, 0, 557.6).scale(scale).color(color));
p.part("hybrid-cooling-fin-5", box(22, 230.4, 344.4, true).translate(151.2, 0, 557.6).scale(scale).color(color));
p.part("hybrid-cooling-fin-6", box(22, 230.4, 344.4, true).translate(229.6, 0, 557.6).scale(scale).color(color));
p.part("hybrid-display", box(123.2, 14, 106.6, true).translate(100.8, 108.8, 590.4).scale(scale).color(color));
p.part("hybrid-cable-port-0", cylinder(36, 20, 8).translate(-112, -51.2, 0).scale(scale).color(color));
p.part("hybrid-cable-port-1", cylinder(36, 20, 8).translate(0, -51.2, 0).scale(scale).color(color));
p.part("hybrid-cable-port-2", cylinder(36, 20, 8).translate(112, -51.2, 0).scale(scale).color(color));

return p.model();
