// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly jobsite tile saw scene prop, modeled from scratch.
meta({
  name: "jobsite-tile-saw",
  license: 'CC0-1.0',
  title: "Jobsite tile saw",
  description: "Water-cooled tile saw on a folding stand with sliding table and blade guard. Knobs: overall scale, body color and accent color.",
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
const p = assembly('jobsite-tile-saw');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('tool-table', box(950, 442, 58, true).translate(0, 0, 513), body);
add('stand-leg--1', box(42, 42, 475.2, true).translate(-361, 0, 237.6), accent);
add('stand-leg-1', box(42, 42, 475.2, true).translate(361, 0, 237.6), accent);
add('motor-head', box(237.5, 325, 246.4, true).translate(-266, 0, 686.4), accent);
add('sliding-carriage', box(323, 351, 48, true).translate(76, 0, 569.6), body);
add('tile-blade', cylinder(45, 115, 10).translate(266, 0, 536.8), accent);
add('water-pan', box(836, 455, 38, true).translate(0, 0, 124.6), body);

return p.model();
