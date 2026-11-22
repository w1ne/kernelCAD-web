// SPDX-License-Identifier: CC0-1.0
// Heavy rear flail mower with enclosed cutter housing, roller and rear service shield.
meta({
  name: "flail-mower-implement",
  license: 'CC0-1.0',
  title: "Flail mower implement",
  description: "Heavy rear flail mower with enclosed cutter housing, roller and rear service shield. Editable scale and painted steel, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('flail-mower-implement');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('mower-deck', box(1230, 651, 285.2, true).translate(0, 0, 347.2), paintedSteelColor);
add('deck-lip', box(1290, 42, 38, true).translate(0, -315, 205), paintedSteelColor);
add('blade-housing-0', cylinder(28, 155, 10).translate(-420, 0, 20), steelColor);
add('blade-spindle-0', box(45, 45, 80, true).translate(-420, 0, 88), steelColor);
add('deck-wheel--1', cylinder(54, 90, 12).rotate([0, 1, 0], 90).translate(-567, 231, 90), paintedSteelColor);
add('deck-wheel--1-hub', cylinder(59.4, 30.6, 10).translate(-569.7, 231, 90), steelColor);
add('deck-wheel-1', cylinder(54, 90, 12).rotate([0, 1, 0], 90).translate(513, 231, 90), paintedSteelColor);
add('deck-wheel-1-hub', cylinder(59.4, 30.6, 10).translate(510.3, 231, 90), steelColor);
add('three-point-tower', box(360, 60, 372, true).translate(0, 525, 527), paintedSteelColor);
add('rear-roller', cylinder(60, 70, 10).translate(0, 451.5, 45), steelColor);
add('rear-shield', box(1290, 32, 120, true).translate(0, 504, 456.8), paintedSteelColor);

return p.model();
