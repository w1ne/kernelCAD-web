// Private jet: Long-range business jet with a narrow cabin, swept wings and two rear-mounted engines. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'private-jet',
  license: 'CC0-1.0',
  title: 'Private jet',
  description: 'Long-range business jet with a narrow cabin, swept wings and two rear-mounted engines. Material controls: airframe paint, canopy glass, bare aluminium, tyre rubber. Appearance presets: weathered and high visibility.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const airframePaint = param('airframePaint', '#ebe9e0', { label: 'Airframe paint' });
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
const p = assembly("private-jet");
p.part("fuselage", sphere(48).scale([10.938, 1, 0.72]).translate(0, 0, 190).scale(scale).color(airframePaint));
p.part("cockpit-canopy", sphere(29.76).scale([1.05, 0.82, 0.6]).translate(178.5, 0, 219.722).scale(scale).color(canopyGlass));
p.part("main-wing", extrudePolygon([[-210, -490], [147, -490], [21, 0], [147, 490], [-210, 490], [-63, 0]], 16).translate(0, 0, 182.397).scale(scale).color(airframePaint));
p.part("tailplane", extrudePolygon([[-367.5, -166.6], [-231, -166.6], [-283.5, 0], [-231, 166.6], [-367.5, 166.6], [-325.5, 0]], 14).translate(0, 0, 207.28).scale(scale).color(airframePaint));
p.part("vertical-tail", box(168, 16, 76.8, true).translate(-357, 0, 228.016).scale(scale).color(airframePaint));
p.part("engine-1", sphere(19.2).scale([1.85, 0.58, 0.58]).translate(-42, -333.2, 148.397).scale(scale).color(bareMetal));
p.part("engine-2", sphere(19.2).scale([1.85, 0.58, 0.58]).translate(-42, 333.2, 148.397).scale(scale).color(bareMetal));
p.part("nose-gear-strut", box(12, 12, 127.44, true).translate(325.5, 0, 97.72).scale(scale).color(bareMetal));
p.part("nose-wheel", cylinder(18, 17, 8).rotate([1, 0, 0], 90).translate(325.5, 9, 17).scale(scale).color(rubber));
p.part("left-main-gear-strut", box(14, 14, 152.397, true).translate(-73.5, -137.2, 110.198).scale(scale).color(bareMetal));
p.part("left-main-wheel", cylinder(18, 17, 8).rotate([1, 0, 0], 90).translate(-73.5, -128.2, 17).scale(scale).color(rubber));
p.part("right-main-gear-strut", box(14, 14, 152.397, true).translate(-73.5, 137.2, 110.198).scale(scale).color(bareMetal));
p.part("right-main-wheel", cylinder(18, 17, 8).rotate([1, 0, 0], 90).translate(-73.5, 146.2, 17).scale(scale).color(rubber));

return p.model();
