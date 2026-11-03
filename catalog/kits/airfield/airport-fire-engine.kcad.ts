meta({
  name: 'airport-fire-engine',
  license: 'CC0-1.0',
  title: 'Airport fire engine',
  description: 'Airport rescue truck with a tall cab, equipment body, roof monitor and heavy wheels.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#b65343', { label: 'Asset color' });
const p = assembly("airport-fire-engine");
p.part("chassis", box(552.5, 228.8, 42, true).translate(0, 0, 56).scale(scale).color(color));
p.part("cab", box(162.5, 213.2, 205.2, true).translate(195, 0, 185.6).scale(scale).color(color));
p.part("equipment-body", box(312, 223.6, 235.6, true).translate(-117, 0, 203.8).scale(scale).color(color));
p.part("roof-monitor", cylinder(48, 17, 8).translate(-117, 0, 321.6).scale(scale).color(color));
p.part("monitor-nozzle", box(88, 16, 14, true).translate(-77, 0, 374.6).scale(scale).color(color));
p.part("wheel-1-left", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(-201.5, -119.2, 38).scale(scale).color(color));
p.part("wheel-1-right", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(-201.5, 151.2, 38).scale(scale).color(color));
p.part("wheel-2-left", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(201.5, -119.2, 38).scale(scale).color(color));
p.part("wheel-2-right", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(201.5, 151.2, 38).scale(scale).color(color));

return p.model();
