// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly pipe roller stand scene prop, modeled from scratch.
meta({
  name: "pipe-roller-stand",
  license: 'CC0-1.0',
  title: "Pipe roller stand",
  description: "Adjustable pipe support stand with paired rollers, screw post and tripod feet. Knobs: overall scale, body color and accent color.",
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
const p = assembly('pipe-roller-stand');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('tripod-leg-0', box(42, 42, 660, true).translate(-94.5, -85, 330), body);
add('tripod-leg-1', box(42, 42, 660, true).translate(94.5, -85, 330), body);
add('tripod-leg-2', box(42, 42, 660, true).translate(0, 90, 330), body);
add('upright-post', cylinder(220, 46, 8).translate(0, 0, 598.4), accent);
add('roller-left', cylinder(189, 50, 8).rotate([1, 0, 0], 90).translate(0, -5.5, 836), body);
add('roller-right', cylinder(189, 50, 8).rotate([1, 0, 0], 90).translate(0, 194.5, 836), body);

return p.model();
