// SPDX-License-Identifier: CC0-1.0
// Three-point rotary mower deck with paired blade housings, hitch frame and caster wheels.
meta({
  name: "rotary-mower-implement",
  license: 'CC0-1.0',
  title: "Rotary mower implement",
  description: "Three-point rotary mower deck with paired blade housings, hitch frame and caster wheels. Editable scale and painted steel, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('rotary-mower-implement');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('mower-deck', box(1271, 775, 220.8, true).translate(0, 0, 268.8), paintedSteelColor);
add('deck-lip', box(1333, 42, 38, true).translate(0, -375, 163), paintedSteelColor);
add('blade-housing-0', cylinder(28, 155, 10).translate(-434, 0, 20), steelColor);
add('blade-spindle-0', box(45, 45, 80, true).translate(-434, 0, 88), steelColor);
add('blade-housing-1', cylinder(28, 155, 10).translate(434, 0, 20), steelColor);
add('blade-spindle-1', box(45, 45, 80, true).translate(434, 0, 88), steelColor);
add('deck-wheel--1', cylinder(54, 90, 12).rotate([0, 1, 0], 90).translate(-585, 275, 90), paintedSteelColor);
add('deck-wheel--1-hub', cylinder(59.4, 30.6, 10).translate(-587.7, 275, 90), steelColor);
add('deck-wheel-1', cylinder(54, 90, 12).rotate([0, 1, 0], 90).translate(531, 275, 90), paintedSteelColor);
add('deck-wheel-1-hub', cylinder(59.4, 30.6, 10).translate(528.3, 275, 90), steelColor);
add('three-point-tower', box(372, 60, 288, true).translate(0, 625, 408), paintedSteelColor);

return p.model();
