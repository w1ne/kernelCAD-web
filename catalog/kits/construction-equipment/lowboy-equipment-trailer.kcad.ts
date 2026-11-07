// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly lowboy equipment trailer scene prop, modeled from scratch.
meta({
  name: "lowboy-equipment-trailer",
  license: 'CC0-1.0',
  title: "Lowboy equipment trailer",
  description: "Heavy equipment trailer with a dropped deck, twin axle groups and loading ramps. Knobs: overall scale, body color and accent color.",
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
const p = assembly('lowboy-equipment-trailer');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('trailer-deck', box(1295, 639.6, 100, true).translate(-148, 0, 150), body);
add('trailer-wheel-0--1', cylinder(86, 150, 12).rotate([1, 0, 0], 90).translate(-481, -301.4, 150), "#40474b");
add('trailer-wheel-0--1-hub--1', cylinder(13.76, 57, 10).rotate([1, 0, 0], 90).translate(-481, -394.28, 150), accent);
add('trailer-wheel-0--1-hub-1', cylinder(13.76, 57, 10).rotate([1, 0, 0], 90).translate(-481, -294.52, 150), accent);
add('trailer-wheel-0-1', cylinder(86, 150, 12).rotate([1, 0, 0], 90).translate(-481, 387.4, 150), "#40474b");
add('trailer-wheel-0-1-hub--1', cylinder(13.76, 57, 10).rotate([1, 0, 0], 90).translate(-481, 294.52, 150), accent);
add('trailer-wheel-0-1-hub-1', cylinder(13.76, 57, 10).rotate([1, 0, 0], 90).translate(-481, 394.28, 150), accent);
add('trailer-wheel-1--1', cylinder(86, 150, 12).rotate([1, 0, 0], 90).translate(-92.5, -301.4, 150), "#40474b");
add('trailer-wheel-1--1-hub--1', cylinder(13.76, 57, 10).rotate([1, 0, 0], 90).translate(-92.5, -394.28, 150), accent);
add('trailer-wheel-1--1-hub-1', cylinder(13.76, 57, 10).rotate([1, 0, 0], 90).translate(-92.5, -294.52, 150), accent);
add('trailer-wheel-1-1', cylinder(86, 150, 12).rotate([1, 0, 0], 90).translate(-92.5, 387.4, 150), "#40474b");
add('trailer-wheel-1-1-hub--1', cylinder(13.76, 57, 10).rotate([1, 0, 0], 90).translate(-92.5, 294.52, 150), accent);
add('trailer-wheel-1-1-hub-1', cylinder(13.76, 57, 10).rotate([1, 0, 0], 90).translate(-92.5, 394.28, 150), accent);
add('drawbar', box(518, 90, 75, true).translate(703, 0, 167.5), accent);
add('loading-ramp--1', box(370, 55, 290, true).translate(-777, -254.2, 145), accent);
add('loading-ramp-1', box(370, 55, 290, true).translate(-777, 254.2, 145), accent);

return p.model();
