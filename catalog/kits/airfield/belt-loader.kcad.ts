// Belt loader: Compact baggage loader with an inclined conveyor belt, support frame and low service chassis. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'belt-loader',
  license: 'CC0-1.0',
  title: 'Belt loader',
  description: 'Compact baggage loader with an inclined conveyor belt, support frame and low service chassis. Material controls: vehicle paint, windshield glass, stainless steel, tyre and belt rubber. Appearance presets: weathered and high visibility.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const vehiclePaint = param('vehiclePaint', '#e4b22c', { label: 'Vehicle paint' });
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
const p = assembly("belt-loader");
p.part("chassis", box(399.5, 167.2, 42, true).translate(0, 0, 56).scale(scale).color(stainlessSteel));
p.part("operator-cab", box(103.4, 140.6, 112, true).translate(126.9, 0, 104).scale(scale).color(vehiclePaint));
p.part("cab-windscreen", box(5, 101.23, 31.36, true).translate(180.85, 0.00, 124.16).scale(scale).color(windshieldGlass));
p.part("cab-side-window-left", box(66.18, 5, 31.36, true).translate(139.31, -72.55, 124.16).scale(scale).color(windshieldGlass));
p.part("cab-side-window-right", box(66.18, 5, 31.36, true).translate(139.31, 72.55, 124.16).scale(scale).color(windshieldGlass));
p.part("conveyor-frame", box(390.1, 60.8, 22, true).rotate([0, 1, 0], -28).translate(-18.8, 0, 223.5).scale(scale).color(stainlessSteel));
p.part("conveyor-belt", box(376, 72.2, 10, true).rotate([0, 1, 0], -28).translate(-18.8, 0, 234).scale(scale).color(rubber));
p.part("loader-support", box(18, 18, 126, true).translate(-32.9, 0, 118.5).scale(scale).color(stainlessSteel));
p.part("wheel-1-left", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(-145.7, -82.8, 38).scale(scale).color(rubber));
p.part("wheel-1-right", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(-145.7, 114.8, 38).scale(scale).color(rubber));
p.part("wheel-2-left", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(145.7, -82.8, 38).scale(scale).color(rubber));
p.part("wheel-2-right", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(145.7, 114.8, 38).scale(scale).color(rubber));

return p.model();
