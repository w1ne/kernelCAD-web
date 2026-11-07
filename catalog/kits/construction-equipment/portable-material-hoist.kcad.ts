// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly portable material hoist scene prop, modeled from scratch.
meta({
  name: "portable-material-hoist",
  license: 'CC0-1.0',
  title: "Portable material hoist",
  description: "Compact construction hoist with mast, carriage platform, winch and stabilizing feet. Knobs: overall scale, body color and accent color.",
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
const p = assembly('portable-material-hoist');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('ground-frame', box(541.2, 557.6, 90, true).translate(0, 0, 45), body);
add('mast', box(95, 95, 1480, true).translate(0, 81.6, 830), accent);
add('carriage', box(501.6, 60, 518, true).translate(0, -149.6, 409), body);
add('winch', cylinder(150, 110, 10).translate(0, 244.8, 1332), accent);
add('stabilizer--1', box(858, 50, 55, true).translate(0, -353.6, 27.5), body);
add('stabilizer-1', box(858, 50, 55, true).translate(0, 353.6, 27.5), body);

return p.model();
