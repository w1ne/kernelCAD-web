// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly road material transfer conveyor scene prop, modeled from scratch.
meta({
  name: "asphalt-transfer-conveyor",
  license: 'CC0-1.0',
  title: "Road material transfer conveyor",
  description: "Mobile inclined conveyor with feed hopper, trussed belt frame and transport axle. Knobs: overall scale, body color and accent color.",
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
const p = assembly('asphalt-transfer-conveyor');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('hopper', box(374, 516, 406, true).translate(646, 0, 203), accent);
add('conveyor-belt', box(1496, 192, 70, true).translate(-102, 0, 499), body);
add('truss-rail--1', box(1496, 35, 45, true).translate(-136, -132, 370.5), accent);
add('support-leg--1', box(45, 45, 609, true).translate(-374, -132, 304.5), body);
add('truss-rail-1', box(1496, 35, 45, true).translate(-136, 132, 370.5), accent);
add('support-leg-1', box(45, 45, 609, true).translate(-374, 132, 304.5), body);
add('transport-wheel--1', cylinder(70, 125, 12).rotate([1, 0, 0], 90).translate(-306, -217, 125), "#40474b");
add('transport-wheel--1-hub--1', cylinder(11.2, 47.5, 10).rotate([1, 0, 0], 90).translate(-306, -292.6, 125), accent);
add('transport-wheel--1-hub-1', cylinder(11.2, 47.5, 10).rotate([1, 0, 0], 90).translate(-306, -211.4, 125), accent);
add('transport-wheel-1', cylinder(70, 125, 12).rotate([1, 0, 0], 90).translate(-306, 287, 125), "#40474b");
add('transport-wheel-1-hub--1', cylinder(11.2, 47.5, 10).rotate([1, 0, 0], 90).translate(-306, 211.4, 125), accent);
add('transport-wheel-1-hub-1', cylinder(11.2, 47.5, 10).rotate([1, 0, 0], 90).translate(-306, 292.6, 125), accent);
add('discharge-chute', box(180, 240, 80, true).translate(-799, 0, 1243.5), accent);

return p.model();
