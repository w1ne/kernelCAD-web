// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly precision planter scene prop, modeled from scratch.
meta({
  name: "precision-planter",
  license: 'CC0-1.0',
  title: "Precision planter",
  description: "Precision planter with individual seed boxes, parallel-link row units and gauge wheels. Knobs: overall scale, body color and accent color.",
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
const p = assembly('precision-planter');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('planter-frame', box(2000, 441, 90, true).translate(0, 0, 643), accent);
add('seed-hopper', box(1520, 735, 624, true).translate(0, 52.5, 1248), body);
add('side-hopper--1', box(440, 651, 572, true).translate(-500, 42, 1222), accent);
add('side-hopper-1', box(440, 651, 572, true).translate(500, 42, 1222), accent);
add('seed-box-0', box(165, 180, 210, true).translate(-840, 84, 911), accent);
add('seed-box-1', box(165, 180, 210, true).translate(-504, 84, 911), accent);
add('seed-box-2', box(165, 180, 210, true).translate(-168, 84, 911), accent);
add('seed-box-3', box(165, 180, 210, true).translate(168, 84, 911), accent);
add('seed-box-4', box(165, 180, 210, true).translate(504, 84, 911), accent);
add('seed-box-5', box(165, 180, 210, true).translate(840, 84, 911), accent);
add('row-unit-0', box(70, 88, 559, true).translate(-860, -168, 591.5), body);
add('press-wheel-0', cylinder(40, 58, 8).translate(-860, -336, 30), accent);
add('seed-tube-0', box(22, 30, 468, true).translate(-860, 0, 559), accent);
add('row-unit-1', box(70, 88, 559, true).translate(-516, -168, 591.5), body);
add('press-wheel-1', cylinder(40, 58, 8).translate(-516, -336, 30), accent);
add('seed-tube-1', box(22, 30, 468, true).translate(-516, 0, 559), accent);
add('row-unit-2', box(70, 88, 559, true).translate(-172, -168, 591.5), body);
add('press-wheel-2', cylinder(40, 58, 8).translate(-172, -336, 30), accent);
add('seed-tube-2', box(22, 30, 468, true).translate(-172, 0, 559), accent);
add('row-unit-3', box(70, 88, 559, true).translate(172, -168, 591.5), body);
add('press-wheel-3', cylinder(40, 58, 8).translate(172, -336, 30), accent);
add('seed-tube-3', box(22, 30, 468, true).translate(172, 0, 559), accent);
add('row-unit-4', box(70, 88, 559, true).translate(516, -168, 591.5), body);
add('press-wheel-4', cylinder(40, 58, 8).translate(516, -336, 30), accent);
add('seed-tube-4', box(22, 30, 468, true).translate(516, 0, 559), accent);
add('row-unit-5', box(70, 88, 559, true).translate(860, -168, 591.5), body);
add('press-wheel-5', cylinder(40, 58, 8).translate(860, -336, 30), accent);
add('seed-tube-5', box(22, 30, 468, true).translate(860, 0, 559), accent);
add('transport-wheel--1', cylinder(90, 130, 12).rotate([0, 1, 0], 90).translate(-765, 231, 130), "#414848");
add('transport-wheel--1-hub', cylinder(99, 44.2, 10).translate(-769.5, 231, 130), accent);
add('transport-wheel-1', cylinder(90, 130, 12).rotate([0, 1, 0], 90).translate(675, 231, 130), "#414848");
add('transport-wheel-1-hub', cylinder(99, 44.2, 10).translate(670.5, 231, 130), accent);
add('tongue', box(110, 588, 65, true).translate(0, 546, 604.5), body);

return p.model();
