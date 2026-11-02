// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly seed drill scene prop, modeled from scratch.
meta({
  name: "seed-drill",
  license: 'CC0-1.0',
  title: "Seed drill",
  description: "Compact seed drill with covered hoppers, metering row units and press wheels. Knobs: overall scale, body color and accent color.",
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
const p = assembly('seed-drill');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('planter-frame', box(1900, 378, 90, true).translate(0, 0, 528), accent);
add('seed-hopper', box(1444, 630, 504, true).translate(0, 45, 1008), body);
add('side-hopper--1', box(418, 558, 462, true).translate(-475, 36, 987), accent);
add('side-hopper-1', box(418, 558, 462, true).translate(475, 36, 987), accent);
add('row-unit-0', box(70, 88, 451.5, true).translate(-817, -144, 477.75), body);
add('press-wheel-0', cylinder(40, 58, 8).translate(-817, -288, 30), accent);
add('seed-tube-0', box(22, 30, 378, true).translate(-817, 0, 451.5), accent);
add('row-unit-1', box(70, 88, 451.5, true).translate(-612.75, -144, 477.75), body);
add('press-wheel-1', cylinder(40, 58, 8).translate(-612.75, -288, 30), accent);
add('seed-tube-1', box(22, 30, 378, true).translate(-612.75, 0, 451.5), accent);
add('row-unit-2', box(70, 88, 451.5, true).translate(-408.5, -144, 477.75), body);
add('press-wheel-2', cylinder(40, 58, 8).translate(-408.5, -288, 30), accent);
add('seed-tube-2', box(22, 30, 378, true).translate(-408.5, 0, 451.5), accent);
add('row-unit-3', box(70, 88, 451.5, true).translate(-204.25, -144, 477.75), body);
add('press-wheel-3', cylinder(40, 58, 8).translate(-204.25, -288, 30), accent);
add('seed-tube-3', box(22, 30, 378, true).translate(-204.25, 0, 451.5), accent);
add('row-unit-4', box(70, 88, 451.5, true).translate(0, -144, 477.75), body);
add('press-wheel-4', cylinder(40, 58, 8).translate(0, -288, 30), accent);
add('seed-tube-4', box(22, 30, 378, true).translate(0, 0, 451.5), accent);
add('row-unit-5', box(70, 88, 451.5, true).translate(204.25, -144, 477.75), body);
add('press-wheel-5', cylinder(40, 58, 8).translate(204.25, -288, 30), accent);
add('seed-tube-5', box(22, 30, 378, true).translate(204.25, 0, 451.5), accent);
add('row-unit-6', box(70, 88, 451.5, true).translate(408.5, -144, 477.75), body);
add('press-wheel-6', cylinder(40, 58, 8).translate(408.5, -288, 30), accent);
add('seed-tube-6', box(22, 30, 378, true).translate(408.5, 0, 451.5), accent);
add('row-unit-7', box(70, 88, 451.5, true).translate(612.75, -144, 477.75), body);
add('press-wheel-7', cylinder(40, 58, 8).translate(612.75, -288, 30), accent);
add('seed-tube-7', box(22, 30, 378, true).translate(612.75, 0, 451.5), accent);
add('row-unit-8', box(70, 88, 451.5, true).translate(817, -144, 477.75), body);
add('press-wheel-8', cylinder(40, 58, 8).translate(817, -288, 30), accent);
add('seed-tube-8', box(22, 30, 378, true).translate(817, 0, 451.5), accent);
add('transport-wheel--1', cylinder(90, 130, 12).rotate([0, 1, 0], 90).translate(-729, 198, 130), "#414848");
add('transport-wheel--1-hub', cylinder(99, 44.2, 10).translate(-733.5, 198, 130), accent);
add('transport-wheel-1', cylinder(90, 130, 12).rotate([0, 1, 0], 90).translate(639, 198, 130), "#414848");
add('transport-wheel-1-hub', cylinder(99, 44.2, 10).translate(634.5, 198, 130), accent);
add('tongue', box(110, 504, 65, true).translate(0, 468, 494.5), body);

return p.model();
