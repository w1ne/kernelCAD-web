// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly road reclaimer scene prop, modeled from scratch.
meta({
  name: "road-reclaimer",
  license: 'CC0-1.0',
  title: "Road reclaimer",
  description: "Road reclamation machine with high-clearance chassis, milling chamber and long operator deck. Knobs: overall scale, body color and accent color.",
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
const p = assembly('road-reclaimer');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('milling-wheel-0--1', cylinder(95, 190, 12).rotate([1, 0, 0], 90).translate(-528, -286.24, 190), "#40474b");
add('milling-wheel-0--1-hub--1', cylinder(15.2, 72.2, 10).rotate([1, 0, 0], 90).translate(-528, -388.84, 190), accent);
add('milling-wheel-0--1-hub-1', cylinder(15.2, 72.2, 10).rotate([1, 0, 0], 90).translate(-528, -278.64, 190), accent);
add('milling-wheel-0-1', cylinder(95, 190, 12).rotate([1, 0, 0], 90).translate(-528, 381.24, 190), "#40474b");
add('milling-wheel-0-1-hub--1', cylinder(15.2, 72.2, 10).rotate([1, 0, 0], 90).translate(-528, 278.64, 190), accent);
add('milling-wheel-0-1-hub-1', cylinder(15.2, 72.2, 10).rotate([1, 0, 0], 90).translate(-528, 388.84, 190), accent);
add('milling-wheel-1--1', cylinder(95, 190, 12).rotate([1, 0, 0], 90).translate(462, -286.24, 190), "#40474b");
add('milling-wheel-1--1-hub--1', cylinder(15.2, 72.2, 10).rotate([1, 0, 0], 90).translate(462, -388.84, 190), accent);
add('milling-wheel-1--1-hub-1', cylinder(15.2, 72.2, 10).rotate([1, 0, 0], 90).translate(462, -278.64, 190), accent);
add('milling-wheel-1-1', cylinder(95, 190, 12).rotate([1, 0, 0], 90).translate(462, 381.24, 190), "#40474b");
add('milling-wheel-1-1-hub--1', cylinder(15.2, 72.2, 10).rotate([1, 0, 0], 90).translate(462, 278.64, 190), accent);
add('milling-wheel-1-1-hub-1', cylinder(15.2, 72.2, 10).rotate([1, 0, 0], 90).translate(462, 388.84, 190), accent);
add('main-frame', box(1188, 638, 230, true).translate(0, 0, 355), body);
add('engine-cover', box(627, 550, 493, true).translate(-297, 0, 716.5), accent);
add('operator-deck', box(330, 418, 42, true).translate(297, 0, 471), body);
add('canopy-posts', box(32, 374, 464, true).translate(297, 0, 724), accent);
add('canopy', box(594, 484, 48, true).translate(297, 0, 980), body);
add('milling-hood', box(412.5, 902, 250, true).translate(594, 0, 165), accent);
add('cutter-drum', cylinder(825, 120, 12).rotate([1, 0, 0], 90).translate(643.5, 412.5, 120), "#596166");
add('cutter-drum-hub--1', cylinder(132, 45.6, 10).rotate([1, 0, 0], 90).translate(643.5, -478.5, 120), accent);
add('cutter-drum-hub-1', cylinder(132, 45.6, 10).rotate([1, 0, 0], 90).translate(643.5, 478.5, 120), accent);
add('cutting-tooth-0', box(30, 814, 30, true).translate(462, 0, 57), body);
add('cutting-tooth-1', box(30, 814, 30, true).translate(519.75, 0, 57), body);
add('cutting-tooth-2', box(30, 814, 30, true).translate(577.5, 0, 57), body);
add('cutting-tooth-3', box(30, 814, 30, true).translate(635.25, 0, 57), body);
add('cutting-tooth-4', box(30, 814, 30, true).translate(693, 0, 57), body);
add('cutting-tooth-5', box(30, 814, 30, true).translate(750.75, 0, 57), body);
add('cutting-tooth-6', box(30, 814, 30, true).translate(808.5, 0, 57), body);

return p.model();
