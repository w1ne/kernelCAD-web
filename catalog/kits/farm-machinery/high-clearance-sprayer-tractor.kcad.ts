// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly high-clearance crop tractor scene prop, modeled from scratch.
meta({
  name: "high-clearance-sprayer-tractor",
  license: 'CC0-1.0',
  title: "High-clearance crop tractor",
  description: "Tall crop-care tractor with raised axle clearance, narrow tires and a central operator cab. Knobs: overall scale, body color and accent color.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'prop',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#5d7f75', { label: 'Body color' });
const accent = param('accent', '#c67b39', { label: 'Accent color' });
const p = assembly('high-clearance-sprayer-tractor');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('rear-wheel--1', cylinder(96, 320, 12).rotate([0, 1, 0], 90).translate(-356, -301, 320), "#414848");
add('rear-wheel--1-hub', cylinder(105.6, 108.8, 10).translate(-360.8, -301, 320), accent);
add('front-wheel--1', cylinder(76, 300, 12).rotate([0, 1, 0], 90).translate(325, -301, 300), "#414848");
add('front-wheel--1-hub', cylinder(83.6, 102, 10).translate(321.2, -301, 300), accent);
add('rear-wheel-1', cylinder(96, 320, 12).rotate([0, 1, 0], 90).translate(-356, 301, 320), "#414848");
add('rear-wheel-1-hub', cylinder(105.6, 108.8, 10).translate(-360.8, 301, 320), accent);
add('front-wheel-1', cylinder(76, 300, 12).rotate([0, 1, 0], 90).translate(325, 301, 300), "#414848");
add('front-wheel-1-hub', cylinder(83.6, 102, 10).translate(321.2, 301, 300), accent);
add('main-chassis', box(825, 378, 150, true).translate(-44, 0, 318.2), body);
add('engine-hood', box(484, 329, 230.4, true).translate(242, 0, 458.4), accent);
add('front-grille', box(38, 266, 140.8, true).translate(495, 0, 423.6), body);
add('rear-fender-left', box(308, 150, 36, true).translate(-308, -196, 568.4), accent);
add('rear-fender-right', box(308, 150, 36, true).translate(-308, 196, 568.4), accent);
add('cab-floor', box(352, 336, 45, true).translate(-220, 0, 458.5), body);
add('cab-glazing-front', box(24, 315.84, 249.6, true).translate(-55, 0, 610.8), accent);
add('cab-glazing-rear', box(24, 315.84, 249.6, true).translate(-385, 0, 610.8), accent);
add('cab-pillar--1', box(352, 30, 288, true).translate(-220, -168, 650), body);
add('cab-pillar-1', box(352, 30, 288, true).translate(-220, 168, 650), body);
add('cab-roof', box(422.4, 403.2, 70, true).translate(-220, 0, 733.4), accent);
add('exhaust-stack', cylinder(240, 24, 8).translate(198, -98, 473.6), body);
add('rear-hitch', box(190, 190, 150, true).translate(-561, 0, 115), accent);
add('front-weight-block', box(210, 315, 80, true).translate(550, 0, 60), body);
add('high-clearance-portal', box(150, 336, 220, true).translate(0, 0, 608.4), body);

return p.model();
