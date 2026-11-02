// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly flail mower implement scene prop, modeled from scratch.
meta({
  name: "flail-mower-implement",
  license: 'CC0-1.0',
  title: "Flail mower implement",
  description: "Heavy rear flail mower with enclosed cutter housing, roller and rear service shield. Knobs: overall scale, body color and accent color.",
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
const p = assembly('flail-mower-implement');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('mower-deck', box(1230, 651, 285.2, true).translate(0, 0, 347.2), body);
add('deck-lip', box(1290, 42, 38, true).translate(0, -315, 205), accent);
add('blade-housing-0', cylinder(28, 155, 10).translate(-420, 0, 20), accent);
add('blade-spindle-0', box(45, 45, 80, true).translate(-420, 0, 88), body);
add('deck-wheel--1', cylinder(54, 90, 12).rotate([0, 1, 0], 90).translate(-567, 231, 90), "#414848");
add('deck-wheel--1-hub', cylinder(59.4, 30.6, 10).translate(-569.7, 231, 90), accent);
add('deck-wheel-1', cylinder(54, 90, 12).rotate([0, 1, 0], 90).translate(513, 231, 90), "#414848");
add('deck-wheel-1-hub', cylinder(59.4, 30.6, 10).translate(510.3, 231, 90), accent);
add('three-point-tower', box(360, 60, 372, true).translate(0, 525, 527), accent);
add('rear-roller', cylinder(60, 70, 10).translate(0, 451.5, 45), body);
add('rear-shield', box(1290, 32, 120, true).translate(0, 504, 456.8), accent);

return p.model();
