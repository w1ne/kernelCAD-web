// Single-engine trainer: Light training aircraft with a high wing, cockpit canopy, nose propeller and tricycle landing gear. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'single-engine-trainer',
  license: 'CC0-1.0',
  title: 'Single-engine trainer',
  description: 'Light training aircraft with a high wing, cockpit canopy, nose propeller and tricycle landing gear. Material controls: airframe paint, canopy glass, bare aluminium, tyre rubber. Appearance presets: weathered and high visibility.',
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
const p = assembly("single-engine-trainer");
p.part("fuselage", sphere(42).scale([10.119, 1, 0.72]).translate(0, 0, 190).scale(scale).color(airframePaint));
p.part("cockpit-canopy", sphere(26.04).scale([1.05, 0.82, 0.6]).translate(144.5, 0, 216.006).scale(scale).color(canopyGlass));
p.part("main-wing", extrudePolygon([[-170, -560], [119, -560], [17, 0], [119, 560], [-170, 560], [-51, 0]], 16).translate(0, 0, 200.886).scale(scale).color(airframePaint));
p.part("tailplane", extrudePolygon([[-297.5, -190.4], [-187, -190.4], [-229.5, 0], [-187, 190.4], [-297.5, 190.4], [-263.5, 0]], 14).translate(0, 0, 205.12).scale(scale).color(airframePaint));
p.part("vertical-tail", box(136, 16, 67.2, true).translate(-289, 0, 223.264).scale(scale).color(airframePaint));
p.part("left-wing-strut", box(12, 12, 57.456, true).translate(-25.5, -201.6, 183.952).scale(scale).color(bareMetal));
p.part("right-wing-strut", box(12, 12, 57.456, true).translate(-25.5, 201.6, 183.952).scale(scale).color(bareMetal));
p.part("engine-1", sphere(15.12).scale([1.25, 0.7, 0.7]).translate(340, 0, 165.886).scale(scale).color(bareMetal));
p.part("engine-1-prop-hub", sphere(7.14).scale([0.72, 0.72, 0.72]).translate(425, 0, 165.886).scale(scale).color(bareMetal));
p.part("engine-1-blade-1", box(8, 88.2, 10, true).rotate([1, 0, 0], 0).translate(425, 0, 165.886).scale(scale).color(bareMetal));
p.part("engine-1-blade-2", box(8, 88.2, 10, true).rotate([1, 0, 0], 120).translate(425, 0, 165.886).scale(scale).color(bareMetal));
p.part("engine-1-blade-3", box(8, 88.2, 10, true).rotate([1, 0, 0], 240).translate(425, 0, 165.886).scale(scale).color(bareMetal));
p.part("nose-gear-strut", box(12, 12, 131.76, true).translate(263.5, 0, 99.88).scale(scale).color(bareMetal));
p.part("nose-wheel", cylinder(18, 17, 8).rotate([1, 0, 0], 90).translate(263.5, 9, 17).scale(scale).color(rubber));
p.part("left-main-gear-strut", box(14, 14, 170.886, true).translate(-59.5, -156.8, 119.443).scale(scale).color(bareMetal));
p.part("left-main-wheel", cylinder(18, 17, 8).rotate([1, 0, 0], 90).translate(-59.5, -147.8, 17).scale(scale).color(rubber));
p.part("right-main-gear-strut", box(14, 14, 170.886, true).translate(-59.5, 156.8, 119.443).scale(scale).color(bareMetal));
p.part("right-main-wheel", cylinder(18, 17, 8).rotate([1, 0, 0], 90).translate(-59.5, 165.8, 17).scale(scale).color(rubber));

return p.model();
