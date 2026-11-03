// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly three-point hitch frame scene prop, modeled from scratch.
meta({
  name: "three-point-hitch-frame",
  license: 'CC0-1.0',
  title: "Three-point hitch frame",
  description: "Rear tractor hitch assembly with twin lower links, top link and implement pins. Knobs: overall scale, body color and accent color.",
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
const p = assembly('three-point-hitch-frame');
const groundOffset = 60;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('mounting-frame', box(557.6, 100, 359.6, true).translate(0, 170, 239.8), body);
add('crossbar', box(680, 95, 80, true).translate(0, 115, 424.4), accent);
add('lower-link--1', box(62, 400, 60, true).translate(-217.6, -125, 120), accent);
add('link-pin--1', cylinder(80, 34, 8).translate(-217.6, -275, 100), body);
add('lower-link-1', box(62, 400, 60, true).translate(217.6, -125, 120), accent);
add('link-pin-1', cylinder(80, 34, 8).translate(217.6, -275, 100), body);
add('top-link', box(90, 425, 48, true).translate(0, -75, 476.6), body);
add('hitch-tower', box(231.2, 100, 620, true).translate(0, 125, 620), accent);

return p.model();
