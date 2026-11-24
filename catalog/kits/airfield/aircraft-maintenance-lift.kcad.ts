// Aircraft maintenance lift: Self-propelled scissor lift with a guarded service platform, crossed arms and compact chassis. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'aircraft-maintenance-lift',
  license: 'CC0-1.0',
  title: 'Aircraft maintenance lift',
  description: 'Self-propelled scissor lift with a guarded service platform, crossed arms and compact chassis. Material controls: powder-coated steel, galvanized steel, tyre rubber. Appearance presets: weathered and high visibility.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param('powderCoat', '#d6a72d', { label: 'Powder-coated steel' });
const galvanizedSteel = param('galvanizedSteel', '#89989c', { label: 'Galvanized steel' });
const rubber = param('rubber', '#292f32', { label: 'Tyre rubber' });

presets({
  weathered: {
    powderCoat: '#596765',
    galvanizedSteel: '#536267',
    rubber: '#202528',
  },
  highVisibility: {
    powderCoat: '#d6a72d',
    galvanizedSteel: '#aeb9bb',
    rubber: '#262b2e',
  },
});
const p = assembly("aircraft-maintenance-lift");
// Generic mobile maintenance platform, extended configuration in mm.
p.part("chassis", box(4300, 2100, 360, true).translate(0, 0, 650).scale(scale).color(powderCoat));
p.part("lower-platform", box(3400, 1760, 150, true).translate(0, 0, 870).scale(scale).color(galvanizedSteel));
for (const side of [-1, 1]) {
  const y = side * 700;
  p.part("scissor-ascending-" + side, box(4010, 120, 170, true).rotate([0, 1, 0], -41.987).translate(0, y - 75, 2200).scale(scale).color(powderCoat));
  p.part("scissor-descending-" + side, box(4010, 120, 170, true).rotate([0, 1, 0], 41.987).translate(0, y + 75, 2200).scale(scale).color(powderCoat));
}
for (const z of [860, 3540]) {
  for (const x of [-1500, 1500]) {
    p.part("end-pivot-" + z + "-" + x, cylinder(1760, 95, 10).rotate([1, 0, 0], 90).translate(x, 880, z).scale(scale).color(galvanizedSteel));
  }
}
p.part("scissor-pivot", cylinder(1760, 125, 10).rotate([1, 0, 0], 90).translate(0, 880, 2200).scale(scale).color(galvanizedSteel));
p.part("upper-platform", box(3500, 1900, 180, true).translate(0, 0, 3620).scale(scale).color(galvanizedSteel));
for (const side of [-1, 1]) {
  for (const x of [-1660, 0, 1660]) {
    p.part("guard-post-" + side + "-" + x, box(70, 70, 1100, true).translate(x, side * 880, 4250).scale(scale).color(galvanizedSteel));
  }
  for (const z of [4250, 4770]) {
    p.part("side-rail-" + side + "-" + z, box(3390, 70, 70, true).translate(0, side * 880, z).scale(scale).color(galvanizedSteel));
    p.part("end-rail-" + side + "-" + z, box(70, 1760, 70, true).translate(side * 1660, 0, z).scale(scale).color(galvanizedSteel));
  }
  p.part("toe-board-" + side, box(3390, 60, 150, true).translate(0, side * 900, 3785).scale(scale).color(galvanizedSteel));
}
for (const x of [-1550, 1550]) {
  p.part("axle-" + x, cylinder(2100, 100, 8).rotate([1, 0, 0], 90).translate(x, 1050, 420).scale(scale).color(galvanizedSteel));
  for (const side of [-1, 1]) {
    p.part("wheel-" + x + "-" + side, cylinder(300, 420, 12).rotate([1, 0, 0], 90).translate(x, side * 1100 + 150, 420).scale(scale).color(rubber));
  }
}
return p.model();
