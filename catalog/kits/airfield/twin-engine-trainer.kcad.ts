// Twin-engine trainer: Compact twin-propeller trainer with tapered wings, twin nacelles and a low tailplane. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'twin-engine-trainer',
  license: 'CC0-1.0',
  title: 'Twin-engine trainer',
  description: 'Compact twin-propeller trainer with tapered wings, twin nacelles and a low tailplane. Material controls: airframe paint, canopy glass, bare aluminium, tyre rubber. Appearance presets: weathered and high visibility.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const airframePaint = param('airframePaint', '#d8ddd9', { label: 'Airframe paint' });
const canopyGlass = param('canopyGlass', '#76b6c0', { label: 'Canopy glass' });
const bareMetal = param('bareMetal', '#aab5b8', { label: 'Bare aluminium' });
const rubber = param('rubber', '#292f32', { label: 'Tyre rubber' });

presets({
  weathered: {
    airframePaint: '#596765',
    canopyGlass: '#315c69',
    bareMetal: '#536267',
    rubber: '#202528',
  },
  highVisibility: {
    airframePaint: '#f0b52f',
    canopyGlass: '#82c8d0',
    bareMetal: '#aeb9bb',
    rubber: '#262b2e',
  },
});
const p = assembly("twin-engine-trainer");
p.part("fuselage", sphere(47).scale([9.787, 1, 0.72]).translate(0, 0, 190).scale(scale).color(airframePaint));
p.part("cockpit-canopy", sphere(29.14).scale([1.05, 0.82, 0.6]).translate(156.4, 0, 219.102).scale(scale).color(canopyGlass));
p.part("main-wing", extrudePolygon([[-184, -610], [128.8, -610], [18.4, 0], [128.8, 610], [-184, 610], [-55.2, 0]], 16).translate(0, 0, 182.555).scale(scale).color(airframePaint));
p.part("tailplane", extrudePolygon([[-322, -207.4], [-202.4, -207.4], [-248.4, 0], [-202.4, 207.4], [-322, 207.4], [-285.2, 0]], 14).translate(0, 0, 206.92).scale(scale).color(airframePaint));
p.part("vertical-tail", box(147.2, 16, 75.2, true).translate(-312.8, 0, 227.224).scale(scale).color(airframePaint));
p.part("engine-1", sphere(16.92).scale([1.25, 0.7, 0.7]).translate(18.4, -414.8, 147.555).scale(scale).color(bareMetal));
p.part("engine-1-prop-hub", sphere(7.99).scale([0.72, 0.72, 0.72]).translate(87.4, -414.8, 147.555).scale(scale).color(bareMetal));
p.part("engine-1-blade-1", box(8, 71.44, 10, true).rotate([1, 0, 0], 0).translate(87.4, -414.8, 147.555).scale(scale).color(bareMetal));
p.part("engine-1-blade-2", box(8, 71.44, 10, true).rotate([1, 0, 0], 120).translate(87.4, -414.8, 147.555).scale(scale).color(bareMetal));
p.part("engine-1-blade-3", box(8, 71.44, 10, true).rotate([1, 0, 0], 240).translate(87.4, -414.8, 147.555).scale(scale).color(bareMetal));
p.part("engine-2", sphere(16.92).scale([1.25, 0.7, 0.7]).translate(18.4, 414.8, 147.555).scale(scale).color(bareMetal));
p.part("engine-2-prop-hub", sphere(7.99).scale([0.72, 0.72, 0.72]).translate(87.4, 414.8, 147.555).scale(scale).color(bareMetal));
p.part("engine-2-blade-1", box(8, 71.44, 10, true).rotate([1, 0, 0], 0).translate(87.4, 414.8, 147.555).scale(scale).color(bareMetal));
p.part("engine-2-blade-2", box(8, 71.44, 10, true).rotate([1, 0, 0], 120).translate(87.4, 414.8, 147.555).scale(scale).color(bareMetal));
p.part("engine-2-blade-3", box(8, 71.44, 10, true).rotate([1, 0, 0], 240).translate(87.4, 414.8, 147.555).scale(scale).color(bareMetal));
p.part("nose-gear-strut", box(12, 12, 128.16, true).translate(285.2, 0, 98.08).scale(scale).color(bareMetal));
p.part("nose-wheel", cylinder(18, 17, 8).rotate([1, 0, 0], 90).translate(285.2, 9, 17).scale(scale).color(rubber));
p.part("left-main-gear-strut", box(14, 14, 152.555, true).translate(-64.4, -170.8, 110.278).scale(scale).color(bareMetal));
p.part("left-main-wheel", cylinder(18, 17, 8).rotate([1, 0, 0], 90).translate(-64.4, -161.8, 17).scale(scale).color(rubber));
p.part("right-main-gear-strut", box(14, 14, 152.555, true).translate(-64.4, 170.8, 110.278).scale(scale).color(bareMetal));
p.part("right-main-wheel", cylinder(18, 17, 8).rotate([1, 0, 0], 90).translate(-64.4, 179.8, 17).scale(scale).color(rubber));

return p.model();
