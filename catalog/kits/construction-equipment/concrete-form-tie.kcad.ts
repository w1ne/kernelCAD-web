// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly concrete form tie scene prop, modeled from scratch.
meta({
  name: "concrete-form-tie",
  license: 'CC0-1.0',
  title: "Concrete form tie",
  description: "Reusable form tie assembly with threaded rod, bearing plates and wing nuts. Knobs: overall scale, body color and accent color.",
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
const p = assembly('concrete-form-tie');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('tie-rod', cylinder(600, 18, 8).rotate([0, 1, 0], 90).translate(-300, 0, 18), body);
add('bearing-plate--1', box(38, 140, 55, true).translate(-192, 0, 27.5), accent);
add('wing-nut--1', cylinder(60, 36, 8).rotate([0, 1, 0], 90).translate(-252, 0, 36), body);
add('bearing-plate-1', box(38, 140, 55, true).translate(192, 0, 27.5), accent);
add('wing-nut-1', cylinder(60, 36, 8).rotate([0, 1, 0], 90).translate(132, 0, 36), body);

return p.model();
