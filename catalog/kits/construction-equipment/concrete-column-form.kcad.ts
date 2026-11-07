// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly concrete column form scene prop, modeled from scratch.
meta({
  name: "concrete-column-form",
  license: 'CC0-1.0',
  title: "Concrete column form",
  description: "Square column shutter with corner walers, vertical stiffeners and base shoes. Knobs: overall scale, body color and accent color.",
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
const p = assembly('concrete-column-form');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('column-face', box(436.8, 436.8, 1550, true).translate(0, 0, 775), body);
add('column-waler-x--1', box(42, 588, 1581, true).translate(-257.6, 0, 790.5), accent);
add('column-waler-y--1', box(588, 42, 1581, true).translate(0, -257.6, 790.5), accent);
add('column-waler-x-1', box(42, 588, 1581, true).translate(257.6, 0, 790.5), accent);
add('column-waler-y-1', box(588, 42, 1581, true).translate(0, 257.6, 790.5), accent);
add('column-clamp-0', box(660.8, 660.8, 38, true).translate(0, 0, 19), body);
add('column-clamp-1', box(660.8, 660.8, 38, true).translate(0, 0, 406.5), body);
add('column-clamp-2', box(660.8, 660.8, 38, true).translate(0, 0, 794), body);
add('column-clamp-3', box(660.8, 660.8, 38, true).translate(0, 0, 1181.5), body);

return p.model();
