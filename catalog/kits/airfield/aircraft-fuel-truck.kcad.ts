meta({
  name: 'aircraft-fuel-truck',
  license: 'CC0-1.0',
  title: 'Aircraft fuel truck',
  description: 'Refueling tanker with a rounded tank, cab, rear hose reel and ground-service chassis.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#9d8050', { label: 'Asset color' });
const p = assembly("aircraft-fuel-truck");
p.part("chassis", box(552.5, 202.4, 42, true).translate(0, 0, 56).scale(scale).color(color));
p.part("cab", box(162.5, 188.6, 189, true).translate(195, 0, 177.5).scale(scale).color(color));
p.part("tanker", sphere(105.8).scale([1.752, 1, 0.82]).translate(-84.5, 0, 188.5).scale(scale).color(color));
p.part("hose-reel", cylinder(22, 26, 8).rotate([1, 0, 0], 90).translate(-227.5, 121.4, 164).scale(scale).color(color));
p.part("wheel-1-left", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(-201.5, -103.6, 38).scale(scale).color(color));
p.part("wheel-1-right", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(-201.5, 135.6, 38).scale(scale).color(color));
p.part("wheel-2-left", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(201.5, -103.6, 38).scale(scale).color(color));
p.part("wheel-2-right", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(201.5, 135.6, 38).scale(scale).color(color));

return p.model();
