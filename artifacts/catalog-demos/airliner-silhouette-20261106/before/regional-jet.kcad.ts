// Regional jet: Small passenger jet with swept wings, two under-wing engines and a three-wheel landing gear. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'regional-jet',
  license: 'CC0-1.0',
  title: 'Regional jet',
  description: 'Small passenger jet with swept wings, two under-wing engines and a three-wheel landing gear. Material controls: airframe paint, canopy glass, bare aluminium, tyre rubber. Appearance presets: weathered and high visibility.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const airframePaint = param('airframePaint', '#e9e8df', { label: 'Airframe paint' });
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
const p = assembly("regional-jet");
p.part("fuselage", sphere(54).scale([10, 1, 0.72]).translate(0, 0, 190).scale(scale).color(airframePaint));
p.part("cockpit-canopy", sphere(33.48).scale([1.05, 0.82, 0.6]).translate(183.6, 0, 223.437).scale(scale).color(canopyGlass));
p.part("main-wing", extrudePolygon([[-216, -590], [151.2, -590], [21.6, 0], [151.2, 590], [-216, 590], [-64.8, 0]], 16).translate(0, 0, 181.446).scale(scale).color(airframePaint));
p.part("tailplane", extrudePolygon([[-378, -200.6], [-237.6, -200.6], [-291.6, 0], [-237.6, 200.6], [-378, 200.6], [-334.8, 0]], 14).translate(0, 0, 209.44).scale(scale).color(airframePaint));
p.part("vertical-tail", box(172.8, 16, 86.4, true).translate(-367.2, 0, 232.768).scale(scale).color(airframePaint));
p.part("engine-1", sphere(21.6).scale([1.85, 0.58, 0.58]).translate(21.6, -401.2, 147.446).scale(scale).color(bareMetal));
p.part("engine-2", sphere(21.6).scale([1.85, 0.58, 0.58]).translate(21.6, 401.2, 147.446).scale(scale).color(bareMetal));
p.part("nose-gear-strut", box(12, 12, 123.12, true).translate(334.8, 0, 95.56).scale(scale).color(bareMetal));
p.part("nose-wheel", cylinder(18, 17, 8).rotate([1, 0, 0], 90).translate(334.8, 9, 17).scale(scale).color(rubber));
p.part("left-main-gear-strut", box(14, 14, 151.446, true).translate(-75.6, -165.2, 109.723).scale(scale).color(bareMetal));
p.part("left-main-wheel", cylinder(18, 17, 8).rotate([1, 0, 0], 90).translate(-75.6, -156.2, 17).scale(scale).color(rubber));
p.part("right-main-gear-strut", box(14, 14, 151.446, true).translate(-75.6, 165.2, 109.723).scale(scale).color(bareMetal));
p.part("right-main-wheel", cylinder(18, 17, 8).rotate([1, 0, 0], 90).translate(-75.6, 174.2, 17).scale(scale).color(rubber));

return p.model();
