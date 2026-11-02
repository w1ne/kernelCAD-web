// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly asphalt distributor truck scene prop, modeled from scratch.
meta({
  name: "asphalt-distributor-truck",
  license: 'CC0-1.0',
  title: "Asphalt distributor truck",
  description: "Paving tanker truck with insulated tank, rear spray bar and multiple road nozzles. Knobs: overall scale, body color and accent color.",
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
const p = assembly('asphalt-distributor-truck');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('site-truck-chassis', box(1377.6, 358.8, 150, true).translate(0, 0, 215), body);
add('site-truck-wheel-0--1', cylinder(110, 145, 12).rotate([1, 0, 0], 90).translate(-504, -225.8, 145), "#40474b");
add('site-truck-wheel-0--1-hub--1', cylinder(17.6, 55.1, 10).rotate([1, 0, 0], 90).translate(-504, -344.6, 145), accent);
add('site-truck-wheel-0--1-hub-1', cylinder(17.6, 55.1, 10).rotate([1, 0, 0], 90).translate(-504, -217, 145), accent);
add('site-truck-wheel-0-1', cylinder(110, 145, 12).rotate([1, 0, 0], 90).translate(-504, 335.8, 145), "#40474b");
add('site-truck-wheel-0-1-hub--1', cylinder(17.6, 55.1, 10).rotate([1, 0, 0], 90).translate(-504, 217, 145), accent);
add('site-truck-wheel-0-1-hub-1', cylinder(17.6, 55.1, 10).rotate([1, 0, 0], 90).translate(-504, 344.6, 145), accent);
add('site-truck-wheel-1--1', cylinder(110, 160, 12).rotate([1, 0, 0], 90).translate(470.4, -225.8, 160), "#40474b");
add('site-truck-wheel-1--1-hub--1', cylinder(17.6, 60.8, 10).rotate([1, 0, 0], 90).translate(470.4, -344.6, 160), accent);
add('site-truck-wheel-1--1-hub-1', cylinder(17.6, 60.8, 10).rotate([1, 0, 0], 90).translate(470.4, -217, 160), accent);
add('site-truck-wheel-1-1', cylinder(110, 160, 12).rotate([1, 0, 0], 90).translate(470.4, 335.8, 160), "#40474b");
add('site-truck-wheel-1-1-hub--1', cylinder(17.6, 60.8, 10).rotate([1, 0, 0], 90).translate(470.4, 217, 160), accent);
add('site-truck-wheel-1-1-hub-1', cylinder(17.6, 60.8, 10).rotate([1, 0, 0], 90).translate(470.4, 344.6, 160), accent);
add('site-truck-cab', box(420, 312, 504, true).translate(470.4, 0, 542), accent);
add('site-truck-cab-window', box(268.8, 327.6, 120, true).translate(520.8, -15.6, 684), body);
add('site-truck-roof', box(453.6, 335.4, 45, true).translate(470.4, 0, 816.5), body);
add('tank', cylinder(722.4, 210.6, 12).rotate([0, 1, 0], 90).translate(-630, 0, 500), accent);
add('tank-saddle-a', box(70, 483.6, 70, true).translate(-341.04, 0, 325), body);
add('tank-saddle-b', box(70, 483.6, 70, true).translate(-196.56, 0, 325), body);
add('spray-bar', box(60, 1131, 45, true).translate(-806.4, 0, 132.5), body);
add('spray-nozzle-0', cylinder(28, 12, 6).translate(-806.4, -507, 72), accent);
add('spray-nozzle-1', cylinder(28, 12, 6).translate(-806.4, -380.25, 72), accent);
add('spray-nozzle-2', cylinder(28, 12, 6).translate(-806.4, -253.5, 72), accent);
add('spray-nozzle-3', cylinder(28, 12, 6).translate(-806.4, -126.75, 72), accent);
add('spray-nozzle-4', cylinder(28, 12, 6).translate(-806.4, 0, 72), accent);
add('spray-nozzle-5', cylinder(28, 12, 6).translate(-806.4, 126.75, 72), accent);
add('spray-nozzle-6', cylinder(28, 12, 6).translate(-806.4, 253.5, 72), accent);
add('spray-nozzle-7', cylinder(28, 12, 6).translate(-806.4, 380.25, 72), accent);
add('spray-nozzle-8', cylinder(28, 12, 6).translate(-806.4, 507, 72), accent);
add('hose-reel', box(170, 150, 180, true).translate(-84, 241.8, 600), body);

return p.model();
