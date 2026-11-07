meta({
  name: 'apron-shuttle-bus',
  license: 'CC0-1.0',
  title: 'Apron shuttle bus',
  description: 'Long low-floor airport shuttle bus with a broad passenger cabin and three wheel pairs.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#87939a', { label: 'Asset color' });
const p = assembly("apron-shuttle-bus");
p.part("chassis", box(612, 198, 42, true).translate(0, 0, 49).scale(scale).color(color));
p.part("passenger-cabin", box(662.4, 202.5, 195, true).translate(-14.4, 0, 172).scale(scale).color(color));
p.part("front-windscreen", box(12, 171, 90, true).translate(309.6, 0, 196).scale(scale).color(color));
p.part("wheel-1-left", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(-223.2, -101, 31).scale(scale).color(color));
p.part("wheel-1-right", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(-223.2, 133, 31).scale(scale).color(color));
p.part("wheel-2-left", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(223.2, -101, 31).scale(scale).color(color));
p.part("wheel-2-right", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(223.2, 133, 31).scale(scale).color(color));
p.part("wheel-3-left", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(0, -101, 31).scale(scale).color(color));
p.part("wheel-3-right", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(0, 133, 31).scale(scale).color(color));

return p.model();
