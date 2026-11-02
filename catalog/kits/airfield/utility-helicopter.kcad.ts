meta({
  name: 'utility-helicopter',
  license: 'CC0-1.0',
  title: 'Utility helicopter',
  description: 'Utility helicopter with a glazed cabin, tail boom, two-blade rotor and paired landing skids.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#778b75', { label: 'Asset color' });
const p = assembly("utility-helicopter");
p.part("cabin", sphere(95).scale([4.884, 1.368, 0.75]).translate(0, 0, 168).scale(scale).color(color));
p.part("cockpit", sphere(111.8).scale([0.82, 0.87, 0.63]).translate(185.6, 0, 188).scale(scale).color(color));
p.part("tail-boom", box(435.2, 38, 42, true).translate(-390.4, 0, 184).scale(scale).color(color));
p.part("tail-fin", box(96, 18, 105, true).translate(-576, 0, 160).scale(scale).color(color));
p.part("tail-plane", box(140.8, 195, 16, true).translate(-396.8, 0, 180).scale(scale).color(color));
p.part("rotor-mast", cylinder(100, 12, 8).translate(0, 0, 188).scale(scale).color(color));
p.part("main-rotor-blade-a", box(796.8, 26, 9, true).translate(0, 0, 294).scale(scale).color(color));
p.part("main-rotor-blade-b", box(796.8, 26, 9, true).rotate([0, 0, 1], 90).translate(0, 0, 294).scale(scale).color(color));
p.part("tail-rotor-hub", cylinder(24, 14, 8).rotate([0, 1, 0], 90).translate(-594.4, 0, 210).scale(scale).color(color));
p.part("tail-rotor-blade-a", box(9, 12, 92, true).translate(-595.2, 0, 210).scale(scale).color(color));
p.part("tail-rotor-blade-b", box(9, 12, 92, true).rotate([1, 0, 0], 90).translate(-595.2, 0, 210).scale(scale).color(color));
p.part("left-skid-support-front", box(12, 12, 84.75, true).translate(115.2, -111.8, 54.375).scale(scale).color(color));
p.part("left-skid-support-rear", box(12, 12, 84.75, true).translate(-153.6, -111.8, 54.375).scale(scale).color(color));
p.part("left-skid", box(550.4, 14, 12, true).translate(0, -111.8, 6).scale(scale).color(color));
p.part("right-skid-support-front", box(12, 12, 84.75, true).translate(115.2, 111.8, 54.375).scale(scale).color(color));
p.part("right-skid-support-rear", box(12, 12, 84.75, true).translate(-153.6, 111.8, 54.375).scale(scale).color(color));
p.part("right-skid", box(550.4, 14, 12, true).translate(0, 111.8, 6).scale(scale).color(color));

return p.model();
