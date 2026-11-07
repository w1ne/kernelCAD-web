// SPDX-License-Identifier: CC0-1.0
// Rear tractor hitch assembly with twin lower links, top link and implement pins.
meta({
  name: "three-point-hitch-frame",
  license: 'CC0-1.0',
  title: "Three-point hitch frame",
  description: "Rear tractor hitch assembly with twin lower links, top link and implement pins. Editable scale and painted steel, exposed steel controls with weathered and high-visibility presets.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'prop',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });

const paintedSteelColor = param('paintedSteelColor', '#397747', { label: 'Painted steel' });
const steelColor = param('steelColor', '#929b9b', { label: 'Exposed steel' });
presets({
  weathered: { paintedSteelColor: '#53694d', steelColor: '#737d7b' },
  highVisibility: { paintedSteelColor: '#db762c', steelColor: '#abb2ad' },
});
const p = assembly('three-point-hitch-frame');
const groundOffset = 60;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('mounting-frame', box(557.6, 100, 359.6, true).translate(0, 170, 239.8), paintedSteelColor);
add('crossbar', box(680, 95, 80, true).translate(0, 115, 424.4), paintedSteelColor);
add('lower-link--1', box(62, 400, 60, true).translate(-217.6, -125, 120), paintedSteelColor);
add('link-pin--1', cylinder(80, 34, 8).translate(-217.6, -275, 100), steelColor);
add('lower-link-1', box(62, 400, 60, true).translate(217.6, -125, 120), paintedSteelColor);
add('link-pin-1', cylinder(80, 34, 8).translate(217.6, -275, 100), steelColor);
add('top-link', box(90, 425, 48, true).translate(0, -75, 476.6), paintedSteelColor);
add('hitch-tower', box(231.2, 100, 620, true).translate(0, 125, 620), steelColor);

return p.model();
