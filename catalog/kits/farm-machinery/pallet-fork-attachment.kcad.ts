// SPDX-License-Identifier: CC0-1.0
// Quick-attach fork carriage with adjustable-looking tines and raised back guard.
meta({
  name: "pallet-fork-attachment",
  license: 'CC0-1.0',
  title: "Tractor pallet-fork attachment",
  description: "Quick-attach fork carriage with adjustable-looking tines and raised back guard. Editable scale and painted steel, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('pallet-fork-attachment');
const groundOffset = 20;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('mounting-frame', box(721.6, 100, 359.6, true).translate(0, 265.2, 239.8), paintedSteelColor);
add('crossbar', box(880, 95, 80, true).translate(0, 179.4, 424.4), paintedSteelColor);
add('fork-carriage', box(792, 65, 359.6, true).translate(0, 0, 427.8), steelColor);
add('fork-tine--1', box(82, 639.6, 60, true).translate(-228.8, -312, 50), steelColor);
add('fork-tine-1', box(82, 639.6, 60, true).translate(228.8, -312, 50), steelColor);

return p.model();
