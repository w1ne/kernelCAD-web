// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly trailed field sprayer scene prop, modeled from scratch.
meta({
  name: "trailed-field-sprayer",
  license: 'CC0-1.0',
  title: "Trailed field sprayer",
  description: "Tow-behind crop sprayer with tank, folding boom sections and wide support wheels. Knobs: overall scale, body color and accent color.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'prop',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#5d7f75', { label: 'Body color' });
const accent = param('accent', '#c67b39', { label: 'Accent color' });
const p = assembly('trailed-field-sprayer');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('sprayer-chassis', box(1750, 1450, 90, true).translate(0, 0, 295), body);
add('sprayer-tank', box(1350, 783, 1007, true).translate(0, 0, 1510.5), accent);
add('sprayer-wheel--1', cylinder(94, 170, 12).rotate([0, 1, 0], 90).translate(-47, -1075, 170), "#414848");
add('sprayer-wheel--1-hub', cylinder(103.4, 57.8, 10).translate(-51.7, -1075, 170), accent);
add('boom-wing--1', box(1462, 68, 55, true).translate(-1505, -217.5, 1623.5), body);
add('nozzle--1-0', cylinder(45, 12, 6).translate(-860, -217.5, 1482), accent);
add('nozzle--1-1', cylinder(45, 12, 6).translate(-1032, -217.5, 1482), accent);
add('nozzle--1-2', cylinder(45, 12, 6).translate(-1204, -217.5, 1482), accent);
add('nozzle--1-3', cylinder(45, 12, 6).translate(-1376, -217.5, 1482), accent);
add('nozzle--1-4', cylinder(45, 12, 6).translate(-1548, -217.5, 1482), accent);
add('nozzle--1-5', cylinder(45, 12, 6).translate(-1720, -217.5, 1482), accent);
add('nozzle--1-6', cylinder(45, 12, 6).translate(-1892, -217.5, 1482), accent);
add('sprayer-wheel-1', cylinder(94, 170, 12).rotate([0, 1, 0], 90).translate(-47, 1075, 170), "#414848");
add('sprayer-wheel-1-hub', cylinder(103.4, 57.8, 10).translate(-51.7, 1075, 170), accent);
add('boom-wing-1', box(1462, 68, 55, true).translate(1505, -217.5, 1623.5), body);
add('nozzle-1-0', cylinder(45, 12, 6).translate(860, -217.5, 1482), accent);
add('nozzle-1-1', cylinder(45, 12, 6).translate(1032, -217.5, 1482), accent);
add('nozzle-1-2', cylinder(45, 12, 6).translate(1204, -217.5, 1482), accent);
add('nozzle-1-3', cylinder(45, 12, 6).translate(1376, -217.5, 1482), accent);
add('nozzle-1-4', cylinder(45, 12, 6).translate(1548, -217.5, 1482), accent);
add('nozzle-1-5', cylinder(45, 12, 6).translate(1720, -217.5, 1482), accent);
add('nozzle-1-6', cylinder(45, 12, 6).translate(1892, -217.5, 1482), accent);
add('center-boom', box(1806, 68, 55, true).translate(0, -217.5, 1623.5), accent);
add('drawbar', box(94, 754, 62, true).translate(0, 754, 156), body);

return p.model();
