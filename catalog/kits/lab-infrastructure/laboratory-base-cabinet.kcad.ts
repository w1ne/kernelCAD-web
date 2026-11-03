// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly laboratory base cabinet scene prop, modeled from scratch.
meta({
  name: 'laboratory-base-cabinet',
  license: 'CC0-1.0',
  title: 'Laboratory base cabinet',
  description: 'Modular underbench cabinet with paired doors, recessed plinth, pulls and an inset worktop. Knobs: overall scale, body color and accent color.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#829092', { label: 'Body color' });
const accent = param('accent', '#39a89b', { label: 'Accent color' });
const p = assembly('laboratory-base-cabinet');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('cabinet-shell', box(900, 570, 870, true).translate(0, 0, 435), body);
add('cabinet-plinth', box(828, 513, 22, true).translate(0, 0, 11), accent);
add('door-0', box(371.52, 18, 840, true).translate(-198, -290.7, 855), body);
add('door-pull-0', box(14, 14, 139.2, true).translate(-74.16, -313.5, 522), accent);
add('door-1', box(371.52, 18, 840, true).translate(198, -290.7, 855), body);
add('door-pull-1', box(14, 14, 139.2, true).translate(321.84, -313.5, 522), accent);

return p.model();
