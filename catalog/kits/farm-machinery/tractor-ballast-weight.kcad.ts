// SPDX-License-Identifier: CC0-1.0
// Rear-mounted counterweight block with mounting frame and raised lifting loop.
meta({
  name: "tractor-ballast-weight",
  license: 'CC0-1.0',
  title: "Tractor ballast weight",
  description: "Rear-mounted counterweight block with mounting frame and raised lifting loop. Editable scale and painted steel, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('tractor-ballast-weight');
const groundOffset = 60;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('mounting-frame', box(508.4, 100, 266.8, true).translate(0, 142.8, 193.4), paintedSteelColor);
add('crossbar', box(620, 95, 80, true).translate(0, 96.6, 325.2), paintedSteelColor);
add('weight-block', box(620, 319.2, 331.2, true).translate(0, 0, 245.6), steelColor);
add('mounting-lugs', box(310, 110, 276, true).translate(0, 201.6, 423.2), paintedSteelColor);
add('lift-loop', box(198.4, 75, 46, true).translate(0, 0, 400.2), paintedSteelColor);

return p.model();
