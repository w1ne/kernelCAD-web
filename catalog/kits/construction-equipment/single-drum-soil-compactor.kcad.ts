// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly single-drum soil compactor scene prop, modeled from scratch.
meta({
  name: "single-drum-soil-compactor",
  license: 'CC0-1.0',
  title: "Single-drum soil compactor",
  description: "Soil compactor with broad front drum, rear traction tires and enclosed operator cab. Knobs: overall scale, body color and accent color.",
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
const p = assembly('single-drum-soil-compactor');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('roller-frame', box(850, 380, 180, true).translate(75, 0, 320), body);
add('front-drum', cylinder(592.8, 240, 12).rotate([1, 0, 0], 90).translate(425, 296.4, 240), "#657078");
add('front-drum-hub--1', cylinder(94.848, 91.2, 10).rotate([1, 0, 0], 90).translate(425, -343.824, 240), accent);
add('front-drum-hub-1', cylinder(94.848, 91.2, 10).rotate([1, 0, 0], 90).translate(425, 343.824, 240), accent);
add('rear-tire--1', cylinder(100, 155, 12).rotate([1, 0, 0], 90).translate(-400, -86.8, 155), "#40474b");
add('rear-tire--1-hub--1', cylinder(16, 58.9, 10).rotate([1, 0, 0], 90).translate(-400, -194.8, 155), accent);
add('rear-tire--1-hub-1', cylinder(16, 58.9, 10).rotate([1, 0, 0], 90).translate(-400, -78.8, 155), accent);
add('rear-tire-1', cylinder(100, 155, 12).rotate([1, 0, 0], 90).translate(-400, 186.8, 155), "#40474b");
add('rear-tire-1-hub--1', cylinder(16, 58.9, 10).rotate([1, 0, 0], 90).translate(-400, 78.8, 155), accent);
add('rear-tire-1-hub-1', cylinder(16, 58.9, 10).rotate([1, 0, 0], 90).translate(-400, 194.8, 155), accent);
add('engine-cover', box(350, 342, 250, true).translate(200, 0, 535), accent);
add('operator-platform', box(312.5, 288.8, 50, true).translate(-175, 0, 445), body);
add('canopy-posts', box(28, 243.2, 308, true).translate(-212.5, 0, 624), accent);
add('canopy-roof', box(437.5, 334.4, 42, true).translate(-212.5, 0, 799), body);

return p.model();
