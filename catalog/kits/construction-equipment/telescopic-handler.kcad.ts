// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly telescopic handler scene prop, modeled from scratch.
meta({
  name: "telescopic-handler",
  license: 'CC0-1.0',
  title: "Telescopic handler",
  description: "Rough-terrain handler with long extending boom, front carriage and four-wheel chassis. Knobs: overall scale, body color and accent color.",
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
const p = assembly('telescopic-handler');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('handler-wheel-0--1', cylinder(110, 190, 12).rotate([1, 0, 0], 90).translate(-427.8, -193.196, 190), "#40474b");
add('handler-wheel-0--1-hub--1', cylinder(17.6, 72.2, 10).rotate([1, 0, 0], 90).translate(-427.8, -311.996, 190), accent);
add('handler-wheel-0--1-hub-1', cylinder(17.6, 72.2, 10).rotate([1, 0, 0], 90).translate(-427.8, -184.396, 190), accent);
add('handler-wheel-0-1', cylinder(110, 190, 12).rotate([1, 0, 0], 90).translate(-427.8, 303.196, 190), "#40474b");
add('handler-wheel-0-1-hub--1', cylinder(17.6, 72.2, 10).rotate([1, 0, 0], 90).translate(-427.8, 184.396, 190), accent);
add('handler-wheel-0-1-hub-1', cylinder(17.6, 72.2, 10).rotate([1, 0, 0], 90).translate(-427.8, 311.996, 190), accent);
add('handler-wheel-1--1', cylinder(110, 190, 12).rotate([1, 0, 0], 90).translate(427.8, -193.196, 190), "#40474b");
add('handler-wheel-1--1-hub--1', cylinder(17.6, 72.2, 10).rotate([1, 0, 0], 90).translate(427.8, -311.996, 190), accent);
add('handler-wheel-1--1-hub-1', cylinder(17.6, 72.2, 10).rotate([1, 0, 0], 90).translate(427.8, -184.396, 190), accent);
add('handler-wheel-1-1', cylinder(110, 190, 12).rotate([1, 0, 0], 90).translate(427.8, 303.196, 190), "#40474b");
add('handler-wheel-1-1-hub--1', cylinder(17.6, 72.2, 10).rotate([1, 0, 0], 90).translate(427.8, 184.396, 190), accent);
add('handler-wheel-1-1-hub-1', cylinder(17.6, 72.2, 10).rotate([1, 0, 0], 90).translate(427.8, 311.996, 190), accent);
add('chassis', box(993.6, 436.8, 190, true).translate(0, 0, 335), body);
add('cab', box(331.2, 304.2, 520, true).translate(276, -140.4, 690), accent);
add('cab-glazing', box(248.4, 20, 338, true).translate(276, -304.2, 629), body);
add('telescopic-boom', box(966, 100, 120, true).translate(-110.4, 0, 530), accent);
add('inner-boom', box(524.4, 75, 68, true).translate(-538.2, 0, 569), body);
add('boom-carriage', box(100, 280.8, 180, true).translate(-855.6, 0, 560), accent);
add('fork-tine-left', box(270, 38, 42, true).translate(-1048.8, -140.4, 131), body);
add('fork-tine-right', box(270, 38, 42, true).translate(-1048.8, 140.4, 131), body);

return p.model();
