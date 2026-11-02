// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly articulated dump truck scene prop, modeled from scratch.
meta({
  name: "articulated-dump-truck",
  license: 'CC0-1.0',
  title: "Articulated dump truck",
  description: "Off-road articulated hauler with forward cab, rear dump body and six large tires. Knobs: overall scale, body color and accent color.",
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
const p = assembly('articulated-dump-truck');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('hauler-chassis', box(1271, 414, 150, true).translate(0, 0, 215), body);
add('hauler-wheel-0--1', cylinder(110, 145, 12).rotate([1, 0, 0], 90).translate(-465, -269, 145), "#40474b");
add('hauler-wheel-0--1-hub--1', cylinder(17.6, 55.1, 10).rotate([1, 0, 0], 90).translate(-465, -387.8, 145), accent);
add('hauler-wheel-0--1-hub-1', cylinder(17.6, 55.1, 10).rotate([1, 0, 0], 90).translate(-465, -260.2, 145), accent);
add('hauler-wheel-0-1', cylinder(110, 145, 12).rotate([1, 0, 0], 90).translate(-465, 379, 145), "#40474b");
add('hauler-wheel-0-1-hub--1', cylinder(17.6, 55.1, 10).rotate([1, 0, 0], 90).translate(-465, 260.2, 145), accent);
add('hauler-wheel-0-1-hub-1', cylinder(17.6, 55.1, 10).rotate([1, 0, 0], 90).translate(-465, 387.8, 145), accent);
add('hauler-wheel-1--1', cylinder(110, 160, 12).rotate([1, 0, 0], 90).translate(434, -269, 160), "#40474b");
add('hauler-wheel-1--1-hub--1', cylinder(17.6, 60.8, 10).rotate([1, 0, 0], 90).translate(434, -387.8, 160), accent);
add('hauler-wheel-1--1-hub-1', cylinder(17.6, 60.8, 10).rotate([1, 0, 0], 90).translate(434, -260.2, 160), accent);
add('hauler-wheel-1-1', cylinder(110, 160, 12).rotate([1, 0, 0], 90).translate(434, 379, 160), "#40474b");
add('hauler-wheel-1-1-hub--1', cylinder(17.6, 60.8, 10).rotate([1, 0, 0], 90).translate(434, 260.2, 160), accent);
add('hauler-wheel-1-1-hub-1', cylinder(17.6, 60.8, 10).rotate([1, 0, 0], 90).translate(434, 387.8, 160), accent);
add('hauler-cab', box(387.5, 360, 525, true).translate(434, 0, 552.5), accent);
add('hauler-cab-window', box(248, 378, 125, true).translate(480.5, -18, 700), body);
add('hauler-roof', box(418.5, 387, 45, true).translate(434, 0, 837.5), body);
add('dump-body-floor', box(744, 576, 525, true).translate(-263.5, 0, 562.5), accent);
add('dump-body-side--1', box(775, 72, 700, true).translate(-263.5, -252, 650), body);
add('dump-body-side-1', box(775, 72, 700, true).translate(-263.5, 252, 650), body);
add('dump-body-front', box(46, 594, 675, true).translate(124, 0, 637.5), body);
add('tailgate', box(42, 603, 625, true).translate(-651, 0, 612.5), accent);
add('lift-ram', box(90, 75, 562.5, true).translate(-46.5, 0, 561.25), body);
add('articulation-joint', box(140, 270, 130, true).translate(93, 0, 325), accent);

return p.model();
