// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly trailer concrete line pump scene prop, modeled from scratch.
meta({
  name: "trailer-concrete-line-pump",
  license: 'CC0-1.0',
  title: "Trailer concrete line pump",
  description: "Towable concrete pump with hopper, motor enclosure, hose connections and road wheels. Knobs: overall scale, body color and accent color.",
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
const p = assembly('trailer-concrete-line-pump');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('trailer-deck', box(735, 546, 100, true).translate(-84, 0, 150), body);
add('trailer-wheel-0--1', cylinder(86, 150, 12).rotate([1, 0, 0], 90).translate(-273, -251, 150), "#40474b");
add('trailer-wheel-0--1-hub--1', cylinder(13.76, 57, 10).rotate([1, 0, 0], 90).translate(-273, -343.88, 150), accent);
add('trailer-wheel-0--1-hub-1', cylinder(13.76, 57, 10).rotate([1, 0, 0], 90).translate(-273, -244.12, 150), accent);
add('trailer-wheel-0-1', cylinder(86, 150, 12).rotate([1, 0, 0], 90).translate(-273, 337, 150), "#40474b");
add('trailer-wheel-0-1-hub--1', cylinder(13.76, 57, 10).rotate([1, 0, 0], 90).translate(-273, 244.12, 150), accent);
add('trailer-wheel-0-1-hub-1', cylinder(13.76, 57, 10).rotate([1, 0, 0], 90).translate(-273, 343.88, 150), accent);
add('trailer-wheel-1--1', cylinder(86, 150, 12).rotate([1, 0, 0], 90).translate(-52.5, -251, 150), "#40474b");
add('trailer-wheel-1--1-hub--1', cylinder(13.76, 57, 10).rotate([1, 0, 0], 90).translate(-52.5, -343.88, 150), accent);
add('trailer-wheel-1--1-hub-1', cylinder(13.76, 57, 10).rotate([1, 0, 0], 90).translate(-52.5, -244.12, 150), accent);
add('trailer-wheel-1-1', cylinder(86, 150, 12).rotate([1, 0, 0], 90).translate(-52.5, 337, 150), "#40474b");
add('trailer-wheel-1-1-hub--1', cylinder(13.76, 57, 10).rotate([1, 0, 0], 90).translate(-52.5, 244.12, 150), accent);
add('trailer-wheel-1-1-hub-1', cylinder(13.76, 57, 10).rotate([1, 0, 0], 90).translate(-52.5, 343.88, 150), accent);
add('drawbar', box(294, 90, 75, true).translate(399, 0, 167.5), accent);
add('loading-ramp--1', box(210, 55, 290, true).translate(-441, -217, 145), accent);
add('loading-ramp-1', box(210, 55, 290, true).translate(-441, 217, 145), accent);
add('pump-enclosure', box(420, 406, 414, true).translate(0, 0, 517), body);
add('hopper', box(231, 420, 210, true).translate(126, 0, 685), accent);
add('hose-connection', cylinder(364, 42, 8).translate(262.5, 0, 420), accent);
add('control-panel', box(170, 35, 150, true).translate(-168, -210, 475), accent);

return p.model();
