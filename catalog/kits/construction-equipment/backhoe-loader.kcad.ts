// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly backhoe loader scene prop, modeled from scratch.
meta({
  name: "backhoe-loader",
  license: 'CC0-1.0',
  title: "Backhoe loader",
  description: "Site loader with front bucket, rear digging boom, stabilizer legs and operator cab. Knobs: overall scale, body color and accent color.",
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
const p = assembly('backhoe-loader');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('backhoe-wheel-0--1', cylinder(105, 195, 12).rotate([1, 0, 0], 90).translate(-449.5, -184.152, 195), "#40474b");
add('backhoe-wheel-0--1-hub--1', cylinder(16.8, 74.1, 10).rotate([1, 0, 0], 90).translate(-449.5, -297.552, 195), accent);
add('backhoe-wheel-0--1-hub-1', cylinder(16.8, 74.1, 10).rotate([1, 0, 0], 90).translate(-449.5, -175.752, 195), accent);
add('backhoe-wheel-0-1', cylinder(105, 195, 12).rotate([1, 0, 0], 90).translate(-449.5, 289.152, 195), "#40474b");
add('backhoe-wheel-0-1-hub--1', cylinder(16.8, 74.1, 10).rotate([1, 0, 0], 90).translate(-449.5, 175.752, 195), accent);
add('backhoe-wheel-0-1-hub-1', cylinder(16.8, 74.1, 10).rotate([1, 0, 0], 90).translate(-449.5, 297.552, 195), accent);
add('backhoe-wheel-1--1', cylinder(105, 195, 12).rotate([1, 0, 0], 90).translate(420.5, -184.152, 195), "#40474b");
add('backhoe-wheel-1--1-hub--1', cylinder(16.8, 74.1, 10).rotate([1, 0, 0], 90).translate(420.5, -297.552, 195), accent);
add('backhoe-wheel-1--1-hub-1', cylinder(16.8, 74.1, 10).rotate([1, 0, 0], 90).translate(420.5, -175.752, 195), accent);
add('backhoe-wheel-1-1', cylinder(105, 195, 12).rotate([1, 0, 0], 90).translate(420.5, 289.152, 195), "#40474b");
add('backhoe-wheel-1-1-hub--1', cylinder(16.8, 74.1, 10).rotate([1, 0, 0], 90).translate(420.5, 175.752, 195), accent);
add('backhoe-wheel-1-1-hub-1', cylinder(16.8, 74.1, 10).rotate([1, 0, 0], 90).translate(420.5, 297.552, 195), accent);
add('chassis', box(1044, 413.4, 170, true).translate(0, 0, 325), body);
add('front-loader-arm', box(493, 54, 70, true).translate(551, -241.8, 455), accent);
add('front-loader-arm-right', box(493, 54, 70, true).translate(551, 241.8, 455), accent);
add('front-bucket', box(120, 608.4, 220, true).translate(913.5, 0, 300), body);
add('cab', box(391.5, 343.2, 504, true).translate(0, 0, 662), accent);
add('cab-roof', box(449.5, 374.4, 44, true).translate(0, 0, 936), body);
add('stabilizer--1', box(48, 55, 300, true).translate(-551, -288.6, 150), accent);
add('stabilizer-foot--1', box(150, 120, 35, true).translate(-551, -288.6, 17.5), body);
add('stabilizer-1', box(48, 55, 300, true).translate(-551, 288.6, 150), accent);
add('stabilizer-foot-1', box(150, 120, 35, true).translate(-551, 288.6, 17.5), body);
add('rear-boom', box(406, 90, 95, true).translate(-623.5, 0, 667.5), accent);
add('dipper', box(65, 75, 410, true).translate(-797.5, 0, 595), body);
add('digging-bucket', box(150, 190, 145, true).translate(-957, 0, 192.5), accent);

return p.model();
