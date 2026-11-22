// Runway sweeper: Apron sweeper vehicle with a front rotary brush, operator cab and rear equipment housing. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'runway-sweeper',
  license: 'CC0-1.0',
  title: 'Runway sweeper',
  description: 'Apron sweeper vehicle with a front rotary brush, operator cab and rear equipment housing. Material controls: vehicle paint, windshield glass, stainless steel, tyre and belt rubber. Appearance presets: weathered and high visibility.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const vehiclePaint = param('vehiclePaint', '#c9a52b', { label: 'Vehicle paint' });
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
const p = assembly("runway-sweeper");
p.part("chassis", box(442, 193.6, 42, true).translate(0, 0, 49).scale(scale).color(stainlessSteel));
p.part("cab", box(130, 180.4, 162, true).translate(156, 0, 157).scale(scale).color(vehiclePaint));
p.part("cab-windscreen", box(5, 129.89, 45.36, true).translate(223.25, 0.00, 186.16).scale(scale).color(windshieldGlass));
p.part("cab-side-window-left", box(83.2, 5, 45.36, true).translate(171.60, -92.45, 186.16).scale(scale).color(windshieldGlass));
p.part("cab-side-window-right", box(83.2, 5, 45.36, true).translate(171.60, 92.45, 186.16).scale(scale).color(windshieldGlass));
p.part("equipment-body", box(218.4, 187, 144, true).translate(-104, 0, 151).scale(scale).color(vehiclePaint));
p.part("front-brush", cylinder(24, 58, 8).rotate([1, 0, 0], 90).translate(218.4, 12, 58).scale(scale).color(rubber));
p.part("brush-arm", box(104, 16, 14, true).translate(202.8, 0, 75).scale(scale).color(rubber));
p.part("wheel-1-left", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(-161.2, -98.4, 31).scale(scale).color(rubber));
p.part("wheel-1-right", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(-161.2, 130.4, 31).scale(scale).color(rubber));
p.part("wheel-2-left", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(161.2, -98.4, 31).scale(scale).color(rubber));
p.part("wheel-2-right", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(161.2, 130.4, 31).scale(scale).color(rubber));

return p.model();
