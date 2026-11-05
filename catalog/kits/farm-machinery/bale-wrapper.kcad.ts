// SPDX-License-Identifier: CC0-1.0
// Trailed bale wrapper with circular cradle rollers, film mast and support wheels.
meta({
  name: "bale-wrapper",
  license: 'CC0-1.0',
  title: "Bale wrapper",
  description: "Trailed bale wrapper with circular cradle rollers, film mast and support wheels. Editable scale and painted steel, exposed steel, polymer controls with weathered and high-visibility presets.",
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
const polymerColor = param('polymerColor', '#c4c4ad', { label: 'Polymer' });
presets({
  weathered: { paintedSteelColor: '#53694d', steelColor: '#737d7b', polymerColor: '#aaa995' },
  highVisibility: { paintedSteelColor: '#db762c', steelColor: '#abb2ad', polymerColor: '#e2dfc2' },
});
const p = assembly('bale-wrapper');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('hay-frame', box(991.2, 85, 78, true).translate(0, 140, 501), paintedSteelColor);
add('drawbar', box(95, 875, 56, true).translate(0, 752.5, 578), paintedSteelColor);
add('roller-0', cylinder(638, 95, 10).translate(-259.6, 0, 70), steelColor);
add('roller-1', cylinder(638, 95, 10).translate(259.6, 0, 70), steelColor);
add('film-mast', box(44, 44, 1100, true).translate(472, 0, 550), paintedSteelColor);
add('film-roll', box(95, 180, 260, true).translate(472, 0, 834), polymerColor);

return p.model();
