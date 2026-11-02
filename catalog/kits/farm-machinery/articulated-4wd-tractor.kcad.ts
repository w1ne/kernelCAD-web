// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly articulated four-wheel-drive tractor scene prop, modeled from scratch.
meta({
  name: "articulated-4wd-tractor",
  license: 'CC0-1.0',
  title: "Articulated four-wheel-drive tractor",
  description: "Large articulated field tractor with equal-size tires, split chassis and high cab. Knobs: overall scale, body color and accent color.",
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
const p = assembly('articulated-4wd-tractor');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('rear-wheel--1', cylinder(130, 490, 12).rotate([0, 1, 0], 90).translate(-479.4, -369.8, 490), "#414848");
add('rear-wheel--1-hub', cylinder(143, 166.6, 10).translate(-485.9, -369.8, 490), accent);
add('front-wheel--1', cylinder(100, 490, 12).rotate([0, 1, 0], 90).translate(438.4, -369.8, 490), "#414848");
add('front-wheel--1-hub', cylinder(110, 166.6, 10).translate(433.4, -369.8, 490), accent);
add('rear-wheel-1', cylinder(130, 490, 12).rotate([0, 1, 0], 90).translate(-479.4, 369.8, 490), "#414848");
add('rear-wheel-1-hub', cylinder(143, 166.6, 10).translate(-485.9, 369.8, 490), accent);
add('front-wheel-1', cylinder(100, 490, 12).rotate([0, 1, 0], 90).translate(438.4, 369.8, 490), "#414848");
add('front-wheel-1-hub', cylinder(110, 166.6, 10).translate(433.4, 369.8, 490), accent);
add('main-chassis', box(1110, 464.4, 150, true).translate(-59.2, 0, 447.4), body);
add('engine-hood', box(651.2, 404.2, 352.8, true).translate(325.6, 0, 648.8), accent);
add('front-grille', box(38, 326.8, 215.6, true).translate(666, 0, 590.2), body);
add('rear-fender-left', box(414.4, 150, 36, true).translate(-414.4, -240.8, 860.8), accent);
add('rear-fender-right', box(414.4, 150, 36, true).translate(-414.4, 240.8, 860.8), accent);
add('cab-floor', box(473.6, 412.8, 45, true).translate(-296, 0, 594.5), body);
add('cab-glazing-front', box(24, 388.032, 382.2, true).translate(-74, 0, 813.1), accent);
add('cab-glazing-rear', box(24, 388.032, 382.2, true).translate(-518, 0, 813.1), accent);
add('cab-pillar--1', box(473.6, 30, 441, true).translate(-296, -206.4, 862.5), body);
add('cab-pillar-1', box(473.6, 30, 441, true).translate(-296, 206.4, 862.5), body);
add('cab-roof', box(568.32, 495.36, 70, true).translate(-296, 0, 1008.8), accent);
add('exhaust-stack', cylinder(367.5, 24, 8).translate(266.4, -120.4, 725.2), body);
add('rear-hitch', box(190, 190, 150, true).translate(-754.8, 0, 115), accent);
add('front-weight-block', box(210, 387, 80, true).translate(740, 0, 60), body);
add('articulation-joint', box(160, 533.2, 130, true).translate(0, 0, 497.4), accent);
add('rear-frame', box(503.2, 533.2, 145, true).translate(-547.6, 0, 444.9), body);

return p.model();
