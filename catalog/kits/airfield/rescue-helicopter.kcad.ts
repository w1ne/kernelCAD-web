// Rescue helicopter: Rescue helicopter with a wide cabin, tail rotor, landing skids and side-mounted hoist arm. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'rescue-helicopter',
  license: 'CC0-1.0',
  title: 'Rescue helicopter',
  description: 'Rescue helicopter with a wide cabin, tail rotor, landing skids and side-mounted hoist arm. Material controls: airframe paint, cockpit glass, rotor and hardware metal. Appearance presets: weathered and high visibility.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const airframePaint = param('airframePaint', '#d9b02d', { label: 'Airframe paint' });
const canopyGlass = param('canopyGlass', '#78b9c3', { label: 'Cockpit glass' });
const bareMetal = param('bareMetal', '#9ca9ad', { label: 'Rotor and hardware metal' });

presets({
  weathered: {
    airframePaint: '#596765',
    canopyGlass: '#315c69',
    bareMetal: '#536267',
  },
  highVisibility: {
    airframePaint: '#f0b52f',
    canopyGlass: '#82c8d0',
    bareMetal: '#aeb9bb',
  },
});
const p = assembly("rescue-helicopter");
p.part("cabin", sphere(107.5).scale([4.856, 1.395, 0.75]).translate(0, 0, 168).scale(scale).color(airframePaint));
p.part("cockpit", sphere(129).scale([0.82, 0.87, 0.63]).translate(208.8, 0, 188).scale(scale).color(canopyGlass));
p.part("tail-boom", box(489.6, 38, 42, true).translate(-439.2, 0, 184).scale(scale).color(airframePaint));
p.part("tail-fin", box(108, 18, 105, true).translate(-648, 0, 160).scale(scale).color(airframePaint));
p.part("tail-plane", box(158.4, 225, 16, true).translate(-446.4, 0, 180).scale(scale).color(airframePaint));
p.part("rotor-mast", cylinder(100, 12, 8).translate(0, 0, 188).scale(scale).color(bareMetal));
p.part("main-rotor-blade-a", box(896.4, 26, 9, true).translate(0, 0, 294).scale(scale).color(bareMetal));
p.part("main-rotor-blade-b", box(896.4, 26, 9, true).rotate([0, 0, 1], 90).translate(0, 0, 294).scale(scale).color(bareMetal));
p.part("tail-rotor-hub", cylinder(24, 14, 8).rotate([0, 1, 0], 90).translate(-667.2, 0, 210).scale(scale).color(bareMetal));
p.part("tail-rotor-blade-a", box(9, 12, 92, true).translate(-669.6, 0, 210).scale(scale).color(bareMetal));
p.part("tail-rotor-blade-b", box(9, 12, 92, true).rotate([1, 0, 0], 90).translate(-669.6, 0, 210).scale(scale).color(bareMetal));
p.part("left-skid-support-front", box(12, 12, 75.375, true).translate(129.6, -129, 49.688).scale(scale).color(bareMetal));
p.part("left-skid-support-rear", box(12, 12, 75.375, true).translate(-172.8, -129, 49.688).scale(scale).color(bareMetal));
p.part("left-skid", box(619.2, 14, 12, true).translate(0, -129, 6).scale(scale).color(bareMetal));
p.part("right-skid-support-front", box(12, 12, 75.375, true).translate(129.6, 129, 49.688).scale(scale).color(bareMetal));
p.part("right-skid-support-rear", box(12, 12, 75.375, true).translate(-172.8, 129, 49.688).scale(scale).color(bareMetal));
p.part("right-skid", box(619.2, 14, 12, true).translate(0, 129, 6).scale(scale).color(bareMetal));
p.part("hoist-arm", box(237.6, 12, 12, true).translate(93.6, 174, 178).scale(scale).color(bareMetal));
p.part("hoist-cable", cylinder(115, 4, 8).translate(165.6, 174, 55).scale(scale).color(bareMetal));
p.part("hoist-hook", sphere(12).scale([0.8, 0.8, 1.2]).translate(165.6, 174, 25).scale(scale).color(bareMetal));

return p.model();
