meta({
  name: 'solar-data-logger',
  license: 'CC0-1.0',
  title: 'Solar data logger',
  description: 'Small telemetry enclosure mounted to a short pedestal with antenna and status bar.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#71807e', { label: 'Asset color' });
const p = assembly("solar-data-logger");
p.part("logger-plinth", box(306.8, 229.6, 36, true).translate(0, 0, 18).scale(scale).color(color));
p.part("logger-body", box(278.8, 201.6, 305.2, true).translate(0, 0, 191.6).scale(scale).color(color));
p.part("logger-door-1", box(246.8, 8, 261.2, true).translate(0, 103.8, 187.6).scale(scale).color(color));
p.part("logger-handle-1", box(12, 18, 72, true).translate(91.728, 114.8, 191.6).scale(scale).color(color));
p.part("logger-vent-1", box(133.824, 10, 8, true).translate(0, 112.8, 100).scale(scale).color(color));
p.part("logger-vent-2", box(133.824, 10, 8, true).translate(0, 112.8, 147.2).scale(scale).color(color));
p.part("logger-mast", cylinder(210.8, 16, 8).translate(0, 0, 347.2).scale(scale).color(color));
p.part("logger-antenna-cap", cylinder(32, 48, 8).translate(0, 0, 539.4).scale(scale).color(color));

return p.model();
