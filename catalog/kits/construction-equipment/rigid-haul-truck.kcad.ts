// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly rigid-frame haul truck scene prop, modeled from scratch.
meta({
  name: "rigid-haul-truck",
  license: 'CC0-1.0',
  title: "Rigid-frame haul truck",
  description: "Large site haul truck with high-capacity open bed, tall chassis and oversized tires. Knobs: overall scale, body color and accent color.",
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
const p = assembly('rigid-haul-truck');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('hauler-chassis', box(1517, 483, 150, true).translate(0, 0, 215), body);
add('hauler-wheel-0--1', cylinder(110, 145, 12).rotate([1, 0, 0], 90).translate(-592, -323, 145), "#40474b");
add('hauler-wheel-0--1-hub--1', cylinder(17.6, 55.1, 10).rotate([1, 0, 0], 90).translate(-592, -441.8, 145), accent);
add('hauler-wheel-0--1-hub-1', cylinder(17.6, 55.1, 10).rotate([1, 0, 0], 90).translate(-592, -314.2, 145), accent);
add('hauler-wheel-0-1', cylinder(110, 145, 12).rotate([1, 0, 0], 90).translate(-592, 433, 145), "#40474b");
add('hauler-wheel-0-1-hub--1', cylinder(17.6, 55.1, 10).rotate([1, 0, 0], 90).translate(-592, 314.2, 145), accent);
add('hauler-wheel-0-1-hub-1', cylinder(17.6, 55.1, 10).rotate([1, 0, 0], 90).translate(-592, 441.8, 145), accent);
add('hauler-wheel-1--1', cylinder(110, 160, 12).rotate([1, 0, 0], 90).translate(333, -323, 160), "#40474b");
add('hauler-wheel-1--1-hub--1', cylinder(17.6, 60.8, 10).rotate([1, 0, 0], 90).translate(333, -441.8, 160), accent);
add('hauler-wheel-1--1-hub-1', cylinder(17.6, 60.8, 10).rotate([1, 0, 0], 90).translate(333, -314.2, 160), accent);
add('hauler-wheel-1-1', cylinder(110, 160, 12).rotate([1, 0, 0], 90).translate(333, 433, 160), "#40474b");
add('hauler-wheel-1-1-hub--1', cylinder(17.6, 60.8, 10).rotate([1, 0, 0], 90).translate(333, 314.2, 160), accent);
add('hauler-wheel-1-1-hub-1', cylinder(17.6, 60.8, 10).rotate([1, 0, 0], 90).translate(333, 441.8, 160), accent);
add('hauler-wheel-2--1', cylinder(110, 160, 12).rotate([1, 0, 0], 90).translate(629, -323, 160), "#40474b");
add('hauler-wheel-2--1-hub--1', cylinder(17.6, 60.8, 10).rotate([1, 0, 0], 90).translate(629, -441.8, 160), accent);
add('hauler-wheel-2--1-hub-1', cylinder(17.6, 60.8, 10).rotate([1, 0, 0], 90).translate(629, -314.2, 160), accent);
add('hauler-wheel-2-1', cylinder(110, 160, 12).rotate([1, 0, 0], 90).translate(629, 433, 160), "#40474b");
add('hauler-wheel-2-1-hub--1', cylinder(17.6, 60.8, 10).rotate([1, 0, 0], 90).translate(629, 314.2, 160), accent);
add('hauler-wheel-2-1-hub-1', cylinder(17.6, 60.8, 10).rotate([1, 0, 0], 90).translate(629, 441.8, 160), accent);
add('hauler-cab', box(462.5, 420, 630, true).translate(518, 0, 605), accent);
add('hauler-cab-window', box(296, 441, 150, true).translate(573.5, -21, 780), body);
add('hauler-roof', box(499.5, 451.5, 45, true).translate(518, 0, 942.5), body);
add('dump-body-floor', box(888, 672, 630, true).translate(-314.5, 0, 615), accent);
add('dump-body-side--1', box(925, 84, 840, true).translate(-314.5, -294, 720), body);
add('dump-body-side-1', box(925, 84, 840, true).translate(-314.5, 294, 720), body);
add('dump-body-front', box(46, 693, 810, true).translate(148, 0, 705), body);
add('tailgate', box(42, 703.5, 750, true).translate(-777, 0, 675), accent);
add('lift-ram', box(90, 75, 675, true).translate(-55.5, 0, 617.5), body);

return p.model();
