// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly concrete formwork panel scene prop, modeled from scratch.
meta({
  name: "concrete-formwork-panel",
  license: 'CC0-1.0',
  title: "Concrete formwork panel",
  description: "Reusable wall-form panel with framed face, stiffeners and corner clamps. Knobs: overall scale, body color and accent color.",
  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'structure',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#78828a', { label: 'Body color' });
const accent = param('accent', '#d29a36', { label: 'Accent color' });
const p = assembly('concrete-formwork-panel');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('form-face', box(900, 45, 1550, true).translate(0, 0, 775), body);
add('vertical-strongback--1', box(45, 61.2, 1550, true).translate(-396, 75.6, 775), accent);
add('vertical-strongback-1', box(45, 61.2, 1550, true).translate(396, 75.6, 775), accent);
add('horizontal-waler-0', box(972, 42, 45, true).translate(0, 75.6, 22.5), body);
add('horizontal-waler-1', box(972, 42, 45, true).translate(0, 75.6, 425.5), body);
add('horizontal-waler-2', box(972, 42, 45, true).translate(0, 75.6, 828.5), body);
add('horizontal-waler-3', box(972, 42, 45, true).translate(0, 75.6, 1231.5), body);

return p.model();
