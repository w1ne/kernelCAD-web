// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly wheeled asphalt paver scene prop, modeled from scratch.
meta({
  name: "wheel-asphalt-paver",
  license: 'CC0-1.0',
  title: "Wheeled asphalt paver",
  description: "Rubber-wheel paving machine with front hopper, raised operator station and adjustable rear screed. Knobs: overall scale, body color and accent color.",
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
const p = assembly('wheel-asphalt-paver');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('paver-wheel-0--1', cylinder(85, 145, 12).rotate([1, 0, 0], 90).translate(-406, -230.56, 145), "#40474b");
add('paver-wheel-0--1-hub--1', cylinder(13.6, 55.1, 10).rotate([1, 0, 0], 90).translate(-406, -322.36, 145), accent);
add('paver-wheel-0--1-hub-1', cylinder(13.6, 55.1, 10).rotate([1, 0, 0], 90).translate(-406, -223.76, 145), accent);
add('paver-wheel-0-1', cylinder(85, 145, 12).rotate([1, 0, 0], 90).translate(-406, 315.56, 145), "#40474b");
add('paver-wheel-0-1-hub--1', cylinder(13.6, 55.1, 10).rotate([1, 0, 0], 90).translate(-406, 223.76, 145), accent);
add('paver-wheel-0-1-hub-1', cylinder(13.6, 55.1, 10).rotate([1, 0, 0], 90).translate(-406, 322.36, 145), accent);
add('paver-wheel-1--1', cylinder(85, 145, 12).rotate([1, 0, 0], 90).translate(391.5, -230.56, 145), "#40474b");
add('paver-wheel-1--1-hub--1', cylinder(13.6, 55.1, 10).rotate([1, 0, 0], 90).translate(391.5, -322.36, 145), accent);
add('paver-wheel-1--1-hub-1', cylinder(13.6, 55.1, 10).rotate([1, 0, 0], 90).translate(391.5, -223.76, 145), accent);
add('paver-wheel-1-1', cylinder(85, 145, 12).rotate([1, 0, 0], 90).translate(391.5, 315.56, 145), "#40474b");
add('paver-wheel-1-1-hub--1', cylinder(13.6, 55.1, 10).rotate([1, 0, 0], 90).translate(391.5, 223.76, 145), accent);
add('paver-wheel-1-1-hub-1', cylinder(13.6, 55.1, 10).rotate([1, 0, 0], 90).translate(391.5, 322.36, 145), accent);
add('main-deck', box(1044, 522, 230, true).translate(0, 0, 335), body);
add('material-hopper', box(348, 648, 360, true).translate(493, 0, 480), accent);
add('hopper-wing-left', box(290, 72, 340, true).translate(493, -306, 480), body);
add('hopper-wing-right', box(290, 72, 340, true).translate(493, 306, 480), body);
add('operator-platform', box(362.5, 378, 50, true).translate(-188.5, 0, 475), accent);
add('canopy-posts', box(32, 315, 294.4, true).translate(-174, 0, 647.2), body);
add('canopy-roof', box(609, 495, 50, true).translate(-174, 0, 819.4), accent);
add('feeder-deck', box(493, 378, 85, true).translate(-536.5, 0, 192.5), body);
add('screed-main', box(68, 828, 120, true).translate(-696, 0, 125), accent);
add('screed-wing--1', box(70, 162, 95, true).translate(-696, -468, 127.5), body);
add('screed-arm--1', box(391.5, 35, 38, true).translate(-464, -306, 199), accent);
add('screed-wing-1', box(70, 162, 95, true).translate(-696, 468, 127.5), body);
add('screed-arm-1', box(391.5, 35, 38, true).translate(-464, 306, 199), accent);
add('feed-auger', cylinder(558, 48, 10).translate(-391.5, 0, 180), body);

return p.model();
