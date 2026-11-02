// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly compact utility tractor scene prop, modeled from scratch.
meta({
  name: "compact-utility-tractor",
  license: 'CC0-1.0',
  title: "Compact utility tractor",
  description: "Small utility tractor with compact bonnet, open operator station and rear implement hitch. Knobs: overall scale, body color and accent color.",
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
const p = assembly('compact-utility-tractor');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('rear-wheel--1', cylinder(96, 300, 12).rotate([0, 1, 0], 90).translate(-286, -249.4, 300), "#414848");
add('rear-wheel--1-hub', cylinder(105.6, 102, 10).translate(-290.8, -249.4, 300), accent);
add('front-wheel--1', cylinder(76, 220, 12).rotate([0, 1, 0], 90).translate(242.5, -249.4, 220), "#414848");
add('front-wheel--1-hub', cylinder(83.6, 74.8, 10).translate(238.7, -249.4, 220), accent);
add('rear-wheel-1', cylinder(96, 300, 12).rotate([0, 1, 0], 90).translate(-286, 249.4, 300), "#414848");
add('rear-wheel-1-hub', cylinder(105.6, 102, 10).translate(-290.8, 249.4, 300), accent);
add('front-wheel-1', cylinder(76, 220, 12).rotate([0, 1, 0], 90).translate(242.5, 249.4, 220), "#414848");
add('front-wheel-1-hub', cylinder(83.6, 74.8, 10).translate(238.7, 249.4, 220), accent);
add('main-chassis', box(637.5, 313.2, 150, true).translate(-34, 0, 303), body);
add('engine-hood', box(374, 272.6, 216, true).translate(187, 0, 436), accent);
add('front-grille', box(38, 220.4, 132, true).translate(382.5, 0, 404), body);
add('rear-fender-left', box(238, 150, 36, true).translate(-238, -162.4, 534), accent);
add('rear-fender-right', box(238, 150, 36, true).translate(-238, 162.4, 534), accent);
add('operator-platform', box(263.5, 313.2, 32, true).translate(-170, 0, 484), accent);
add('roll-bar-left', box(34, 34, 360, true).translate(-187, -127.6, 543), body);
add('roll-bar-right', box(34, 34, 360, true).translate(-187, 127.6, 543), body);
add('exhaust-stack', cylinder(225, 24, 8).translate(153, -81.2, 444), body);
add('rear-hitch', box(190, 190, 150, true).translate(-433.5, 0, 115), accent);
add('front-weight-block', box(210, 261, 80, true).translate(425, 0, 60), body);

return p.model();
