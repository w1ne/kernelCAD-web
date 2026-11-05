// SPDX-License-Identifier: CC0-1.0
// Tow-behind crop sprayer with tank, folding boom sections and wide support wheels.
meta({
  name: "trailed-field-sprayer",
  license: 'CC0-1.0',
  title: "Trailed field sprayer",
  description: "Tow-behind crop sprayer with tank, folding boom sections and wide support wheels. Editable scale and painted steel, rubber, exposed steel controls with weathered and high-visibility presets.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'prop',
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
const slopedPrism = (width:number, depth:number, height:number) => {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const inset = width * 0.16;
  return path().moveTo(-halfWidth, -halfHeight)
    .lineTo(halfWidth, -halfHeight)
    .lineTo(halfWidth - inset, halfHeight)
    .lineTo(-halfWidth + inset, halfHeight)
    .close().extrude(depth).rotate([1, 0, 0], 90).translate(0, depth / 2, 0);
};
const p = assembly('trailed-field-sprayer');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('sprayer-chassis', box(1750, 1450, 90, true).translate(0, 0, 295), paintedSteelColor);
add('sprayer-tank', slopedPrism(1350, 783, 1007).translate(0, 0, 1510.5), paintedSteelColor);
add('sprayer-wheel--1', cylinder(94, 170, 12).rotate([0, 1, 0], 90).translate(-47, -1075, 170), rubberColor);
add('sprayer-wheel--1-hub', cylinder(103.4, 57.8, 10).translate(-51.7, -1075, 170), steelColor);
add('boom-wing--1', box(1462, 68, 55, true).translate(-1505, -217.5, 1623.5), paintedSteelColor);
add('nozzle--1-0', cylinder(45, 12, 6).translate(-860, -217.5, 1482), steelColor);
add('nozzle--1-1', cylinder(45, 12, 6).translate(-1032, -217.5, 1482), steelColor);
add('nozzle--1-2', cylinder(45, 12, 6).translate(-1204, -217.5, 1482), steelColor);
add('nozzle--1-3', cylinder(45, 12, 6).translate(-1376, -217.5, 1482), steelColor);
add('nozzle--1-4', cylinder(45, 12, 6).translate(-1548, -217.5, 1482), steelColor);
add('nozzle--1-5', cylinder(45, 12, 6).translate(-1720, -217.5, 1482), steelColor);
add('nozzle--1-6', cylinder(45, 12, 6).translate(-1892, -217.5, 1482), steelColor);
add('sprayer-wheel-1', cylinder(94, 170, 12).rotate([0, 1, 0], 90).translate(-47, 1075, 170), rubberColor);
add('sprayer-wheel-1-hub', cylinder(103.4, 57.8, 10).translate(-51.7, 1075, 170), steelColor);
add('boom-wing-1', box(1462, 68, 55, true).translate(1505, -217.5, 1623.5), paintedSteelColor);
add('nozzle-1-0', cylinder(45, 12, 6).translate(860, -217.5, 1482), steelColor);
add('nozzle-1-1', cylinder(45, 12, 6).translate(1032, -217.5, 1482), steelColor);
add('nozzle-1-2', cylinder(45, 12, 6).translate(1204, -217.5, 1482), steelColor);
add('nozzle-1-3', cylinder(45, 12, 6).translate(1376, -217.5, 1482), steelColor);
add('nozzle-1-4', cylinder(45, 12, 6).translate(1548, -217.5, 1482), steelColor);
add('nozzle-1-5', cylinder(45, 12, 6).translate(1720, -217.5, 1482), steelColor);
add('nozzle-1-6', cylinder(45, 12, 6).translate(1892, -217.5, 1482), steelColor);
add('center-boom', box(1806, 68, 55, true).translate(0, -217.5, 1623.5), paintedSteelColor);
add('drawbar', box(94, 754, 62, true).translate(0, 754, 156), paintedSteelColor);

return p.model();
