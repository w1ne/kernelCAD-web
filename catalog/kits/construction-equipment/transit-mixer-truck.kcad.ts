// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly transit concrete mixer truck scene prop, modeled from scratch.
meta({
  name: "transit-mixer-truck",
  license: 'CC0-1.0',
  title: "Transit concrete mixer truck",
  description: "Concrete mixer truck with rotating-looking drum, rear discharge chute and cab. Knobs: overall scale, body color and accent color.",
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
const p = assembly('transit-mixer-truck');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('mixer-chassis', box(1394, 363.4, 150, true).translate(0, 0, 215), body);
add('mixer-wheel-0--1', cylinder(110, 145, 12).rotate([1, 0, 0], 90).translate(-510, -229.4, 145), "#40474b");
add('mixer-wheel-0--1-hub--1', cylinder(17.6, 55.1, 10).rotate([1, 0, 0], 90).translate(-510, -348.2, 145), accent);
add('mixer-wheel-0--1-hub-1', cylinder(17.6, 55.1, 10).rotate([1, 0, 0], 90).translate(-510, -220.6, 145), accent);
add('mixer-wheel-0-1', cylinder(110, 145, 12).rotate([1, 0, 0], 90).translate(-510, 339.4, 145), "#40474b");
add('mixer-wheel-0-1-hub--1', cylinder(17.6, 55.1, 10).rotate([1, 0, 0], 90).translate(-510, 220.6, 145), accent);
add('mixer-wheel-0-1-hub-1', cylinder(17.6, 55.1, 10).rotate([1, 0, 0], 90).translate(-510, 348.2, 145), accent);
add('mixer-wheel-1--1', cylinder(110, 160, 12).rotate([1, 0, 0], 90).translate(476, -229.4, 160), "#40474b");
add('mixer-wheel-1--1-hub--1', cylinder(17.6, 60.8, 10).rotate([1, 0, 0], 90).translate(476, -348.2, 160), accent);
add('mixer-wheel-1--1-hub-1', cylinder(17.6, 60.8, 10).rotate([1, 0, 0], 90).translate(476, -220.6, 160), accent);
add('mixer-wheel-1-1', cylinder(110, 160, 12).rotate([1, 0, 0], 90).translate(476, 339.4, 160), "#40474b");
add('mixer-wheel-1-1-hub--1', cylinder(17.6, 60.8, 10).rotate([1, 0, 0], 90).translate(476, 220.6, 160), accent);
add('mixer-wheel-1-1-hub-1', cylinder(17.6, 60.8, 10).rotate([1, 0, 0], 90).translate(476, 348.2, 160), accent);
add('mixer-cab', box(425, 316, 546, true).translate(476, 0, 563), accent);
add('mixer-cab-window', box(272, 331.8, 130, true).translate(527, -15.8, 716), body);
add('mixer-roof', box(459, 339.7, 45, true).translate(476, 0, 858.5), body);
add('mixing-drum', cylinder(680, 229.1, 12).rotate([0, 1, 0], 90).translate(-340, 0, 410), accent);
add('drum-neck', cylinder(105, 80, 10).translate(-714, 0, 400), body);
add('rear-chute-support', box(85, 90, 360, true).translate(-680, 0, 430), body);
add('discharge-chute-0', box(120, 88, 38, true).translate(-816, 0, 229), accent);
add('discharge-chute-1', box(120, 88, 38, true).translate(-886, 0, 194), accent);
add('discharge-chute-2', box(120, 88, 38, true).translate(-956, 0, 159), accent);

return p.model();
