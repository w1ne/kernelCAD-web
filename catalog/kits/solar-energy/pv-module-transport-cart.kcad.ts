meta({
  name: 'pv-module-transport-cart',
  license: 'CC0-1.0',
  title: 'PV module transport cart',
  description: 'Four-wheel A-frame trolley carrying two upright framed solar modules.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#777f78', { label: 'Asset color' });
const p = assembly("pv-module-transport-cart");
p.part("cart-base", box(688.8, 399.6, 48, true).translate(0, 0, 85).scale(scale).color(color));
p.part("cart-wheel-0", cylinder(32, 78, 8).rotate([1, 0, 0], 90).translate(-303.4, -216.4, 76).scale(scale).color(color));
p.part("cart-frame-0", box(34, 36, 873.6, true).translate(-303.4, 0, 436.8).scale(scale).color(color));
p.part("cart-wheel-1", cylinder(32, 78, 8).rotate([1, 0, 0], 90).translate(303.4, -216.4, 76).scale(scale).color(color));
p.part("cart-frame-1", box(34, 36, 873.6, true).translate(303.4, 0, 436.8).scale(scale).color(color));
p.part("cart-module-0-frame", box(477.2, 190.8, 22, true).translate(0, -129.6, 650.8).scale(scale).color(color));
p.part("cart-module-0-surface", box(459.2, 172.8, 22, true).translate(0, -129.6, 671.8).scale(scale).color(color));
p.part("cart-module-1-frame", box(477.2, 190.8, 22, true).translate(0, 129.6, 650.8).scale(scale).color(color));
p.part("cart-module-1-surface", box(459.2, 172.8, 22, true).translate(0, 129.6, 671.8).scale(scale).color(color));
p.part("cart-crossbar", box(688.8, 34, 30, true).translate(0, 0, 168).scale(scale).color(color));

return p.model();
