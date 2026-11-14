// Pushback tug: Low-profile aircraft pushback tug with a broad wheelbase, raised cab and nose-wheel cradle. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'pushback-tug',
  license: 'CC0-1.0',
  title: 'Pushback tug',
  description: 'Low-profile aircraft pushback tug with a broad wheelbase, raised cab and nose-wheel cradle. Material controls: vehicle paint, windshield glass, stainless steel, tyre and belt rubber. Appearance presets: weathered and high visibility.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const vehiclePaint = param('vehiclePaint', '#d9ae27', { label: 'Vehicle paint' });
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
const p = assembly("pushback-tug");
p.part("chassis", box(408, 246.4, 42, true).translate(0, 0, 49).scale(scale).color(stainlessSteel));
p.part("operator-cab", box(129.6, 229.6, 100.8, true).translate(115.2, 0, 129.4).scale(scale).color(vehiclePaint));
p.part("cab-windscreen", box(5, 165.31, 28.22, true).translate(182.25, 0.00, 147.54).scale(scale).color(windshieldGlass));
p.part("cab-side-window-left", box(82.94, 5, 28.22, true).translate(130.75, -117.05, 147.54).scale(scale).color(windshieldGlass));
p.part("cab-side-window-right", box(82.94, 5, 28.22, true).translate(130.75, 117.05, 147.54).scale(scale).color(windshieldGlass));
p.part("rear-body", box(177.6, 235.2, 75.6, true).translate(-110.4, 0, 112.8).scale(scale).color(vehiclePaint));
p.part("tow-bar", box(129.6, 18, 16, true).translate(-230.4, 0, 49).scale(scale).color(stainlessSteel));
p.part("nose-wheel-cradle", box(105.6, 173.6, 24, true).translate(230.4, 0, 74).scale(scale).color(rubber));
p.part("wheel-1-left", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(-148.8, -129.6, 31).scale(scale).color(rubber));
p.part("wheel-1-right", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(-148.8, 161.6, 31).scale(scale).color(rubber));
p.part("wheel-2-left", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(148.8, -129.6, 31).scale(scale).color(rubber));
p.part("wheel-2-right", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(148.8, 161.6, 31).scale(scale).color(rubber));

return p.model();
