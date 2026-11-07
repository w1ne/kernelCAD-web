// Narrowbody airliner: Single-aisle airliner with swept wings, under-wing engines, tail fin and landing gear. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'narrowbody-airliner',
  license: 'CC0-1.0',
  title: 'Narrowbody airliner',
  description: 'Single-aisle airliner with swept wings, under-wing engines, tail fin and landing gear. Material controls: airframe paint, canopy glass, bare aluminium, tyre rubber. Appearance presets: weathered and high visibility.',
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
const p = assembly("narrowbody-airliner");
p.part("fuselage", sphere(66).scale([10.076, 1, 0.72]).translate(0, 0, 190).scale(scale).color(airframePaint));
p.part("cockpit-canopy", sphere(40.92).scale([1.05, 0.82, 0.6]).translate(226.1, 0, 230.867).scale(scale).color(canopyGlass));
p.part("main-wing", extrudePolygon([[-266, -715], [186.2, -715], [26.6, 0], [186.2, 715], [-266, 715], [-79.8, 0]], 16).translate(0, 0, 179.546).scale(scale).color(airframePaint));
p.part("tailplane", extrudePolygon([[-465.5, -243.1], [-292.6, -243.1], [-359.1, 0], [-292.6, 243.1], [-465.5, 243.1], [-412.3, 0]], 14).translate(0, 0, 213.76).scale(scale).color(airframePaint));
p.part("vertical-tail", box(212.8, 16, 105.6, true).translate(-452.2, 0, 242.272).scale(scale).color(airframePaint));
p.part("engine-1", sphere(26.4).scale([1.85, 0.58, 0.58]).translate(26.6, -486.2, 145.546).scale(scale).color(bareMetal));
p.part("engine-2", sphere(26.4).scale([1.85, 0.58, 0.58]).translate(26.6, 486.2, 145.546).scale(scale).color(bareMetal));
p.part("nose-gear-strut", box(12, 12, 114.48, true).translate(412.3, 0, 91.24).scale(scale).color(bareMetal));
p.part("nose-wheel", cylinder(18, 17, 8).rotate([1, 0, 0], 90).translate(412.3, 9, 17).scale(scale).color(rubber));
p.part("left-main-gear-strut", box(14, 14, 149.546, true).translate(-93.1, -200.2, 108.773).scale(scale).color(bareMetal));
p.part("left-main-wheel", cylinder(18, 17, 8).rotate([1, 0, 0], 90).translate(-93.1, -191.2, 17).scale(scale).color(rubber));
p.part("right-main-gear-strut", box(14, 14, 149.546, true).translate(-93.1, 200.2, 108.773).scale(scale).color(bareMetal));
p.part("right-main-wheel", cylinder(18, 17, 8).rotate([1, 0, 0], 90).translate(-93.1, 209.2, 17).scale(scale).color(rubber));

return p.model();
