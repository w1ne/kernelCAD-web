// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly portable floor grinder scene prop, modeled from scratch.
meta({
  name: "portable-floor-grinder",
  license: 'CC0-1.0',
  title: "Portable floor grinder",
  description: "Concrete surface grinder with circular shroud, handlebar and motor enclosure. Knobs: overall scale, body color and accent color.",
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
const p = assembly('portable-floor-grinder');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('floor-wheel-0--1', cylinder(54, 92, 12).rotate([1, 0, 0], 90).translate(-184.8, -150.6, 92), "#40474b");
add('floor-wheel-0--1-hub--1', cylinder(8.64, 34.96, 10).rotate([1, 0, 0], 90).translate(-184.8, -208.92, 92), accent);
add('floor-wheel-0--1-hub-1', cylinder(8.64, 34.96, 10).rotate([1, 0, 0], 90).translate(-184.8, -146.28, 92), accent);
add('floor-wheel-0-1', cylinder(54, 92, 12).rotate([1, 0, 0], 90).translate(-184.8, 204.6, 92), "#40474b");
add('floor-wheel-0-1-hub--1', cylinder(8.64, 34.96, 10).rotate([1, 0, 0], 90).translate(-184.8, 146.28, 92), accent);
add('floor-wheel-0-1-hub-1', cylinder(8.64, 34.96, 10).rotate([1, 0, 0], 90).translate(-184.8, 208.92, 92), accent);
add('floor-wheel-1--1', cylinder(54, 92, 12).rotate([1, 0, 0], 90).translate(178.2, -150.6, 92), "#40474b");
add('floor-wheel-1--1-hub--1', cylinder(8.64, 34.96, 10).rotate([1, 0, 0], 90).translate(178.2, -208.92, 92), accent);
add('floor-wheel-1--1-hub-1', cylinder(8.64, 34.96, 10).rotate([1, 0, 0], 90).translate(178.2, -146.28, 92), accent);
add('floor-wheel-1-1', cylinder(54, 92, 12).rotate([1, 0, 0], 90).translate(178.2, 204.6, 92), "#40474b");
add('floor-wheel-1-1-hub--1', cylinder(8.64, 34.96, 10).rotate([1, 0, 0], 90).translate(178.2, 146.28, 92), accent);
add('floor-wheel-1-1-hub-1', cylinder(8.64, 34.96, 10).rotate([1, 0, 0], 90).translate(178.2, 208.92, 92), accent);
add('machine-frame', box(462, 336, 120, true).translate(0, 0, 220), body);
add('motor-housing', box(211.2, 252, 281.2, true).translate(79.2, 0, 420.6), accent);
add('handle-post', cylinder(333, 32, 8).translate(-237.6, 0, 280), body);
add('handle-bar', box(250, 40, 40, true).translate(-237.6, 0, 582.4), accent);
add('grinding-head', cylinder(95, 180, 12).translate(0, 0, 100), accent);
add('dust-shroud', box(409.2, 336, 50, true).translate(0, 0, 115), body);

return p.model();
