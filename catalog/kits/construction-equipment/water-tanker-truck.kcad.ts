// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly construction water tanker truck scene prop, modeled from scratch.
meta({
  name: "water-tanker-truck",
  license: 'CC0-1.0',
  title: "Construction water tanker truck",
  description: "Site water truck with cylindrical tank, cab, hose reel and rear spray manifold. Knobs: overall scale, body color and accent color.",
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
const p = assembly('water-tanker-truck');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('site-truck-chassis', box(1295.6, 349.6, 150, true).translate(0, 0, 215), body);
add('site-truck-wheel-0--1', cylinder(110, 145, 12).rotate([1, 0, 0], 90).translate(-474, -218.6, 145), "#40474b");
add('site-truck-wheel-0--1-hub--1', cylinder(17.6, 55.1, 10).rotate([1, 0, 0], 90).translate(-474, -337.4, 145), accent);
add('site-truck-wheel-0--1-hub-1', cylinder(17.6, 55.1, 10).rotate([1, 0, 0], 90).translate(-474, -209.8, 145), accent);
add('site-truck-wheel-0-1', cylinder(110, 145, 12).rotate([1, 0, 0], 90).translate(-474, 328.6, 145), "#40474b");
add('site-truck-wheel-0-1-hub--1', cylinder(17.6, 55.1, 10).rotate([1, 0, 0], 90).translate(-474, 209.8, 145), accent);
add('site-truck-wheel-0-1-hub-1', cylinder(17.6, 55.1, 10).rotate([1, 0, 0], 90).translate(-474, 337.4, 145), accent);
add('site-truck-wheel-1--1', cylinder(110, 160, 12).rotate([1, 0, 0], 90).translate(442.4, -218.6, 160), "#40474b");
add('site-truck-wheel-1--1-hub--1', cylinder(17.6, 60.8, 10).rotate([1, 0, 0], 90).translate(442.4, -337.4, 160), accent);
add('site-truck-wheel-1--1-hub-1', cylinder(17.6, 60.8, 10).rotate([1, 0, 0], 90).translate(442.4, -209.8, 160), accent);
add('site-truck-wheel-1-1', cylinder(110, 160, 12).rotate([1, 0, 0], 90).translate(442.4, 328.6, 160), "#40474b");
add('site-truck-wheel-1-1-hub--1', cylinder(17.6, 60.8, 10).rotate([1, 0, 0], 90).translate(442.4, 209.8, 160), accent);
add('site-truck-wheel-1-1-hub-1', cylinder(17.6, 60.8, 10).rotate([1, 0, 0], 90).translate(442.4, 337.4, 160), accent);
add('site-truck-cab', box(395, 304, 495.6, true).translate(442.4, 0, 537.8), accent);
add('site-truck-cab-window', box(252.8, 319.2, 118, true).translate(489.8, -15.2, 677.6), body);
add('site-truck-roof', box(426.6, 326.8, 45, true).translate(442.4, 0, 808.1), body);
add('tank', cylinder(679.4, 205.2, 12).rotate([0, 1, 0], 90).translate(-592.5, 0, 500), accent);
add('tank-saddle-a', box(70, 471.2, 70, true).translate(-320.74, 0, 325), body);
add('tank-saddle-b', box(70, 471.2, 70, true).translate(-184.86, 0, 325), body);
add('spray-bar', box(60, 1102, 45, true).translate(-758.4, 0, 132.5), body);
add('spray-nozzle-0', cylinder(28, 12, 6).translate(-758.4, -494, 72), accent);
add('spray-nozzle-1', cylinder(28, 12, 6).translate(-758.4, -370.5, 72), accent);
add('spray-nozzle-2', cylinder(28, 12, 6).translate(-758.4, -247, 72), accent);
add('spray-nozzle-3', cylinder(28, 12, 6).translate(-758.4, -123.5, 72), accent);
add('spray-nozzle-4', cylinder(28, 12, 6).translate(-758.4, 0, 72), accent);
add('spray-nozzle-5', cylinder(28, 12, 6).translate(-758.4, 123.5, 72), accent);
add('spray-nozzle-6', cylinder(28, 12, 6).translate(-758.4, 247, 72), accent);
add('spray-nozzle-7', cylinder(28, 12, 6).translate(-758.4, 370.5, 72), accent);
add('spray-nozzle-8', cylinder(28, 12, 6).translate(-758.4, 494, 72), accent);
add('hose-reel', box(170, 150, 180, true).translate(-79, 235.6, 600), body);

return p.model();
