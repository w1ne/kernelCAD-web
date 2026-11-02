// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly portable grain conveyor scene prop, modeled from scratch.
meta({
  name: "portable-grain-conveyor",
  license: 'CC0-1.0',
  title: "Portable grain conveyor",
  description: "Mobile belt conveyor with a raised delivery end, tubular frame, hopper and axle wheels. Knobs: overall scale, body color and accent color.",
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
const p = assembly('portable-grain-conveyor');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('support-base', box(1260, 1155, 55, true).translate(0, 0, 27.5), accent);
add('intake-hopper', box(892.5, 400, 360, true).translate(0, -1440, 260), body);
add('auger-lower-tube', box(150, 1800, 140, true).translate(0, -900, 631), accent);
add('auger-upper-tube', box(135, 1224, 125, true).translate(0, 576, 1613.5), body);
add('grain-discharge', box(220, 280, 230, true).translate(0, 1332, 2491), accent);
add('transport-wheel--1', cylinder(70, 140, 12).rotate([0, 1, 0], 90).translate(-35, -609, 140), "#414848");
add('transport-wheel--1-hub', cylinder(77, 47.6, 10).translate(-38.5, -609, 140), accent);
add('transport-wheel-1', cylinder(70, 140, 12).rotate([0, 1, 0], 90).translate(-35, 609, 140), "#414848");
add('transport-wheel-1-hub', cylinder(77, 47.6, 10).translate(-38.5, 609, 140), accent);
add('support-leg-0', box(36, 38, 429, true).translate(315, -540, 344.5), body);
add('support-leg-1', box(36, 38, 429, true).translate(-315, -180, 905.5), body);
add('support-leg-2', box(36, 38, 429, true).translate(315, 180, 1466.5), body);
add('support-leg-3', box(36, 38, 429, true).translate(-315, 540, 2027.5), body);
add('belt-roller-0', box(997.5, 36, 32, true).translate(0, -900, 676), accent);
add('belt-roller-1', box(997.5, 36, 32, true).translate(0, -632.571, 892.857), accent);
add('belt-roller-2', box(997.5, 36, 32, true).translate(0, -365.143, 1109.714), accent);
add('belt-roller-3', box(997.5, 36, 32, true).translate(0, -97.714, 1326.571), accent);
add('belt-roller-4', box(997.5, 36, 32, true).translate(0, 169.714, 1543.429), accent);
add('belt-roller-5', box(997.5, 36, 32, true).translate(0, 437.143, 1760.286), accent);
add('belt-roller-6', box(997.5, 36, 32, true).translate(0, 704.571, 1977.143), accent);
add('belt-roller-7', box(997.5, 36, 32, true).translate(0, 972, 2194), accent);

return p.model();
