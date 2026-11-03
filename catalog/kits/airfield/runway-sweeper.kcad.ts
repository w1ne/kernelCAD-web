meta({
  name: 'runway-sweeper',
  license: 'CC0-1.0',
  title: 'Runway sweeper',
  description: 'Apron sweeper vehicle with a front rotary brush, operator cab and rear equipment housing.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#9d8750', { label: 'Asset color' });
const p = assembly("runway-sweeper");
p.part("chassis", box(442, 193.6, 42, true).translate(0, 0, 49).scale(scale).color(color));
p.part("cab", box(130, 180.4, 162, true).translate(156, 0, 157).scale(scale).color(color));
p.part("equipment-body", box(218.4, 187, 144, true).translate(-104, 0, 151).scale(scale).color(color));
p.part("front-brush", cylinder(24, 58, 8).rotate([1, 0, 0], 90).translate(218.4, 12, 58).scale(scale).color(color));
p.part("brush-arm", box(104, 16, 14, true).translate(202.8, 0, 75).scale(scale).color(color));
p.part("wheel-1-left", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(-161.2, -98.4, 31).scale(scale).color(color));
p.part("wheel-1-right", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(-161.2, 130.4, 31).scale(scale).color(color));
p.part("wheel-2-left", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(161.2, -98.4, 31).scale(scale).color(color));
p.part("wheel-2-right", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(161.2, 130.4, 31).scale(scale).color(color));

return p.model();
