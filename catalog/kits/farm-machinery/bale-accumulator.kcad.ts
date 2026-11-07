// SPDX-License-Identifier: CC0-1.0
// Rear bale accumulator with twin collection decks, guide rails and discharge gate.
meta({
  name: "bale-accumulator",
  license: 'CC0-1.0',
  title: "Bale accumulator",
  description: "Rear bale accumulator with twin collection decks, guide rails and discharge gate. Editable scale and painted steel, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('bale-accumulator');
const groundOffset = 130;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('hay-frame', box(1596, 85, 78, true).translate(0, 168, 522), paintedSteelColor);
add('drawbar', box(95, 1050, 56, true).translate(0, 903, 603), paintedSteelColor);
add('collection-deck-0', box(1558, 798, 36, true).translate(0, -462, 148), paintedSteelColor);
add('collection-deck-1', box(1558, 798, 36, true).translate(0, 420, 428), paintedSteelColor);
add('guide-rail--1', box(42, 1806, 782, true).translate(-798, 0, 908.5), steelColor);
add('guide-rail-1', box(42, 1806, 782, true).translate(798, 0, 908.5), steelColor);
add('discharge-gate', box(1330, 40, 240, true).translate(0, -945, 752.5), steelColor);

return p.model();
