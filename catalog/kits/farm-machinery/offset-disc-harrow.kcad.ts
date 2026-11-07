// SPDX-License-Identifier: CC0-1.0
// Offset disc harrow with paired gangs, frame beam and transport wheels.
meta({
  name: "offset-disc-harrow",
  license: 'CC0-1.0',
  title: "Offset disc harrow",
  description: "Offset disc harrow with paired gangs, frame beam and transport wheels. Editable scale and painted steel, rubber, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('offset-disc-harrow');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('main-toolbar', box(1850, 110, 94, true).translate(0, 120, 414.2), paintedSteelColor);
add('drawbar', box(135, 560, 70, true).translate(0, 430, 456.6), paintedSteelColor);
add('transport-wheel--1', cylinder(85, 120, 12).rotate([0, 1, 0], 90).translate(642, -230, 120), rubberColor);
add('transport-wheel--1-hub', cylinder(93.5, 40.8, 10).translate(637.75, -230, 120), steelColor);
add('transport-wheel-1', cylinder(85, 120, 12).rotate([0, 1, 0], 90).translate(642, 230, 120), rubberColor);
add('transport-wheel-1-hub', cylinder(93.5, 40.8, 10).translate(637.75, 230, 120), steelColor);
add('disc--1-0', cylinder(30, 142, 10).translate(-703, -220, 40), steelColor);
add('disc-scraper--1-0', box(16, 180, 220, true).translate(-703, -220, 280), steelColor);
add('disc--1-1', cylinder(30, 142, 10).translate(-234.333, -220, 40), steelColor);
add('disc-scraper--1-1', box(16, 180, 220, true).translate(-234.333, -220, 280), steelColor);
add('disc--1-2', cylinder(30, 142, 10).translate(234.333, -220, 40), steelColor);
add('disc-scraper--1-2', box(16, 180, 220, true).translate(234.333, -220, 280), steelColor);
add('disc--1-3', cylinder(30, 142, 10).translate(703, -220, 40), steelColor);
add('disc-scraper--1-3', box(16, 180, 220, true).translate(703, -220, 280), steelColor);
add('disc-1-0', cylinder(30, 142, 10).translate(-703, 220, 40), steelColor);
add('disc-scraper-1-0', box(16, 180, 220, true).translate(-703, 220, 280), steelColor);
add('disc-1-1', cylinder(30, 142, 10).translate(-234.333, 220, 40), steelColor);
add('disc-scraper-1-1', box(16, 180, 220, true).translate(-234.333, 220, 280), steelColor);
add('disc-1-2', cylinder(30, 142, 10).translate(234.333, 220, 40), steelColor);
add('disc-scraper-1-2', box(16, 180, 220, true).translate(234.333, 220, 280), steelColor);
add('disc-1-3', cylinder(30, 142, 10).translate(703, 220, 40), steelColor);
add('disc-scraper-1-3', box(16, 180, 220, true).translate(703, 220, 280), steelColor);

return p.model();
