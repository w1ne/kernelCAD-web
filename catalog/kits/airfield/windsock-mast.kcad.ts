meta({
  name: 'windsock-mast',
  license: 'CC0-1.0',
  title: 'Windsock mast',
  description: 'Airfield windsock on a tall mast with a circular support frame and tapered fabric sleeve.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#9c7c49', { label: 'Asset color' });
const p = assembly("windsock-mast");
p.part("mast", cylinder(520, 8, 8).scale(scale).color(color));
p.part("support-ring", cylinder(10, 68, 12).subtract(cylinder(12, 54, 12).translate(0, 0, -1)).translate(0, 0, 472).scale(scale).color(color));
p.part("sock-tail", sphere(52).scale([2, 0.3, 0.3]).translate(100, 0, 472).scale(scale).color(color));
p.part("sock-mouth", cylinder(32, 45, 8).rotate([0, 1, 0], 90).translate(27, 0, 472).scale(scale).color(color));
p.part("left-ring-support", box(8, 8, 46, true).translate(-48, 0, 494).scale(scale).color(color));
p.part("right-ring-support", box(8, 8, 46, true).translate(48, 0, 494).scale(scale).color(color));
p.part("front-ring-support", box(8, 8, 46, true).translate(0, -48, 494).scale(scale).color(color));
p.part("back-ring-support", box(8, 8, 46, true).translate(0, 48, 494).scale(scale).color(color));

return p.model();
