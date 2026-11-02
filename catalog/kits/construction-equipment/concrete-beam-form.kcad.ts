// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly concrete beam form scene prop, modeled from scratch.
meta({
  name: "concrete-beam-form",
  license: 'CC0-1.0',
  title: "Concrete beam form",
  description: "Raised beam shutter with paired supports, side panels and bottom soffit. Knobs: overall scale, body color and accent color.",
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
const p = assembly('concrete-beam-form');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('soffit', box(1320, 357.5, 80, true).translate(0, 0, 426.4), body);
add('beam-side--1', box(1320, 45, 515.2, true).translate(0, -195, 772.8), accent);
add('support-leg--1--461-99999999999994', box(44, 44, 441.6, true).translate(-462, -195, 220.8), body);
add('support-foot--1--461-99999999999994', box(150, 120, 36, true).translate(-462, -195, 18), accent);
add('support-leg--1-461-99999999999994', box(44, 44, 441.6, true).translate(462, -195, 220.8), body);
add('support-foot--1-461-99999999999994', box(150, 120, 36, true).translate(462, -195, 18), accent);
add('beam-side-1', box(1320, 45, 515.2, true).translate(0, 195, 772.8), accent);
add('support-leg-1--461-99999999999994', box(44, 44, 441.6, true).translate(-462, 195, 220.8), body);
add('support-foot-1--461-99999999999994', box(150, 120, 36, true).translate(-462, 195, 18), accent);
add('support-leg-1-461-99999999999994', box(44, 44, 441.6, true).translate(462, 195, 220.8), body);
add('support-foot-1-461-99999999999994', box(150, 120, 36, true).translate(462, 195, 18), accent);

return p.model();
