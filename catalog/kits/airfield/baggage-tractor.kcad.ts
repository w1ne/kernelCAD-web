// Baggage tractor: Compact electric apron tractor with a forward cab, low chassis, tow coupling and four wheels. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'baggage-tractor',
  license: 'CC0-1.0',
  title: 'Baggage tractor',
  description: 'Compact electric apron tractor with a forward cab, low chassis, tow coupling and four wheels. Material controls: vehicle paint, windshield glass, stainless steel, tyre and belt rubber. Appearance presets: weathered and high visibility.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const vehiclePaint = param('vehiclePaint', '#d5af32', { label: 'Vehicle paint' });
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
const p = assembly("baggage-tractor");
p.part("chassis", box(255, 158.4, 42, true).translate(0, 0, 49).scale(scale).color(stainlessSteel));
p.part("operator-cab", box(81, 147.6, 95.2, true).translate(72, 0, 126.6).scale(scale).color(vehiclePaint));
p.part("cab-windscreen", box(5, 106.27, 26.66, true).translate(114.75, 0.00, 143.74).scale(scale).color(windshieldGlass));
p.part("cab-side-window-left", box(51.84, 5, 26.66, true).translate(81.72, -76.05, 143.74).scale(scale).color(windshieldGlass));
p.part("cab-side-window-right", box(51.84, 5, 26.66, true).translate(81.72, 76.05, 143.74).scale(scale).color(windshieldGlass));
p.part("rear-body", box(111, 151.2, 71.4, true).translate(-69, 0, 110.7).scale(scale).color(vehiclePaint));
p.part("tow-bar", box(81, 18, 16, true).translate(-144, 0, 49).scale(scale).color(stainlessSteel));
p.part("front-hood", box(96, 129.6, 44.2, true).translate(108, 0, 73).scale(scale).color(vehiclePaint));
p.part("wheel-1-left", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(-93, -77.6, 31).scale(scale).color(rubber));
p.part("wheel-1-right", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(-93, 109.6, 31).scale(scale).color(rubber));
p.part("wheel-2-left", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(93, -77.6, 31).scale(scale).color(rubber));
p.part("wheel-2-right", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(93, 109.6, 31).scale(scale).color(rubber));

return p.model();
