// Sailplane: Slender glider fuselage and long tapered wings with a compact tailplane and small wheel. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'sailplane',
  license: 'CC0-1.0',
  title: 'Sailplane',
  description: 'Slender glider fuselage and long tapered wings with a compact tailplane and small wheel. Material controls: airframe paint, canopy glass, bare aluminium, tyre rubber. Appearance presets: weathered and high visibility.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const airframePaint = param('airframePaint', '#e3e2da', { label: 'Airframe paint' });
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
const p = assembly("sailplane");
p.part("fuselage", sphere(31).scale([14.516, 1, 0.72]).translate(0, 0, 190).scale(scale).color(airframePaint));
p.part("cockpit-canopy", sphere(19.22).scale([1.05, 0.82, 0.6]).translate(153, 0, 209.195).scale(scale).color(canopyGlass));
p.part("main-wing", extrudePolygon([[-180, -925], [126, -925], [18, 0], [126, 925], [-180, 925], [-54, 0]], 16).translate(0, 0, 185.09).scale(scale).color(airframePaint));
p.part("tailplane", extrudePolygon([[-315, -314.5], [-198, -314.5], [-243, 0], [-198, 314.5], [-315, 314.5], [-279, 0]], 14).translate(0, 0, 201.16).scale(scale).color(airframePaint));
p.part("vertical-tail", box(144, 16, 49.6, true).translate(-306, 0, 214.552).scale(scale).color(airframePaint));
p.part("glider-wheel-strut", box(10, 10, 143.68, true).translate(27, 0, 99.84).scale(scale).color(bareMetal));
p.part("glider-wheel", cylinder(16, 14, 8).rotate([1, 0, 0], 90).translate(27, 8, 14).scale(scale).color(rubber));

return p.model();
