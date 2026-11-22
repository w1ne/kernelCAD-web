// Ultralight trike: Minimal weight-shift aircraft with a triangular wing, open frame, seat and three small wheels. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'ultralight-trike',
  license: 'CC0-1.0',
  title: 'Ultralight trike',
  description: 'Minimal weight-shift aircraft with a triangular wing, open frame, seat and three small wheels. Material controls: airframe paint, canopy glass, bare aluminium, tyre rubber. Appearance presets: weathered and high visibility.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const airframePaint = param('airframePaint', '#e0b53b', { label: 'Airframe paint' });
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
const p = assembly("ultralight-trike");
p.part("fuselage", sphere(29).scale([11.379, 1, 0.72]).translate(0, 0, 190).scale(scale).color(airframePaint));
p.part("cockpit-canopy", sphere(17.98).scale([1.05, 0.82, 0.6]).translate(112.2, 0, 207.957).scale(scale).color(canopyGlass));
p.part("main-wing", extrudePolygon([[-132, -520], [92.4, -520], [13.2, 0], [92.4, 520], [-132, 520], [-39.6, 0]], 16).translate(0, 0, 197.517).scale(scale).color(airframePaint));
p.part("tailplane", extrudePolygon([[-231, -176.8], [-145.2, -176.8], [-178.2, 0], [-145.2, 176.8], [-231, 176.8], [-204.6, 0]], 14).translate(0, 0, 200.44).scale(scale).color(airframePaint));
p.part("vertical-tail", box(105.6, 16, 46.4, true).translate(-224.4, 0, 212.968).scale(scale).color(airframePaint));
p.part("left-wing-strut", box(12, 12, 39.672, true).translate(-19.8, -187.2, 185.824).scale(scale).color(bareMetal));
p.part("right-wing-strut", box(12, 12, 39.672, true).translate(-19.8, 187.2, 185.824).scale(scale).color(bareMetal));
p.part("engine-1", sphere(10.44).scale([1.25, 0.7, 0.7]).translate(264, 0, 162.517).scale(scale).color(bareMetal));
p.part("engine-1-prop-hub", sphere(4.93).scale([0.72, 0.72, 0.72]).translate(330, 0, 162.517).scale(scale).color(bareMetal));
p.part("engine-1-blade-1", box(8, 60.9, 10, true).rotate([1, 0, 0], 0).translate(330, 0, 162.517).scale(scale).color(bareMetal));
p.part("engine-1-blade-2", box(8, 60.9, 10, true).rotate([1, 0, 0], 120).translate(330, 0, 162.517).scale(scale).color(bareMetal));
p.part("engine-1-blade-3", box(8, 60.9, 10, true).rotate([1, 0, 0], 240).translate(330, 0, 162.517).scale(scale).color(bareMetal));
p.part("open-frame", box(237.6, 16, 145, true).translate(-132, 0, 112).scale(scale).color(airframePaint));
p.part("seat", box(70, 78, 70, true).translate(-59.4, 0, 145).scale(scale).color(airframePaint));
p.part("nose-gear-strut", box(12, 12, 94, true).translate(184.8, 0, 67).scale(scale).color(bareMetal));
p.part("nose-wheel", cylinder(14, 20, 8).rotate([1, 0, 0], 90).translate(184.8, 7, 20).scale(scale).color(rubber));
p.part("left-main-gear-strut", box(12, 12, 62, true).translate(-105.6, -124.8, 51).scale(scale).color(bareMetal));
p.part("left-main-wheel", cylinder(14, 20, 8).rotate([1, 0, 0], 90).translate(-105.6, -117.8, 20).scale(scale).color(rubber));
p.part("right-main-gear-strut", box(12, 12, 62, true).translate(-105.6, 124.8, 51).scale(scale).color(bareMetal));
p.part("right-main-wheel", cylinder(14, 20, 8).rotate([1, 0, 0], 90).translate(-105.6, 131.8, 20).scale(scale).color(rubber));

return p.model();
