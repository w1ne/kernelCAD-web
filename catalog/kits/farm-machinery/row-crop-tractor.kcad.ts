// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly row-crop tractor scene prop, modeled from scratch.
meta({
  name: "row-crop-tractor",
  license: 'CC0-1.0',
  title: "Row-crop tractor",
  description: "Cabbed field tractor with tall rear tires, front axle, engine hood and three-point hitch. Knobs: overall scale, body color and accent color.",
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
const p = assembly('row-crop-tractor');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('rear-wheel--1', cylinder(130, 410, 12).rotate([0, 1, 0], 90).translate(-389.8, -309.6, 410), "#414848");
add('rear-wheel--1-hub', cylinder(143, 139.4, 10).translate(-396.3, -309.6, 410), accent);
add('front-wheel--1', cylinder(76, 290, 12).rotate([0, 1, 0], 90).translate(344.8, -309.6, 290), "#414848");
add('front-wheel--1-hub', cylinder(83.6, 98.6, 10).translate(341, -309.6, 290), accent);
add('rear-wheel-1', cylinder(130, 410, 12).rotate([0, 1, 0], 90).translate(-389.8, 309.6, 410), "#414848");
add('rear-wheel-1-hub', cylinder(143, 139.4, 10).translate(-396.3, 309.6, 410), accent);
add('front-wheel-1', cylinder(76, 290, 12).rotate([0, 1, 0], 90).translate(344.8, 309.6, 290), "#414848");
add('front-wheel-1-hub', cylinder(83.6, 98.6, 10).translate(341, 309.6, 290), accent);
add('main-chassis', box(870, 388.8, 150, true).translate(-46.4, 0, 386.6), body);
add('engine-hood', box(510.4, 338.4, 295.2, true).translate(255.2, 0, 559.2), accent);
add('front-grille', box(38, 273.6, 180.4, true).translate(522, 0, 511.8), body);
add('rear-fender-left', box(324.8, 150, 36, true).translate(-324.8, -201.6, 723.2), accent);
add('rear-fender-right', box(324.8, 150, 36, true).translate(-324.8, 201.6, 723.2), accent);
add('cab-floor', box(371.2, 345.6, 45, true).translate(-232, 0, 530.5), body);
add('cab-glazing-front', box(24, 324.864, 319.8, true).translate(-58, 0, 717.9), accent);
add('cab-glazing-rear', box(24, 324.864, 319.8, true).translate(-406, 0, 717.9), accent);
add('cab-pillar--1', box(371.2, 30, 369, true).translate(-232, -172.8, 762.5), body);
add('cab-pillar-1', box(371.2, 30, 369, true).translate(-232, 172.8, 762.5), body);
add('cab-roof', box(445.44, 414.72, 70, true).translate(-232, 0, 879.2), accent);
add('exhaust-stack', cylinder(307.5, 24, 8).translate(208.8, -100.8, 606.8), body);
add('rear-hitch', box(190, 190, 150, true).translate(-591.6, 0, 115), accent);
add('front-weight-block', box(210, 324, 80, true).translate(580, 0, 60), body);

return p.model();
