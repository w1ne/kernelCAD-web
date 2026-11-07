// SPDX-License-Identifier: CC0-1.0
// Portable irrigation cart with hose reel, large wheels, guide frame and elevated sprinkler head.
meta({
  name: "traveling-sprinkler-cart",
  license: 'CC0-1.0',
  title: "Traveling sprinkler cart",
  description: "Portable irrigation cart with hose reel, large wheels, guide frame and elevated sprinkler head. Editable scale and painted steel, rubber, exposed steel controls with weathered and high-visibility presets.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'structure',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });

const paintedSteelColor = param('paintedSteelColor', '#397747', { label: 'Painted steel' });
const rubberColor = param('rubberColor', '#292e2d', { label: 'Rubber' });
const steelColor = param('steelColor', '#929b9b', { label: 'Exposed steel' });
presets({
  weathered: { paintedSteelColor: '#53694d', rubberColor: '#252927', steelColor: '#737d7b' },
  highVisibility: { paintedSteelColor: '#db762c', rubberColor: '#292e2d', steelColor: '#abb2ad' },
});
const p = assembly('traveling-sprinkler-cart');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('cart-frame', box(950, 937.5, 80, true).translate(0, 0, 130), paintedSteelColor);
add('cart-wheel--1', cylinder(88, 180, 12).rotate([0, 1, 0], 90).translate(-44, -525, 180), rubberColor);
add('cart-wheel--1-hub', cylinder(96.8, 61.2, 10).translate(-48.4, -525, 180), steelColor);
add('cart-wheel-1', cylinder(88, 180, 12).rotate([0, 1, 0], 90).translate(-44, 525, 180), rubberColor);
add('cart-wheel-1-hub', cylinder(96.8, 61.2, 10).translate(-48.4, 525, 180), steelColor);
add('hose-reel', box(646, 90, 810, true).translate(0, 0, 1230), rubberColor);
add('sprinkler-mast', cylinder(1020, 28, 8).translate(0, 450, 220), paintedSteelColor);
add('sprinkler-arm', box(320, 25, 28, true).translate(0, 450, 1349), paintedSteelColor);

return p.model();
