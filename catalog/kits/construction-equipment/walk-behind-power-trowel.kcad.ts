// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly walk-behind power trowel scene prop, modeled from scratch.
meta({
  name: "walk-behind-power-trowel",
  license: 'CC0-1.0',
  title: "Walk-behind power trowel",
  description: "Concrete finishing tool with circular blade guard, engine block and long control handle. Knobs: overall scale, body color and accent color.",
  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#78828a', { label: 'Body color' });
const accent = param('accent', '#d29a36', { label: 'Accent color' });
const p = assembly('walk-behind-power-trowel');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('trowel-guard', cylinder(72, 252, 12).translate(0, 0, 0), body);
add('engine', cylinder(290, 125, 10).translate(0, 0, 135), accent);
add('handle-post', box(55, 58, 220, true).translate(-134.4, 0, 390), body);
add('control-handle', box(260, 55, 42, true).translate(-212.8, 0, 496), accent);
add('blade-guard', box(470.4, 470.4, 44, true).translate(0, 0, 22), body);

return p.model();
