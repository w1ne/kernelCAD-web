// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly wall reagent cabinet scene prop, modeled from scratch.
meta({
  name: 'wall-reagent-cabinet',
  license: 'CC0-1.0',
  title: 'Wall reagent cabinet',
  description: 'Wall-hung reagent cabinet with glazed-looking paired doors, side rails and a deep canopy. Knobs: overall scale, body color and accent color.',
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
const p = assembly('wall-reagent-cabinet');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('cabinet-shell', box(1000, 360, 720, true).translate(0, 0, 360), body);
add('cabinet-plinth', box(920, 324, 22, true).translate(0, 0, 11), accent);
add('door-0', box(412.8, 18, 690, true).translate(-220, -183.6, 705), body);
add('door-pull-0', box(14, 14, 115.2, true).translate(-82.4, -198, 432), accent);
add('door-1', box(412.8, 18, 690, true).translate(220, -183.6, 705), body);
add('door-pull-1', box(14, 14, 115.2, true).translate(357.6, -198, 432), accent);
add('wall-bracket--1', box(35, 198, 170, true).translate(-350, 72, 85), accent);
add('wall-bracket-1', box(35, 198, 170, true).translate(350, 72, 85), accent);

return p.model();
