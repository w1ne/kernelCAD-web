// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly portable site water tank scene prop, modeled from scratch.
meta({
  name: "portable-site-water-tank",
  license: 'CC0-1.0',
  title: "Portable site water tank",
  description: "Skid-mounted water tank with fill cap, outlet valve and protective frame. Knobs: overall scale, body color and accent color.",
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
const p = assembly('portable-site-water-tank');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('skid-base', box(846, 653.6, 65, true).translate(0, 0, 32.5), body);
add('tank-body', box(733.2, 562.4, 900, true).translate(0, 0, 515), accent);
add('filler-neck', cylinder(100, 48, 8).translate(-263.2, 0, 975), body);
add('outlet-valve', cylinder(125, 34, 8).translate(394.8, 0, 425), body);
add('tank-skid--1', box(902.4, 35, 82, true).translate(0, -296.4, 41), body);
add('tank-skid-1', box(902.4, 35, 82, true).translate(0, 296.4, 41), body);

return p.model();
