meta({
  name: 'biplane',
  license: 'CC0-1.0',
  title: 'Biplane',
  description: 'Open-cockpit biplane with two stacked wings, interplane struts, propeller and fixed landing gear.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#b25e40', { label: 'Asset color' });
const p = assembly("biplane");
p.part("fuselage", sphere(39).scale([9.744, 1, 0.72]).translate(0, 0, 190).scale(scale).color(color));
p.part("cockpit-canopy", sphere(24.18).scale([1.05, 0.82, 0.6]).translate(129.2, 0, 214.149).scale(scale).color(color));
p.part("main-wing", extrudePolygon([[-152, -470], [106.4, -470], [15.2, 0], [106.4, 470], [-152, 470], [-45.6, 0]], 16).translate(0, 0, 183.822).scale(scale).color(color));
p.part("tailplane", extrudePolygon([[-266, -159.8], [-167.2, -159.8], [-205.2, 0], [-167.2, 159.8], [-266, 159.8], [-235.6, 0]], 14).translate(0, 0, 204.04).scale(scale).color(color));
p.part("vertical-tail", box(121.6, 16, 62.4, true).translate(-258.4, 0, 220.888).scale(scale).color(color));
p.part("upper-wing", extrudePolygon([[-152, -470], [106.4, -470], [15.2, 0], [106.4, 470], [-152, 470], [-45.6, 0]], 14).translate(0, 0, 335).scale(scale).color(color));
p.part("left-interplane-strut", box(14, 14, 145, true).translate(-45.6, -244.4, 266).scale(scale).color(color));
p.part("right-interplane-strut", box(14, 14, 145, true).translate(-45.6, 244.4, 266).scale(scale).color(color));
p.part("engine-1", sphere(14.04).scale([1.25, 0.7, 0.7]).translate(304, 0, 148.822).scale(scale).color(color));
p.part("engine-1-prop-hub", sphere(6.63).scale([0.72, 0.72, 0.72]).translate(380, 0, 148.822).scale(scale).color(color));
p.part("engine-1-blade-1", box(8, 81.9, 10, true).rotate([1, 0, 0], 0).translate(380, 0, 148.822).scale(scale).color(color));
p.part("engine-1-blade-2", box(8, 81.9, 10, true).rotate([1, 0, 0], 120).translate(380, 0, 148.822).scale(scale).color(color));
p.part("engine-1-blade-3", box(8, 81.9, 10, true).rotate([1, 0, 0], 240).translate(380, 0, 148.822).scale(scale).color(color));
p.part("nose-gear-strut", box(12, 12, 133.92, true).translate(235.6, 0, 100.96).scale(scale).color(color));
p.part("nose-wheel", cylinder(18, 17, 8).rotate([1, 0, 0], 90).translate(235.6, 9, 17).scale(scale).color(color));
p.part("left-main-gear-strut", box(14, 14, 153.822, true).translate(-53.2, -131.6, 110.911).scale(scale).color(color));
p.part("left-main-wheel", cylinder(18, 17, 8).rotate([1, 0, 0], 90).translate(-53.2, -122.6, 17).scale(scale).color(color));
p.part("right-main-gear-strut", box(14, 14, 153.822, true).translate(-53.2, 131.6, 110.911).scale(scale).color(color));
p.part("right-main-wheel", cylinder(18, 17, 8).rotate([1, 0, 0], 90).translate(-53.2, 140.6, 17).scale(scale).color(color));

return p.model();
