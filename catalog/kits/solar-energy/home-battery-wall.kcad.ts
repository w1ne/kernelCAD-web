meta({
  name: 'home-battery-wall',
  license: 'CC0-1.0',
  title: 'Home battery wall unit',
  description: 'Tall residential storage cabinet with segmented front cover and base plinth.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#757e7d', { label: 'Asset color' });
const p = assembly("home-battery-wall");
p.part("battery-plinth", box(476, 232, 36, true).translate(0, 0, 18).scale(scale).color(color));
p.part("battery-body", box(448, 204, 890.8, true).translate(0, 0, 484.4).scale(scale).color(color));
p.part("battery-door-1", box(416, 8, 846.8, true).translate(0, 105, 480.4).scale(scale).color(color));
p.part("battery-handle-1", box(12, 18, 72, true).translate(152.64, 116, 484.4).scale(scale).color(color));
p.part("battery-vent-1", box(215.04, 10, 8, true).translate(0, 114, 100).scale(scale).color(color));
p.part("battery-vent-2", box(215.04, 10, 8, true).translate(0, 114, 258.2).scale(scale).color(color));
p.part("battery-vent-3", box(215.04, 10, 8, true).translate(0, 114, 416.4).scale(scale).color(color));
p.part("battery-vent-4", box(215.04, 10, 8, true).translate(0, 114, 574.6).scale(scale).color(color));
p.part("battery-vent-5", box(215.04, 10, 8, true).translate(0, 114, 732.8).scale(scale).color(color));
p.part("battery-seam-0", box(403.2, 8, 12, true).translate(0, 105, 212).scale(scale).color(color));
p.part("battery-seam-1", box(403.2, 8, 12, true).translate(0, 105, 371).scale(scale).color(color));
p.part("battery-seam-2", box(403.2, 8, 12, true).translate(0, 105, 530).scale(scale).color(color));
p.part("battery-seam-3", box(403.2, 8, 12, true).translate(0, 105, 689).scale(scale).color(color));

return p.model();
