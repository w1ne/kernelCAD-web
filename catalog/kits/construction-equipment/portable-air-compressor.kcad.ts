// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly portable site air compressor scene prop, modeled from scratch.
meta({
  name: "portable-air-compressor",
  license: 'CC0-1.0',
  title: "Portable site air compressor",
  description: "Towable compressor enclosure with access panels, hose ports and single axle. Knobs: overall scale, body color and accent color.",
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
const p = assembly('portable-air-compressor');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('trailer-wheel--1', cylinder(80, 145, 12).rotate([1, 0, 0], 90).translate(-315, -256.4, 145), "#40474b");
add('trailer-wheel--1-hub--1', cylinder(12.8, 55.1, 10).rotate([1, 0, 0], 90).translate(-315, -342.8, 145), accent);
add('trailer-wheel--1-hub-1', cylinder(12.8, 55.1, 10).rotate([1, 0, 0], 90).translate(-315, -250, 145), accent);
add('trailer-wheel-1', cylinder(80, 145, 12).rotate([1, 0, 0], 90).translate(-315, 336.4, 145), "#40474b");
add('trailer-wheel-1-hub--1', cylinder(12.8, 55.1, 10).rotate([1, 0, 0], 90).translate(-315, 250, 145), accent);
add('trailer-wheel-1-hub-1', cylinder(12.8, 55.1, 10).rotate([1, 0, 0], 90).translate(-315, 342.8, 145), accent);
add('tow-frame', box(546, 60, 55, true).translate(315, 0, 122.5), accent);
add('skid-base', box(945, 670.8, 65, true).translate(0, 0, 32.5), body);
add('compressor-enclosure', box(735, 530.4, 589, true).translate(-42, 0, 359.5), accent);
add('vent-0', box(18, 18, 304, true).translate(-126, -273, 332), body);
add('vent-1', box(18, 18, 304, true).translate(-90, -273, 332), body);
add('vent-2', box(18, 18, 304, true).translate(-54, -273, 332), body);
add('vent-3', box(18, 18, 304, true).translate(-18, -273, 332), body);
add('vent-4', box(18, 18, 304, true).translate(18, -273, 332), body);
add('hose-reel', cylinder(95, 155, 10).translate(357, 0, 220), body);

return p.model();
