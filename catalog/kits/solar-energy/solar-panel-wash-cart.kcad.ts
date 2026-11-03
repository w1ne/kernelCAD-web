meta({
  name: 'solar-panel-wash-cart',
  license: 'CC0-1.0',
  title: 'Solar panel wash cart',
  description: 'Two-wheel service cart with a water tank, hose reel, handle and cleaning wand.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#7b846d', { label: 'Asset color' });
const p = assembly("solar-panel-wash-cart");
p.part("cart-platform", box(528, 260.4, 48, true).translate(0, 0, 80).scale(scale).color(color));
p.part("water-tank", box(277.2, 210, 410.4, true).translate(-52.8, 0, 319.2).scale(scale).color(color));
p.part("cart-wheel-0", cylinder(34, 72, 8).rotate([1, 0, 0], 90).translate(-237.6, -176, 72).scale(scale).color(color));
p.part("cart-wheel-1", cylinder(34, 72, 8).rotate([1, 0, 0], 90).translate(237.6, -176, 72).scale(scale).color(color));
p.part("push-handle", box(28, 378, 364.8, true).translate(-277.2, 0, 547.2).scale(scale).color(color));
p.part("hose-reel", cylinder(90, 88, 8).rotate([1, 0, 0], 90).translate(158.4, 199.2, 334.4).scale(scale).color(color));
p.part("cleaning-wand", box(24, 30, 501.6, true).translate(250.8, 109.2, 334.4).scale(scale).color(color));

return p.model();
