meta({
  name: 'string-inverter',
  license: 'CC0-1.0',
  title: 'String inverter',
  description: 'Wall-mounted string inverter cabinet with cooling ribs, display and cable glands.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#78817f', { label: 'Asset color' });
const p = assembly("string-inverter");
p.part("inverter-plinth", box(402.4, 201.6, 36, true).translate(0, 0, 18).scale(scale).color(color));
p.part("inverter-body", box(374.4, 173.6, 498, true).translate(0, 0, 288).scale(scale).color(color));
p.part("inverter-door-1", box(342.4, 8, 454, true).translate(0, 89.8, 284).scale(scale).color(color));
p.part("inverter-handle-1", box(12, 18, 72, true).translate(126.144, 100.8, 288).scale(scale).color(color));
p.part("inverter-vent-1", box(179.712, 10, 8, true).translate(0, 98.8, 100).scale(scale).color(color));
p.part("inverter-vent-2", box(179.712, 10, 8, true).translate(0, 98.8, 160).scale(scale).color(color));
p.part("inverter-vent-3", box(179.712, 10, 8, true).translate(0, 98.8, 220).scale(scale).color(color));
p.part("inverter-vent-4", box(179.712, 10, 8, true).translate(0, 98.8, 280).scale(scale).color(color));
p.part("inverter-vent-5", box(179.712, 10, 8, true).translate(0, 98.8, 340).scale(scale).color(color));
p.part("inverter-cooling-fin-0", box(22, 201.6, 302.4, true).translate(-223.6, 0, 489.6).scale(scale).color(color));
p.part("inverter-cooling-fin-1", box(22, 201.6, 302.4, true).translate(-150.8, 0, 489.6).scale(scale).color(color));
p.part("inverter-cooling-fin-2", box(22, 201.6, 302.4, true).translate(-78, 0, 489.6).scale(scale).color(color));
p.part("inverter-cooling-fin-3", box(22, 201.6, 302.4, true).translate(-5.2, 0, 489.6).scale(scale).color(color));
p.part("inverter-cooling-fin-4", box(22, 201.6, 302.4, true).translate(67.6, 0, 489.6).scale(scale).color(color));
p.part("inverter-cooling-fin-5", box(22, 201.6, 302.4, true).translate(140.4, 0, 489.6).scale(scale).color(color));
p.part("inverter-cooling-fin-6", box(22, 201.6, 302.4, true).translate(213.2, 0, 489.6).scale(scale).color(color));
p.part("inverter-display", box(114.4, 14, 93.6, true).translate(93.6, 95.2, 518.4).scale(scale).color(color));
p.part("inverter-cable-port-0", cylinder(36, 20, 8).translate(-104, -44.8, 0).scale(scale).color(color));
p.part("inverter-cable-port-1", cylinder(36, 20, 8).translate(0, -44.8, 0).scale(scale).color(color));
p.part("inverter-cable-port-2", cylinder(36, 20, 8).translate(104, -44.8, 0).scale(scale).color(color));

return p.model();
