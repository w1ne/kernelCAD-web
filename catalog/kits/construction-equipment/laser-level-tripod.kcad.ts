// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly laser level and tripod scene prop, modeled from scratch.
meta({
  name: "laser-level-tripod",
  license: 'CC0-1.0',
  title: "Laser level and tripod",
  description: "Survey tripod with compact rotating laser head and control panel. Knobs: overall scale, body color and accent color.",
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
const p = assembly('laser-level-tripod');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('tripod-leg-0', box(38, 38, 1076.4, true).translate(81.6, 0, 538.2), body);
add('tripod-leg-1', box(38, 38, 1076.4, true).translate(-40.8, 70.668, 538.2), body);
add('tripod-leg-2', box(38, 38, 1076.4, true).translate(-40.8, -70.668, 538.2), body);
add('tripod-column', cylinder(358.8, 38, 8).translate(0, 0, 897), accent);
add('head-plate', box(168, 168, 45, true).translate(0, 0, 1264.5), body);
add('laser-head', cylinder(170, 115, 12).translate(0, 0, 1283.4), accent);
add('display', box(100, 26, 58, true).translate(0, -57.6, 1353.8), body);

return p.model();
