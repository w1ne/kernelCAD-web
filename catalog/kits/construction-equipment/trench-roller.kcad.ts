// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly remote trench roller scene prop, modeled from scratch.
meta({
  name: "trench-roller",
  license: 'CC0-1.0',
  title: "Remote trench roller",
  description: "Compact trench compactor with paired steel drums and a protected remote-control mast. Knobs: overall scale, body color and accent color.",
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
const p = assembly('trench-roller');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('roller-frame', box(462.4, 260, 180, true).translate(40.8, 0, 320), body);
add('front-drum', cylinder(395.2, 110, 12).rotate([1, 0, 0], 90).translate(231.2, 197.6, 110), "#657078");
add('front-drum-hub--1', cylinder(63.232, 41.8, 10).rotate([1, 0, 0], 90).translate(231.2, -229.216, 110), accent);
add('front-drum-hub-1', cylinder(63.232, 41.8, 10).rotate([1, 0, 0], 90).translate(231.2, 229.216, 110), accent);
add('rear-drum', cylinder(395.2, 110, 12).rotate([1, 0, 0], 90).translate(-217.6, 197.6, 110), "#657078");
add('rear-drum-hub--1', cylinder(63.232, 41.8, 10).rotate([1, 0, 0], 90).translate(-217.6, -229.216, 110), accent);
add('rear-drum-hub-1', cylinder(63.232, 41.8, 10).rotate([1, 0, 0], 90).translate(-217.6, 229.216, 110), accent);
add('engine-cover', box(190.4, 234, 250, true).translate(108.8, 0, 535), accent);
add('remote-control-mast', box(32, 35, 190, true).translate(0, 0, 505), accent);

return p.model();
