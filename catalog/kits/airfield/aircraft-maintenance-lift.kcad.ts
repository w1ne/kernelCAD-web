meta({
  name: 'aircraft-maintenance-lift',
  license: 'CC0-1.0',
  title: 'Aircraft maintenance lift',
  description: 'Self-propelled scissor lift with a guarded service platform, crossed arms and compact chassis.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#b68b43', { label: 'Asset color' });
const p = assembly("aircraft-maintenance-lift");
p.part("chassis", box(365.5, 184.8, 42, true).translate(0, 0, 56).scale(scale).color(color));
p.part("lower-platform", box(301, 163.8, 28, true).translate(0, 0, 58).scale(scale).color(color));
p.part("scissor-arm-left", box(499.2, 18, 18, true).rotate([0, 1, 0], 50).translate(0, 0, 261.6).scale(scale).color(color));
p.part("scissor-arm-right", box(499.2, 18, 18, true).rotate([0, 1, 0], -50).translate(0, 0, 261.6).scale(scale).color(color));
p.part("scissor-pivot", cylinder(24, 18, 8).rotate([1, 0, 0], 90).translate(0, 12, 261.6).scale(scale).color(color));
p.part("upper-platform", box(292.4, 163.8, 20, true).translate(0, 0, 459.2).scale(scale).color(color));
p.part("guardrail-front", box(12, 163.8, 76, true).translate(137.6, 0, 501.2).scale(scale).color(color));
p.part("wheel-1-left", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(-133.3, -93.2, 38).scale(scale).color(color));
p.part("wheel-1-right", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(-133.3, 125.2, 38).scale(scale).color(color));
p.part("wheel-2-left", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(133.3, -93.2, 38).scale(scale).color(color));
p.part("wheel-2-right", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(133.3, 125.2, 38).scale(scale).color(color));

return p.model();
