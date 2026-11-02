meta({
  name: 'baggage-tractor',
  license: 'CC0-1.0',
  title: 'Baggage tractor',
  description: 'Compact electric apron tractor with a forward cab, low chassis, tow coupling and four wheels.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#c3a542', { label: 'Asset color' });
const p = assembly("baggage-tractor");
p.part("chassis", box(255, 158.4, 42, true).translate(0, 0, 49).scale(scale).color(color));
p.part("operator-cab", box(81, 147.6, 95.2, true).translate(72, 0, 126.6).scale(scale).color(color));
p.part("rear-body", box(111, 151.2, 71.4, true).translate(-69, 0, 110.7).scale(scale).color(color));
p.part("tow-bar", box(81, 18, 16, true).translate(-144, 0, 49).scale(scale).color(color));
p.part("front-hood", box(96, 129.6, 44.2, true).translate(108, 0, 73).scale(scale).color(color));
p.part("wheel-1-left", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(-93, -77.6, 31).scale(scale).color(color));
p.part("wheel-1-right", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(-93, 109.6, 31).scale(scale).color(color));
p.part("wheel-2-left", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(93, -77.6, 31).scale(scale).color(color));
p.part("wheel-2-right", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(93, 109.6, 31).scale(scale).color(color));

return p.model();
