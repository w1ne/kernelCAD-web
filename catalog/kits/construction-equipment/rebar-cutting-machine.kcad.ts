// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly rebar cutting machine scene prop, modeled from scratch.
meta({
  name: "rebar-cutting-machine",
  license: 'CC0-1.0',
  title: "Rebar cutting machine",
  description: "Jobsite bar cutter with reinforced base, cutting head, guard and foot control. Knobs: overall scale, body color and accent color.",
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
const p = assembly('rebar-cutting-machine');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('machine-base', box(576, 395.2, 110, true).translate(0, 0, 55), body);
add('work-table', box(720, 405.6, 80, true).translate(0, 0, 150), accent);
add('motor-case', box(180, 249.6, 210.8, true).translate(-158.4, 0, 295.4), body);
add('cutting-head', box(180, 286, 297.6, true).translate(216, 0, 378.8), accent);
add('blade-guard', box(120, 24, 100, true).translate(216, -156, 285.6), body);

return p.model();
