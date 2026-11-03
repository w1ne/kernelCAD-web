meta({
  name: 'widebody-airliner',
  license: 'CC0-1.0',
  title: 'Widebody airliner',
  description: 'Wide-body passenger aircraft with a broad fuselage, four engine nacelles and a wide main wing.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#8399a7', { label: 'Asset color' });
const p = assembly("widebody-airliner");
p.part("fuselage", sphere(95).scale([8.158, 1, 0.72]).translate(0, 0, 190).scale(scale).color(color));
p.part("cockpit-canopy", sphere(58.9).scale([1.05, 0.82, 0.6]).translate(263.5, 0, 248.824).scale(scale).color(color));
p.part("main-wing", extrudePolygon([[-310, -830], [217, -830], [31, 0], [217, 830], [-310, 830], [-93, 0]], 16).translate(0, 0, 174.952).scale(scale).color(color));
p.part("tailplane", extrudePolygon([[-542.5, -282.2], [-341, -282.2], [-418.5, 0], [-341, 282.2], [-542.5, 282.2], [-480.5, 0]], 14).translate(0, 0, 224.2).scale(scale).color(color));
p.part("vertical-tail", box(248, 16, 152, true).translate(-527, 0, 265.24).scale(scale).color(color));
p.part("engine-1", sphere(38).scale([1.85, 0.58, 0.58]).translate(31, -597.6, 140.952).scale(scale).color(color));
p.part("engine-2", sphere(38).scale([1.85, 0.58, 0.58]).translate(31, -332, 140.952).scale(scale).color(color));
p.part("engine-3", sphere(38).scale([1.85, 0.58, 0.58]).translate(31, 332, 140.952).scale(scale).color(color));
p.part("engine-4", sphere(38).scale([1.85, 0.58, 0.58]).translate(31, 597.6, 140.952).scale(scale).color(color));
p.part("nose-gear-strut", box(12, 12, 93.6, true).translate(480.5, 0, 80.8).scale(scale).color(color));
p.part("nose-wheel", cylinder(18, 17, 8).rotate([1, 0, 0], 90).translate(480.5, 9, 17).scale(scale).color(color));
p.part("left-main-gear-strut", box(14, 14, 144.952, true).translate(-108.5, -232.4, 106.476).scale(scale).color(color));
p.part("left-main-wheel", cylinder(18, 17, 8).rotate([1, 0, 0], 90).translate(-108.5, -223.4, 17).scale(scale).color(color));
p.part("right-main-gear-strut", box(14, 14, 144.952, true).translate(-108.5, 232.4, 106.476).scale(scale).color(color));
p.part("right-main-wheel", cylinder(18, 17, 8).rotate([1, 0, 0], 90).translate(-108.5, 241.4, 17).scale(scale).color(color));

return p.model();
