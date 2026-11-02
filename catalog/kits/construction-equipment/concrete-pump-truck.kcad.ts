// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly concrete pump truck scene prop, modeled from scratch.
meta({
  name: "concrete-pump-truck",
  license: 'CC0-1.0',
  title: "Concrete pump truck",
  description: "Concrete placing truck with hopper, multi-section boom, outriggers and delivery hose. Knobs: overall scale, body color and accent color.",
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
const p = assembly('concrete-pump-truck');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('pump-chassis', box(1476, 377.2, 150, true).translate(0, 0, 215), body);
add('pump-wheel-0--1', cylinder(110, 145, 12).rotate([1, 0, 0], 90).translate(-540, -240.2, 145), "#40474b");
add('pump-wheel-0--1-hub--1', cylinder(17.6, 55.1, 10).rotate([1, 0, 0], 90).translate(-540, -359, 145), accent);
add('pump-wheel-0--1-hub-1', cylinder(17.6, 55.1, 10).rotate([1, 0, 0], 90).translate(-540, -231.4, 145), accent);
add('pump-wheel-0-1', cylinder(110, 145, 12).rotate([1, 0, 0], 90).translate(-540, 350.2, 145), "#40474b");
add('pump-wheel-0-1-hub--1', cylinder(17.6, 55.1, 10).rotate([1, 0, 0], 90).translate(-540, 231.4, 145), accent);
add('pump-wheel-0-1-hub-1', cylinder(17.6, 55.1, 10).rotate([1, 0, 0], 90).translate(-540, 359, 145), accent);
add('pump-wheel-1--1', cylinder(110, 160, 12).rotate([1, 0, 0], 90).translate(504, -240.2, 160), "#40474b");
add('pump-wheel-1--1-hub--1', cylinder(17.6, 60.8, 10).rotate([1, 0, 0], 90).translate(504, -359, 160), accent);
add('pump-wheel-1--1-hub-1', cylinder(17.6, 60.8, 10).rotate([1, 0, 0], 90).translate(504, -231.4, 160), accent);
add('pump-wheel-1-1', cylinder(110, 160, 12).rotate([1, 0, 0], 90).translate(504, 350.2, 160), "#40474b");
add('pump-wheel-1-1-hub--1', cylinder(17.6, 60.8, 10).rotate([1, 0, 0], 90).translate(504, 231.4, 160), accent);
add('pump-wheel-1-1-hub-1', cylinder(17.6, 60.8, 10).rotate([1, 0, 0], 90).translate(504, 359, 160), accent);
add('pump-cab', box(450, 328, 651, true).translate(504, 0, 615.5), accent);
add('pump-cab-window', box(288, 344.4, 155, true).translate(558, -16.4, 796), body);
add('pump-roof', box(486, 352.6, 45, true).translate(504, 0, 963.5), body);
add('pump-hopper', box(324, 377.2, 300, true).translate(-450, 0, 430), accent);
add('outrigger-beam--1', box(150, 672.4, 60, true).translate(-234, -237.8, 170), body);
add('outrigger-column--1', box(75, 75, 145, true).translate(-234, -459.2, 107.5), body);
add('outrigger-foot--1', box(160, 150, 35, true).translate(-234, -459.2, 17.5), accent);
add('outrigger-beam-1', box(150, 672.4, 60, true).translate(-234, 237.8, 170), body);
add('outrigger-column-1', box(75, 75, 145, true).translate(-234, 459.2, 107.5), body);
add('outrigger-foot-1', box(160, 150, 35, true).translate(-234, 459.2, 17.5), accent);
add('boom-base', box(130, 125, 420, true).translate(-162, 0, 500), body);
add('boom-section-a', box(648, 88, 92, true).rotate([0, 1, 0], 35).translate(-414, 0, 850), accent);
add('boom-section-b', box(504, 76, 78, true).rotate([0, 1, 0], 35).translate(-918, 0, 1180), body);
add('delivery-hose', box(48, 48, 1350, true).translate(-1116, 0, 675), accent);

return p.model();
