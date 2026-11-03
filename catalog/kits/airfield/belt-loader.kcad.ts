meta({
  name: 'belt-loader',
  license: 'CC0-1.0',
  title: 'Belt loader',
  description: 'Compact baggage loader with an inclined conveyor belt, support frame and low service chassis.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#718b65', { label: 'Asset color' });
const p = assembly("belt-loader");
p.part("chassis", box(399.5, 167.2, 42, true).translate(0, 0, 56).scale(scale).color(color));
p.part("operator-cab", box(103.4, 140.6, 112, true).translate(126.9, 0, 104).scale(scale).color(color));
p.part("conveyor-frame", box(390.1, 60.8, 22, true).rotate([0, 1, 0], -28).translate(-18.8, 0, 223.5).scale(scale).color(color));
p.part("conveyor-belt", box(376, 72.2, 10, true).rotate([0, 1, 0], -28).translate(-18.8, 0, 234).scale(scale).color(color));
p.part("loader-support", box(18, 18, 126, true).translate(-32.9, 0, 118.5).scale(scale).color(color));
p.part("wheel-1-left", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(-145.7, -82.8, 38).scale(scale).color(color));
p.part("wheel-1-right", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(-145.7, 114.8, 38).scale(scale).color(color));
p.part("wheel-2-left", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(145.7, -82.8, 38).scale(scale).color(color));
p.part("wheel-2-right", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(145.7, 114.8, 38).scale(scale).color(color));

return p.model();
