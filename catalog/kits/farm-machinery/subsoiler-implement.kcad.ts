// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly subsoiler implement scene prop, modeled from scratch.
meta({
  name: "subsoiler-implement",
  license: 'CC0-1.0',
  title: "Subsoiler implement",
  description: "Deep-tillage subsoiler frame with reinforced standards, angled legs and replaceable points. Knobs: overall scale, body color and accent color.",
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
const p = assembly('subsoiler-implement');
const groundOffset = 18;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('main-toolbar', box(1500, 110, 94, true).translate(0, 108, 479), accent);
add('drawbar', box(135, 504, 70, true).translate(0, 387, 531), body);
add('standard-0', box(42, 58, 496, true).translate(-630, 0, 448), body);
add('subsoiler-leg-0', box(82, 200, 440, true).translate(-630, -108, 245), body);
add('subsoiler-point-0', box(120, 210, 40, true).translate(-630, -216, 38), accent);
add('standard-1', box(42, 58, 496, true).translate(-315, 0, 448), body);
add('subsoiler-leg-1', box(82, 200, 440, true).translate(-315, -108, 245), body);
add('subsoiler-point-1', box(120, 210, 40, true).translate(-315, -216, 38), accent);
add('standard-2', box(42, 58, 496, true).translate(0, 0, 448), body);
add('subsoiler-leg-2', box(82, 200, 440, true).translate(0, -108, 245), body);
add('subsoiler-point-2', box(120, 210, 40, true).translate(0, -216, 38), accent);
add('standard-3', box(42, 58, 496, true).translate(315, 0, 448), body);
add('subsoiler-leg-3', box(82, 200, 440, true).translate(315, -108, 245), body);
add('subsoiler-point-3', box(120, 210, 40, true).translate(315, -216, 38), accent);
add('standard-4', box(42, 58, 496, true).translate(630, 0, 448), body);
add('subsoiler-leg-4', box(82, 200, 440, true).translate(630, -108, 245), body);
add('subsoiler-point-4', box(120, 210, 40, true).translate(630, -216, 38), accent);

return p.model();
