// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly rotary mower implement scene prop, modeled from scratch.
meta({
  name: "rotary-mower-implement",
  license: 'CC0-1.0',
  title: "Rotary mower implement",
  description: "Three-point rotary mower deck with paired blade housings, hitch frame and caster wheels. Knobs: overall scale, body color and accent color.",
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
const p = assembly('rotary-mower-implement');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('mower-deck', box(1271, 775, 220.8, true).translate(0, 0, 268.8), body);
add('deck-lip', box(1333, 42, 38, true).translate(0, -375, 163), accent);
add('blade-housing-0', cylinder(28, 155, 10).translate(-434, 0, 20), accent);
add('blade-spindle-0', box(45, 45, 80, true).translate(-434, 0, 88), body);
add('blade-housing-1', cylinder(28, 155, 10).translate(434, 0, 20), accent);
add('blade-spindle-1', box(45, 45, 80, true).translate(434, 0, 88), body);
add('deck-wheel--1', cylinder(54, 90, 12).rotate([0, 1, 0], 90).translate(-585, 275, 90), "#414848");
add('deck-wheel--1-hub', cylinder(59.4, 30.6, 10).translate(-587.7, 275, 90), accent);
add('deck-wheel-1', cylinder(54, 90, 12).rotate([0, 1, 0], 90).translate(531, 275, 90), "#414848");
add('deck-wheel-1-hub', cylinder(59.4, 30.6, 10).translate(528.3, 275, 90), accent);
add('three-point-tower', box(372, 60, 288, true).translate(0, 625, 408), accent);

return p.model();
