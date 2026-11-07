// SPDX-License-Identifier: CC0-1.0
// Protected power-take-off driveline cover with telescoping sections and end shields.
meta({
  name: "pto-shaft-guard",
  license: 'CC0-1.0',
  title: "PTO shaft guard",
  description: "Protected power-take-off driveline cover with telescoping sections and end shields. Editable scale and painted steel, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('pto-shaft-guard');
const groundOffset = 45;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('mounting-frame', box(705.2, 100, 121.8, true).translate(0, 61.2, 120.9), paintedSteelColor);
add('crossbar', box(860, 95, 80, true).translate(0, 41.4, 170.2), paintedSteelColor);
add('shaft-cover', cylinder(117.6, 120.4, 10).translate(0, 0, 60), steelColor);
add('guard-support', box(619.2, 144, 34, true).translate(0, 0, 62), steelColor);
add('end-shield-a', box(215, 32, 121.8, true).translate(0, -79.2, 165.9), paintedSteelColor);
add('end-shield-b', box(215, 32, 121.8, true).translate(0, 79.2, 165.9), paintedSteelColor);

return p.model();
