// Aircraft fuel truck: Runway refueller with a rounded tank, distinct driver cab, hose reel and four heavy tyres. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'aircraft-fuel-truck',
  license: 'CC0-1.0',
  title: 'Aircraft fuel truck',
  description: 'Runway refueller with a rounded tank, distinct driver cab, hose reel and four heavy tyres. Material controls: vehicle paint, windshield glass, stainless steel, tyre and belt rubber. Appearance presets: weathered and high visibility.',
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
const p = assembly("aircraft-fuel-truck");
// Original generic apron refueller, dimensions in mm, cab faces +X.
p.part("chassis", box(7600, 2080, 240, true).translate(0, 0, 700).scale(scale).color(stainlessSteel));
p.part("cab", box(2200, 2150, 1950, true).translate(2650, 0, 1795).scale(scale).color(vehiclePaint));
p.part("cab-roof", box(2280, 2220, 100, true).translate(2650, 0, 2820).scale(scale).color(vehiclePaint));
p.part("cab-windscreen", box(45, 1850, 680, true).translate(3770, 0, 2270).scale(scale).color(windshieldGlass));
p.part("cab-side-window-left", box(1320, 40, 620, true).translate(2800, -1090, 2270).scale(scale).color(windshieldGlass));
p.part("cab-side-window-right", box(1320, 40, 620, true).translate(2800, 1090, 2270).scale(scale).color(windshieldGlass));
p.part("front-bumper", box(220, 2400, 260, true).translate(3900, 0, 650).scale(scale).color(stainlessSteel));
p.part("radiator-grille", box(55, 1180, 350, true).translate(3775, 0, 1290).scale(scale).color(rubber));
p.part("tanker", cylinder(3980, 870, 12).rotate([0, 1, 0], 90).translate(-3380, 0, 1770).scale(scale).color(stainlessSteel));
for (const x of [-3380, 600]) {
  p.part("tank-end-" + x, cylinder(110, 875, 12).rotate([0, 1, 0], 90).translate(x - 55, 0, 1770).scale(scale).color(stainlessSteel));
}
for (const x of [-2600, -400]) {
  p.part("saddle-" + x, box(240, 1200, 160, true).translate(x, 0, 880).scale(scale).color(vehiclePaint));
}
p.part("fill-hatch", cylinder(100, 240, 10).translate(-1100, 0, 2590).scale(scale).color(stainlessSteel));
p.part("hose-cabinet", box(1120, 410, 800, true).translate(-2400, 1010, 1190).scale(scale).color(vehiclePaint));
p.part("hose-reel", cylinder(190, 295, 12).rotate([1, 0, 0], 90).translate(-2400, 1390, 1190).scale(scale).color(rubber));
for (const x of [-2720, 2420]) {
  p.part("axle-" + x, cylinder(2200, 100, 8).rotate([1, 0, 0], 90).translate(x, 1100, 500).scale(scale).color(stainlessSteel));
  for (const side of [-1, 1]) {
    const y = side * 1140;
    p.part("wheel-" + x + "-" + side, cylinder(340, 500, 12).rotate([1, 0, 0], 90).translate(x, y + 170, 500).scale(scale).color(rubber));
    p.part("hub-" + x + "-" + side, cylinder(55, 240, 10).rotate([1, 0, 0], 90).translate(x, y + side * 170 + 27.5, 500).scale(scale).color(stainlessSteel));
  }
}
for (const side of [-1, 1]) {
  p.part("headlamp-" + side, box(65, 330, 240, true).translate(3780, side * 790, 1290).scale(scale).color(windshieldGlass));
  p.part("step-" + side, box(850, 300, 100, true).translate(2600, side * 1200, 880).scale(scale).color(stainlessSteel));
}
return p.model();
