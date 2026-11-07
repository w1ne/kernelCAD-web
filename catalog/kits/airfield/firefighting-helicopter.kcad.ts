meta({
  name: 'firefighting-helicopter',
  license: 'CC0-1.0',
  title: 'Firefighting helicopter',
  description: 'Heavy-lift helicopter with a long rotor, reinforced skids and a suspended water bucket.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#b94e3f', { label: 'Asset color' });
const p = assembly("firefighting-helicopter");
p.part("cabin", sphere(120).scale([4.833, 1.375, 0.75]).translate(0, 0, 168).scale(scale).color(color));
p.part("cockpit", sphere(141.9).scale([0.82, 0.87, 0.63]).translate(232, 0, 188).scale(scale).color(color));
p.part("tail-boom", box(544, 38, 42, true).translate(-488, 0, 184).scale(scale).color(color));
p.part("tail-fin", box(120, 18, 105, true).translate(-720, 0, 160).scale(scale).color(color));
p.part("tail-plane", box(176, 247.5, 16, true).translate(-496, 0, 180).scale(scale).color(color));
p.part("rotor-mast", cylinder(100, 12, 8).translate(0, 0, 188).scale(scale).color(color));
p.part("main-rotor-blade-a", box(996, 26, 9, true).translate(0, 0, 294).scale(scale).color(color));
p.part("main-rotor-blade-b", box(996, 26, 9, true).rotate([0, 0, 1], 90).translate(0, 0, 294).scale(scale).color(color));
p.part("tail-rotor-hub", cylinder(24, 14, 8).rotate([0, 1, 0], 90).translate(-740, 0, 210).scale(scale).color(color));
p.part("tail-rotor-blade-a", box(9, 12, 92, true).translate(-744, 0, 210).scale(scale).color(color));
p.part("tail-rotor-blade-b", box(9, 12, 92, true).rotate([1, 0, 0], 90).translate(-744, 0, 210).scale(scale).color(color));
p.part("left-skid-support-front", box(12, 12, 66, true).translate(144, -141.9, 45).scale(scale).color(color));
p.part("left-skid-support-rear", box(12, 12, 66, true).translate(-192, -141.9, 45).scale(scale).color(color));
p.part("left-skid", box(688, 14, 12, true).translate(0, -141.9, 6).scale(scale).color(color));
p.part("right-skid-support-front", box(12, 12, 66, true).translate(144, 141.9, 45).scale(scale).color(color));
p.part("right-skid-support-rear", box(12, 12, 66, true).translate(-192, 141.9, 45).scale(scale).color(color));
p.part("right-skid", box(688, 14, 12, true).translate(0, 141.9, 6).scale(scale).color(color));
p.part("bucket-cable", cylinder(130, 4, 8).translate(-48, 0, 18).scale(scale).color(color));
p.part("water-bucket", cylinder(62, 48, 8).translate(-48, 0, 0).scale(scale).color(color));

return p.model();
