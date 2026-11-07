meta({
  name: 'catering-truck',
  license: 'CC0-1.0',
  title: 'Catering truck',
  description: 'High-sided catering vehicle with a box body, cab, rear stabilizers and raised service platform.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#8196a2', { label: 'Asset color' });
const p = assembly("catering-truck");
p.part("chassis", box(518.5, 193.6, 42, true).translate(0, 0, 56).scale(scale).color(color));
p.part("cab", box(152.5, 180.4, 237.6, true).translate(183, 0, 201.8).scale(scale).color(color));
p.part("service-box", box(292.8, 198, 246.4, true).translate(-103.7, 0, 219.2).scale(scale).color(color));
p.part("lift-platform", box(189.1, 200.2, 20, true).translate(-170.8, 0, 530).scale(scale).color(color));
p.part("lift-mast", box(18, 18, 132, true).translate(-268.4, 0, 310.8).scale(scale).color(color));
p.part("wheel-1-left", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(-189.1, -98.4, 38).scale(scale).color(color));
p.part("wheel-1-right", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(-189.1, 130.4, 38).scale(scale).color(color));
p.part("wheel-2-left", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(189.1, -98.4, 38).scale(scale).color(color));
p.part("wheel-2-right", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(189.1, 130.4, 38).scale(scale).color(color));

return p.model();
