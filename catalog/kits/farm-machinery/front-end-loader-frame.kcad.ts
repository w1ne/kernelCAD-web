// SPDX-License-Identifier: CC0-1.0
// Tractor-mounted loader arms with paired lift links, pivot plates and quick-attach carrier.
meta({
  name: "front-end-loader-frame",
  license: 'CC0-1.0',
  title: "Front-end loader frame",
  description: "Tractor-mounted loader arms with paired lift links, pivot plates and quick-attach carrier. Editable scale and painted steel, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('front-end-loader-frame');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('mounting-frame', box(639.6, 100, 609, true).translate(0, 142.8, 364.5), paintedSteelColor);
add('crossbar', box(780, 95, 80, true).translate(0, 96.6, 691), paintedSteelColor);
add('loader-upright--1', box(85, 110, 777, true).translate(-50.4, -296.4, 388.5), paintedSteelColor);
add('loader-arm--1', box(588, 105, 90, true).translate(63, -296.4, 622.5), paintedSteelColor);
add('pivot--1', cylinder(74, 58, 10).translate(176.4, -296.4, 546), steelColor);
add('loader-upright-1', box(85, 110, 777, true).translate(-50.4, 296.4, 388.5), paintedSteelColor);
add('loader-arm-1', box(588, 105, 90, true).translate(63, 296.4, 622.5), paintedSteelColor);
add('pivot-1', cylinder(74, 58, 10).translate(176.4, 296.4, 546), steelColor);
add('quick-attach', box(120, 507, 190, true).translate(378, 0, 473), paintedSteelColor);

return p.model();
