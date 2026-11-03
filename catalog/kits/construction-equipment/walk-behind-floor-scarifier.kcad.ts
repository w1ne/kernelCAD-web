// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly walk-behind floor scarifier scene prop, modeled from scratch.
meta({
  name: "walk-behind-floor-scarifier",
  license: 'CC0-1.0',
  title: "Walk-behind floor scarifier",
  description: "Surface-preparation machine with guarded drum, wheeled frame and push handle. Knobs: overall scale, body color and accent color.",
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
const p = assembly('walk-behind-floor-scarifier');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('floor-wheel-0--1', cylinder(54, 92, 12).rotate([1, 0, 0], 90).translate(-196, -156.52, 92), "#40474b");
add('floor-wheel-0--1-hub--1', cylinder(8.64, 34.96, 10).rotate([1, 0, 0], 90).translate(-196, -214.84, 92), accent);
add('floor-wheel-0--1-hub-1', cylinder(8.64, 34.96, 10).rotate([1, 0, 0], 90).translate(-196, -152.2, 92), accent);
add('floor-wheel-0-1', cylinder(54, 92, 12).rotate([1, 0, 0], 90).translate(-196, 210.52, 92), "#40474b");
add('floor-wheel-0-1-hub--1', cylinder(8.64, 34.96, 10).rotate([1, 0, 0], 90).translate(-196, 152.2, 92), accent);
add('floor-wheel-0-1-hub-1', cylinder(8.64, 34.96, 10).rotate([1, 0, 0], 90).translate(-196, 214.84, 92), accent);
add('floor-wheel-1--1', cylinder(54, 92, 12).rotate([1, 0, 0], 90).translate(189, -156.52, 92), "#40474b");
add('floor-wheel-1--1-hub--1', cylinder(8.64, 34.96, 10).rotate([1, 0, 0], 90).translate(189, -214.84, 92), accent);
add('floor-wheel-1--1-hub-1', cylinder(8.64, 34.96, 10).rotate([1, 0, 0], 90).translate(189, -152.2, 92), accent);
add('floor-wheel-1-1', cylinder(54, 92, 12).rotate([1, 0, 0], 90).translate(189, 210.52, 92), "#40474b");
add('floor-wheel-1-1-hub--1', cylinder(8.64, 34.96, 10).rotate([1, 0, 0], 90).translate(189, 152.2, 92), accent);
add('floor-wheel-1-1-hub-1', cylinder(8.64, 34.96, 10).rotate([1, 0, 0], 90).translate(189, 214.84, 92), accent);
add('machine-frame', box(490, 347.2, 120, true).translate(0, 0, 220), body);
add('motor-housing', box(224, 260.4, 296.4, true).translate(84, 0, 428.2), accent);
add('handle-post', cylinder(351, 32, 8).translate(-252, 0, 280), body);
add('handle-bar', box(250, 40, 40, true).translate(-252, 0, 612.8), accent);
add('scarifier-hood', box(280, 384.4, 110, true).translate(140, 0, 155), accent);
add('cutting-drum', cylinder(310, 80, 10).rotate([1, 0, 0], 90).translate(140, 155, 150), body);

return p.model();
