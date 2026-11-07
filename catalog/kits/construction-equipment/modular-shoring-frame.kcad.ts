// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly modular shoring frame scene prop, modeled from scratch.
meta({
  name: "modular-shoring-frame",
  license: 'CC0-1.0',
  title: "Modular shoring frame",
  description: "Stackable shoring frame with paired standards, cross braces and foot plates. Knobs: overall scale, body color and accent color.",
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
const p = assembly('modular-shoring-frame');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('standard--1--1', cylinder(1250, 48, 8).translate(-296.4, -151.2, 0), body);
add('standard--1-1', cylinder(1250, 48, 8).translate(-296.4, 151.2, 0), body);
add('standard-1--1', cylinder(1250, 48, 8).translate(296.4, -151.2, 0), body);
add('standard-1-1', cylinder(1250, 48, 8).translate(296.4, 151.2, 0), body);
add('crossbar-front-0', box(639.6, 32, 32, true).translate(0, -155.4, 76), accent);
add('crossbar-side-0', box(32, 319.2, 32, true).translate(-296.4, 0, 76), accent);
add('crossbar-front-1', box(639.6, 32, 32, true).translate(0, -155.4, 413.5), accent);
add('crossbar-side-1', box(32, 319.2, 32, true).translate(-296.4, 0, 413.5), accent);
add('crossbar-front-2', box(639.6, 32, 32, true).translate(0, -155.4, 751), accent);
add('crossbar-side-2', box(32, 319.2, 32, true).translate(-296.4, 0, 751), accent);
add('crossbar-front-3', box(639.6, 32, 32, true).translate(0, -155.4, 1088.5), accent);
add('crossbar-side-3', box(32, 319.2, 32, true).translate(-296.4, 0, 1088.5), accent);
add('head-plate', box(811.2, 394.8, 55, true).translate(0, 0, 1222.5), body);

return p.model();
