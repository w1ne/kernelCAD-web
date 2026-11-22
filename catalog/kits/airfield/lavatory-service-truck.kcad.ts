// Lavatory service truck: Compact sanitary service vehicle with a tank body, rear hose and low access step. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'lavatory-service-truck',
  license: 'CC0-1.0',
  title: 'Lavatory service truck',
  description: 'Compact sanitary service vehicle with a tank body, rear hose and low access step. Material controls: vehicle paint, windshield glass, stainless steel, tyre and belt rubber. Appearance presets: weathered and high visibility.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const vehiclePaint = param('vehiclePaint', '#4c9caa', { label: 'Vehicle paint' });
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
const p = assembly("lavatory-service-truck");
p.part("chassis", box(476, 189.2, 42, true).translate(0, 0, 49).scale(scale).color(stainlessSteel));
p.part("cab", box(140, 176.3, 178.2, true).translate(168, 0, 165.1).scale(scale).color(vehiclePaint));
p.part("cab-windscreen", box(5, 126.94, 49.9, true).translate(240.25, 0.00, 197.18).scale(scale).color(windshieldGlass));
p.part("cab-side-window-left", box(89.6, 5, 49.9, true).translate(184.80, -90.40, 197.18).scale(scale).color(windshieldGlass));
p.part("cab-side-window-right", box(89.6, 5, 49.9, true).translate(184.80, 90.40, 197.18).scale(scale).color(windshieldGlass));
p.part("service-tank", sphere(92.45).scale([1.3, 0.92, 0.8]).translate(-89.6, 0, 163).scale(scale).color(vehiclePaint));
p.part("rear-hose", cylinder(20, 26, 8).rotate([1, 0, 0], 90).translate(-229.6, 121.8, 123.4).scale(scale).color(stainlessSteel));
p.part("access-step", box(88, 197.8, 16, true).translate(-128.8, 0, 59).scale(scale).color(stainlessSteel));
p.part("wheel-1-left", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(-173.6, -95.8, 31).scale(scale).color(rubber));
p.part("wheel-1-right", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(-173.6, 127.8, 31).scale(scale).color(rubber));
p.part("wheel-2-left", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(173.6, -95.8, 31).scale(scale).color(rubber));
p.part("wheel-2-right", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(173.6, 127.8, 31).scale(scale).color(rubber));

return p.model();
