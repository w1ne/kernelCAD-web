meta({
  name: 'solar-charge-controller',
  license: 'CC0-1.0',
  title: 'Solar charge controller',
  description: 'Wall control unit with a raised display, button row and lower cable glands.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#637e82', { label: 'Asset color' });
const p = assembly("solar-charge-controller");
p.part("controller-plinth", box(323.2, 179.2, 36, true).translate(0, 0, 18).scale(scale).color(color));
p.part("controller-body", box(295.2, 151.2, 302, true).translate(0, 0, 190).scale(scale).color(color));
p.part("controller-door-1", box(263.2, 8, 258, true).translate(0, 78.6, 186).scale(scale).color(color));
p.part("controller-handle-1", box(12, 18, 72, true).translate(97.632, 89.6, 190).scale(scale).color(color));
p.part("controller-vent-1", box(141.696, 10, 8, true).translate(0, 87.6, 100).scale(scale).color(color));
p.part("controller-vent-2", box(141.696, 10, 8, true).translate(0, 87.6, 128).scale(scale).color(color));
p.part("controller-vent-3", box(141.696, 10, 8, true).translate(0, 87.6, 156).scale(scale).color(color));
p.part("controller-screen", box(129.6, 14, 77.4, true).translate(0, 88.2, 292.4).scale(scale).color(color));
p.part("controller-button-0", cylinder(18, 12, 8).rotate([1, 0, 0], 90).translate(-79.2, 99.9, 180.6).scale(scale).color(color));
p.part("controller-button-1", cylinder(18, 12, 8).rotate([1, 0, 0], 90).translate(0, 99.9, 180.6).scale(scale).color(color));
p.part("controller-button-2", cylinder(18, 12, 8).rotate([1, 0, 0], 90).translate(79.2, 99.9, 180.6).scale(scale).color(color));

return p.model();
