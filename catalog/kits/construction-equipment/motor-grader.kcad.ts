// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly motor grader scene prop, modeled from scratch.
meta({
  name: "motor-grader",
  license: 'CC0-1.0',
  title: "Motor grader",
  description: "Road grader with articulated chassis, six wheels, operator cab and center moldboard. Knobs: overall scale, body color and accent color.",
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
const p = assembly('motor-grader');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('grader-wheel-0--1', cylinder(96, 175, 12).rotate([1, 0, 0], 90).translate(-595, -209.89, 175), "#40474b");
add('grader-wheel-0--1-hub--1', cylinder(15.36, 66.5, 10).rotate([1, 0, 0], 90).translate(-595, -313.57, 175), accent);
add('grader-wheel-0--1-hub-1', cylinder(15.36, 66.5, 10).rotate([1, 0, 0], 90).translate(-595, -202.21, 175), accent);
add('grader-wheel-0-1', cylinder(96, 175, 12).rotate([1, 0, 0], 90).translate(-595, 305.89, 175), "#40474b");
add('grader-wheel-0-1-hub--1', cylinder(15.36, 66.5, 10).rotate([1, 0, 0], 90).translate(-595, 202.21, 175), accent);
add('grader-wheel-0-1-hub-1', cylinder(15.36, 66.5, 10).rotate([1, 0, 0], 90).translate(-595, 313.57, 175), accent);
add('grader-wheel-1--1', cylinder(96, 175, 12).rotate([1, 0, 0], 90).translate(-350, -209.89, 175), "#40474b");
add('grader-wheel-1--1-hub--1', cylinder(15.36, 66.5, 10).rotate([1, 0, 0], 90).translate(-350, -313.57, 175), accent);
add('grader-wheel-1--1-hub-1', cylinder(15.36, 66.5, 10).rotate([1, 0, 0], 90).translate(-350, -202.21, 175), accent);
add('grader-wheel-1-1', cylinder(96, 175, 12).rotate([1, 0, 0], 90).translate(-350, 305.89, 175), "#40474b");
add('grader-wheel-1-1-hub--1', cylinder(15.36, 66.5, 10).rotate([1, 0, 0], 90).translate(-350, 202.21, 175), accent);
add('grader-wheel-1-1-hub-1', cylinder(15.36, 66.5, 10).rotate([1, 0, 0], 90).translate(-350, 313.57, 175), accent);
add('grader-wheel-2--1', cylinder(96, 175, 12).rotate([1, 0, 0], 90).translate(595, -209.89, 175), "#40474b");
add('grader-wheel-2--1-hub--1', cylinder(15.36, 66.5, 10).rotate([1, 0, 0], 90).translate(595, -313.57, 175), accent);
add('grader-wheel-2--1-hub-1', cylinder(15.36, 66.5, 10).rotate([1, 0, 0], 90).translate(595, -202.21, 175), accent);
add('grader-wheel-2-1', cylinder(96, 175, 12).rotate([1, 0, 0], 90).translate(595, 305.89, 175), "#40474b");
add('grader-wheel-2-1-hub--1', cylinder(15.36, 66.5, 10).rotate([1, 0, 0], 90).translate(595, 202.21, 175), accent);
add('grader-wheel-2-1-hub-1', cylinder(15.36, 66.5, 10).rotate([1, 0, 0], 90).translate(595, 313.57, 175), accent);
add('rear-frame', box(840, 408, 170, true).translate(-280, 0, 365), body);
add('engine-hood', box(525, 374, 300, true).translate(-490, 0, 600), accent);
add('operator-cab', box(385, 340, 399, true).translate(210, 0, 659.5), body);
add('cab-roof', box(472.5, 382.5, 45, true).translate(210, 0, 881.5), accent);
add('grader-front-frame', box(752.5, 120, 100, true).translate(700, 0, 280), body);
add('moldboard', box(420, 765, 75, true).translate(87.5, 0, 217.5), accent);
add('circle-drive', cylinder(75, 130, 10).translate(0, 0, 165), body);

return p.model();
