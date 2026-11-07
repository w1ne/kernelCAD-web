// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly field cultivator scene prop, modeled from scratch.
meta({
  name: "field-cultivator",
  license: 'CC0-1.0',
  title: "Field cultivator",
  description: "Trailing field cultivator with a three-section toolbar, rows of tines and support wheels. Knobs: overall scale, body color and accent color.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'structure',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#5d7f75', { label: 'Body color' });
const accent = param('accent', '#c67b39', { label: 'Accent color' });
const p = assembly('field-cultivator');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('main-toolbar', box(2300, 110, 94, true).translate(0, 120, 408.8), accent);
add('drawbar', box(135, 560, 70, true).translate(0, 430, 450.4), body);
add('transport-wheel--1', cylinder(85, 120, 12).rotate([0, 1, 0], 90).translate(808.5, -230, 120), "#414848");
add('transport-wheel--1-hub', cylinder(93.5, 40.8, 10).translate(804.25, -230, 120), accent);
add('transport-wheel-1', cylinder(85, 120, 12).rotate([0, 1, 0], 90).translate(808.5, 230, 120), "#414848");
add('transport-wheel-1-hub', cylinder(93.5, 40.8, 10).translate(804.25, 230, 120), accent);
add('standard-0', box(42, 58, 415.4, true).translate(-966, 0, 375.2), body);
add('cultivator-sweep-0', box(130, 170, 34, true).translate(-966, -120, 42), accent);
add('standard-1', box(42, 58, 415.4, true).translate(-724.5, 0, 375.2), body);
add('cultivator-sweep-1', box(130, 170, 34, true).translate(-724.5, -120, 42), accent);
add('standard-2', box(42, 58, 415.4, true).translate(-483, 0, 375.2), body);
add('cultivator-sweep-2', box(130, 170, 34, true).translate(-483, -120, 42), accent);
add('standard-3', box(42, 58, 415.4, true).translate(-241.5, 0, 375.2), body);
add('cultivator-sweep-3', box(130, 170, 34, true).translate(-241.5, -120, 42), accent);
add('standard-4', box(42, 58, 415.4, true).translate(0, 0, 375.2), body);
add('cultivator-sweep-4', box(130, 170, 34, true).translate(0, -120, 42), accent);
add('standard-5', box(42, 58, 415.4, true).translate(241.5, 0, 375.2), body);
add('cultivator-sweep-5', box(130, 170, 34, true).translate(241.5, -120, 42), accent);
add('standard-6', box(42, 58, 415.4, true).translate(483, 0, 375.2), body);
add('cultivator-sweep-6', box(130, 170, 34, true).translate(483, -120, 42), accent);
add('standard-7', box(42, 58, 415.4, true).translate(724.5, 0, 375.2), body);
add('cultivator-sweep-7', box(130, 170, 34, true).translate(724.5, -120, 42), accent);
add('standard-8', box(42, 58, 415.4, true).translate(966, 0, 375.2), body);
add('cultivator-sweep-8', box(130, 170, 34, true).translate(966, -120, 42), accent);

return p.model();
