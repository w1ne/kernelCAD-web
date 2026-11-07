// Catering truck: High-sided catering vehicle with a box body, cab, rear stabilizers and raised service platform. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'catering-truck',
  license: 'CC0-1.0',
  title: 'Catering truck',
  description: 'High-sided catering vehicle with a box body, cab, rear stabilizers and raised service platform. Material controls: vehicle paint, windshield glass, stainless steel, tyre and belt rubber. Appearance presets: weathered and high visibility.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const vehiclePaint = param('vehiclePaint', '#d7d9d1', { label: 'Vehicle paint' });
const windshieldGlass = param('windshieldGlass', '#72b1bd', { label: 'Windshield glass' });
const stainlessSteel = param('stainlessSteel', '#a9b4b6', { label: 'Stainless steel' });
const rubber = param('rubber', '#282e31', { label: 'Tyre and belt rubber' });

presets({
  weathered: {
    vehiclePaint: '#596765',
    windshieldGlass: '#315c69',
    stainlessSteel: '#536267',
    rubber: '#202528',
  },
  highVisibility: {
    vehiclePaint: '#f0b52f',
    windshieldGlass: '#82c8d0',
    stainlessSteel: '#aeb9bb',
    rubber: '#262b2e',
  },
});
const p = assembly("catering-truck");
p.part("chassis", box(518.5, 193.6, 42, true).translate(0, 0, 56).scale(scale).color(stainlessSteel));
p.part("cab", box(152.5, 180.4, 237.6, true).translate(183, 0, 201.8).scale(scale).color(vehiclePaint));
p.part("cab-windscreen", box(5, 129.89, 66.53, true).translate(261.50, 0.00, 244.57).scale(scale).color(windshieldGlass));
p.part("cab-side-window-left", box(97.6, 5, 66.53, true).translate(201.30, -92.45, 244.57).scale(scale).color(windshieldGlass));
p.part("cab-side-window-right", box(97.6, 5, 66.53, true).translate(201.30, 92.45, 244.57).scale(scale).color(windshieldGlass));
p.part("service-box", box(292.8, 198, 246.4, true).translate(-103.7, 0, 219.2).scale(scale).color(vehiclePaint));
p.part("lift-platform", box(189.1, 200.2, 20, true).translate(-170.8, 0, 530).scale(scale).color(vehiclePaint));
p.part("lift-mast", box(18, 18, 132, true).translate(-268.4, 0, 310.8).scale(scale).color(stainlessSteel));
p.part("wheel-1-left", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(-189.1, -98.4, 38).scale(scale).color(rubber));
p.part("wheel-1-right", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(-189.1, 130.4, 38).scale(scale).color(rubber));
p.part("wheel-2-left", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(189.1, -98.4, 38).scale(scale).color(rubber));
p.part("wheel-2-right", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(189.1, 130.4, 38).scale(scale).color(rubber));

return p.model();
