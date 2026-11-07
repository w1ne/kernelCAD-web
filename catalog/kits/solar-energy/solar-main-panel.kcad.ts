meta({
  name: 'solar-main-panel',
  license: 'CC0-1.0',
  title: 'Solar main breaker panel',
  description: 'Tall electrical panel enclosure with a divided door and two rows of knockouts.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#767d7b', { label: 'Asset color' });
const p = assembly("solar-main-panel");
p.part("main-panel-plinth", box(509.6, 224, 36, true).translate(0, 0, 18).scale(scale).color(color));
p.part("main-panel-body", box(481.6, 196, 855.6, true).translate(0, 0, 466.8).scale(scale).color(color));
p.part("main-panel-door-1", box(449.6, 8, 811.6, true).translate(0, 101, 462.8).scale(scale).color(color));
p.part("main-panel-handle-1", box(12, 18, 72, true).translate(164.736, 112, 466.8).scale(scale).color(color));
p.part("main-panel-vent-1", box(231.168, 10, 8, true).translate(0, 110, 100).scale(scale).color(color));
p.part("main-panel-vent-2", box(231.168, 10, 8, true).translate(0, 110, 249.4).scale(scale).color(color));
p.part("main-panel-vent-3", box(231.168, 10, 8, true).translate(0, 110, 398.8).scale(scale).color(color));
p.part("main-panel-vent-4", box(231.168, 10, 8, true).translate(0, 110, 548.2).scale(scale).color(color));
p.part("main-panel-vent-5", box(231.168, 10, 8, true).translate(0, 110, 697.6).scale(scale).color(color));
p.part("breaker-knockout-0", box(24, 12, 24, true).translate(-156.8, 100.8, 244.8).scale(scale).color(color));
p.part("breaker-knockout-1", box(24, 12, 24, true).translate(-95.2, 100.8, 244.8).scale(scale).color(color));
p.part("breaker-knockout-2", box(24, 12, 24, true).translate(-33.6, 100.8, 244.8).scale(scale).color(color));
p.part("breaker-knockout-3", box(24, 12, 24, true).translate(28, 100.8, 244.8).scale(scale).color(color));
p.part("breaker-knockout-4", box(24, 12, 24, true).translate(89.6, 100.8, 244.8).scale(scale).color(color));
p.part("breaker-knockout-5", box(24, 12, 24, true).translate(151.2, 100.8, 244.8).scale(scale).color(color));

return p.model();
