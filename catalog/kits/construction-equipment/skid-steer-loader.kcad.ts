// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly skid-steer loader scene prop, modeled from scratch.
meta({
  name: "skid-steer-loader",
  license: 'CC0-1.0',
  title: "Skid-steer loader",
  description: "Compact four-wheel loader with protective operator cage, lift arms and front bucket. Knobs: overall scale, body color and accent color.",
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
const p = assembly('skid-steer-loader');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('loader-wheel-0--1', cylinder(94, 185, 12).rotate([1, 0, 0], 90).translate(-238, -170.56, 185), "#40474b");
add('loader-wheel-0--1-hub--1', cylinder(15.04, 70.3, 10).rotate([1, 0, 0], 90).translate(-238, -272.08, 185), accent);
add('loader-wheel-0--1-hub-1', cylinder(15.04, 70.3, 10).rotate([1, 0, 0], 90).translate(-238, -163.04, 185), accent);
add('loader-wheel-0-1', cylinder(94, 185, 12).rotate([1, 0, 0], 90).translate(-238, 264.56, 185), "#40474b");
add('loader-wheel-0-1-hub--1', cylinder(15.04, 70.3, 10).rotate([1, 0, 0], 90).translate(-238, 163.04, 185), accent);
add('loader-wheel-0-1-hub-1', cylinder(15.04, 70.3, 10).rotate([1, 0, 0], 90).translate(-238, 272.08, 185), accent);
add('loader-wheel-1--1', cylinder(94, 185, 12).rotate([1, 0, 0], 90).translate(238, -170.56, 185), "#40474b");
add('loader-wheel-1--1-hub--1', cylinder(15.04, 70.3, 10).rotate([1, 0, 0], 90).translate(238, -272.08, 185), accent);
add('loader-wheel-1--1-hub-1', cylinder(15.04, 70.3, 10).rotate([1, 0, 0], 90).translate(238, -163.04, 185), accent);
add('loader-wheel-1-1', cylinder(94, 185, 12).rotate([1, 0, 0], 90).translate(238, 264.56, 185), "#40474b");
add('loader-wheel-1-1-hub--1', cylinder(15.04, 70.3, 10).rotate([1, 0, 0], 90).translate(238, 163.04, 185), accent);
add('loader-wheel-1-1-hub-1', cylinder(15.04, 70.3, 10).rotate([1, 0, 0], 90).translate(238, 272.08, 185), accent);
add('loader-chassis', box(595, 385, 210, true).translate(0, 0, 325), body);
add('operator-cab', box(238, 301, 357, true).translate(-93.5, 0, 608.5), accent);
add('cab-window', box(161.5, 22, 212.5, true).translate(-93.5, -157.5, 576.25), body);
add('lift-arm--1', box(408, 70, 80, true).translate(212.5, -231, 460), accent);
add('lift-pivot--1', cylinder(78, 55, 8).translate(272, -259, 460), body);
add('lift-arm-1', box(408, 70, 80, true).translate(212.5, 231, 460), accent);
add('lift-pivot-1', cylinder(78, 55, 8).translate(272, 259, 460), body);
add('bucket-back', box(90, 504, 230, true).translate(484.5, 0, 265), body);
add('bucket-floor', box(170, 525, 48, true).translate(535.5, 0, 104), accent);
add('bucket-cutting-edge', box(50, 574, 45, true).translate(629, 0, 92.5), body);

return p.model();
