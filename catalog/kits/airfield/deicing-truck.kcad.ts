meta({
  name: 'deicing-truck',
  license: 'CC0-1.0',
  title: 'De-icing truck',
  description: 'De-icing service vehicle with a fluid tank, telescoping boom and raised operator basket.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#7c8990', { label: 'Asset color' });
const p = assembly("deicing-truck");
p.part("chassis", box(518.5, 202.4, 42, true).translate(0, 0, 56).scale(scale).color(color));
p.part("cab", box(152.5, 188.6, 253.8, true).translate(183, 0, 209.9).scale(scale).color(color));
p.part("fluid-tank", sphere(98.9).scale([1.45, 0.96, 0.86]).translate(-97.6, 0, 132).scale(scale).color(color));
p.part("boom-base", box(20, 20, 225.6, true).translate(-134.2, 0, 296.5).scale(scale).color(color));
p.part("boom-arm", box(256.2, 18, 18, true).rotate([0, 1, 0], -32).translate(-6.1, 0, 442.2).scale(scale).color(color));
p.part("operator-basket", box(72, 72, 72, true).translate(109.8, 0, 550).scale(scale).color(color));
p.part("wheel-1-left", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(-189.1, -103.6, 38).scale(scale).color(color));
p.part("wheel-1-right", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(-189.1, 135.6, 38).scale(scale).color(color));
p.part("wheel-2-left", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(189.1, -103.6, 38).scale(scale).color(color));
p.part("wheel-2-right", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(189.1, 135.6, 38).scale(scale).color(color));

return p.model();
