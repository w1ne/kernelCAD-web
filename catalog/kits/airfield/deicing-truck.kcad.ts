// De-icing truck: De-icing service vehicle with a fluid tank, telescoping boom and raised operator basket. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'deicing-truck',
  license: 'CC0-1.0',
  title: 'De-icing truck',
  description: 'De-icing service vehicle with a fluid tank, telescoping boom and raised operator basket. Material controls: vehicle paint, windshield glass, stainless steel, tyre and belt rubber. Appearance presets: weathered and high visibility.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const vehiclePaint = param('vehiclePaint', '#d8b32a', { label: 'Vehicle paint' });
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
const p = assembly("deicing-truck");
p.part("chassis", box(518.5, 202.4, 42, true).translate(0, 0, 56).scale(scale).color(stainlessSteel));
p.part("cab", box(152.5, 188.6, 253.8, true).translate(183, 0, 209.9).scale(scale).color(vehiclePaint));
p.part("cab-windscreen", box(5, 135.79, 71.06, true).translate(261.50, 0.00, 255.58).scale(scale).color(windshieldGlass));
p.part("cab-side-window-left", box(97.6, 5, 71.06, true).translate(201.30, -96.55, 255.58).scale(scale).color(windshieldGlass));
p.part("cab-side-window-right", box(97.6, 5, 71.06, true).translate(201.30, 96.55, 255.58).scale(scale).color(windshieldGlass));
p.part("fluid-tank", sphere(98.9).scale([1.45, 0.96, 0.86]).translate(-97.6, 0, 132).scale(scale).color(vehiclePaint));
p.part("boom-base", box(20, 20, 225.6, true).translate(-134.2, 0, 296.5).scale(scale).color(stainlessSteel));
p.part("boom-arm", box(256.2, 18, 18, true).rotate([0, 1, 0], -32).translate(-6.1, 0, 442.2).scale(scale).color(stainlessSteel));
p.part("operator-basket", box(72, 72, 72, true).translate(109.8, 0, 550).scale(scale).color(vehiclePaint));
p.part("wheel-1-left", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(-189.1, -103.6, 38).scale(scale).color(rubber));
p.part("wheel-1-right", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(-189.1, 135.6, 38).scale(scale).color(rubber));
p.part("wheel-2-left", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(189.1, -103.6, 38).scale(scale).color(rubber));
p.part("wheel-2-right", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(189.1, 135.6, 38).scale(scale).color(rubber));

return p.model();
