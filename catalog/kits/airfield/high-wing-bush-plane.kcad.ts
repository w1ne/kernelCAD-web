meta({
  name: 'high-wing-bush-plane',
  license: 'CC0-1.0',
  title: 'High-wing bush plane',
  description: 'Short-field utility aircraft with a high wing, large wheels and a single nose propeller.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#9a8054', { label: 'Asset color' });
const p = assembly("high-wing-bush-plane");
p.part("fuselage", sphere(44).scale([9.318, 1, 0.72]).translate(0, 0, 190).scale(scale).color(color));
p.part("cockpit-canopy", sphere(27.28).scale([1.05, 0.82, 0.6]).translate(139.4, 0, 217.245).scale(scale).color(color));
p.part("main-wing", extrudePolygon([[-164, -525], [114.8, -525], [16.4, 0], [114.8, 525], [-164, 525], [-49.2, 0]], 16).translate(0, 0, 201.405).scale(scale).color(color));
p.part("tailplane", extrudePolygon([[-287, -178.5], [-180.4, -178.5], [-221.4, 0], [-180.4, 178.5], [-287, 178.5], [-254.2, 0]], 14).translate(0, 0, 205.84).scale(scale).color(color));
p.part("vertical-tail", box(131.2, 16, 70.4, true).translate(-278.8, 0, 224.848).scale(scale).color(color));
p.part("left-wing-strut", box(12, 12, 60.192, true).translate(-24.6, -189, 183.664).scale(scale).color(color));
p.part("right-wing-strut", box(12, 12, 60.192, true).translate(-24.6, 189, 183.664).scale(scale).color(color));
p.part("engine-1", sphere(15.84).scale([1.25, 0.7, 0.7]).translate(328, 0, 166.405).scale(scale).color(color));
p.part("engine-1-prop-hub", sphere(7.48).scale([0.72, 0.72, 0.72]).translate(410, 0, 166.405).scale(scale).color(color));
p.part("engine-1-blade-1", box(8, 92.4, 10, true).rotate([1, 0, 0], 0).translate(410, 0, 166.405).scale(scale).color(color));
p.part("engine-1-blade-2", box(8, 92.4, 10, true).rotate([1, 0, 0], 120).translate(410, 0, 166.405).scale(scale).color(color));
p.part("engine-1-blade-3", box(8, 92.4, 10, true).rotate([1, 0, 0], 240).translate(410, 0, 166.405).scale(scale).color(color));
p.part("nose-gear-strut", box(12, 12, 130.32, true).translate(254.2, 0, 99.16).scale(scale).color(color));
p.part("nose-wheel", cylinder(18, 17, 8).rotate([1, 0, 0], 90).translate(254.2, 9, 17).scale(scale).color(color));
p.part("left-main-gear-strut", box(14, 14, 161.405, true).translate(-57.4, -147, 124.702).scale(scale).color(color));
p.part("left-main-wheel", cylinder(18, 22, 8).rotate([1, 0, 0], 90).translate(-57.4, -138, 22).scale(scale).color(color));
p.part("right-main-gear-strut", box(14, 14, 161.405, true).translate(-57.4, 147, 124.702).scale(scale).color(color));
p.part("right-main-wheel", cylinder(18, 22, 8).rotate([1, 0, 0], 90).translate(-57.4, 156, 22).scale(scale).color(color));
p.part("left-wing-support", box(12, 12, 130, true).translate(-16.4, -136.5, 202).scale(scale).color(color));
p.part("right-wing-support", box(12, 12, 130, true).translate(-16.4, 136.5, 202).scale(scale).color(color));

return p.model();
