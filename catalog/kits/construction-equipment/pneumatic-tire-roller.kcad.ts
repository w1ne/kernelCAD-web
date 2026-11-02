// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly pneumatic tire roller scene prop, modeled from scratch.
meta({
  name: "pneumatic-tire-roller",
  license: 'CC0-1.0',
  title: "Pneumatic tire roller",
  description: "Road compactor with staggered banks of rubber tires and a raised operator station. Knobs: overall scale, body color and accent color.",
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
const p = assembly('pneumatic-tire-roller');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('roller-frame', box(918, 425, 180, true).translate(81, 0, 320), body);
add('pneumatic-tire-0--1', cylinder(90, 165, 12).rotate([1, 0, 0], 90).translate(-472.5, -252.5, 165), "#40474b");
add('pneumatic-tire-0--1-hub--1', cylinder(14.4, 62.7, 10).rotate([1, 0, 0], 90).translate(-472.5, -349.7, 165), accent);
add('pneumatic-tire-0--1-hub-1', cylinder(14.4, 62.7, 10).rotate([1, 0, 0], 90).translate(-472.5, -245.3, 165), accent);
add('pneumatic-tire-0-1', cylinder(90, 165, 12).rotate([1, 0, 0], 90).translate(-472.5, 342.5, 165), "#40474b");
add('pneumatic-tire-0-1-hub--1', cylinder(14.4, 62.7, 10).rotate([1, 0, 0], 90).translate(-472.5, 245.3, 165), accent);
add('pneumatic-tire-0-1-hub-1', cylinder(14.4, 62.7, 10).rotate([1, 0, 0], 90).translate(-472.5, 349.7, 165), accent);
add('pneumatic-tire-1--1', cylinder(90, 165, 12).rotate([1, 0, 0], 90).translate(-162, -252.5, 165), "#40474b");
add('pneumatic-tire-1--1-hub--1', cylinder(14.4, 62.7, 10).rotate([1, 0, 0], 90).translate(-162, -349.7, 165), accent);
add('pneumatic-tire-1--1-hub-1', cylinder(14.4, 62.7, 10).rotate([1, 0, 0], 90).translate(-162, -245.3, 165), accent);
add('pneumatic-tire-1-1', cylinder(90, 165, 12).rotate([1, 0, 0], 90).translate(-162, 342.5, 165), "#40474b");
add('pneumatic-tire-1-1-hub--1', cylinder(14.4, 62.7, 10).rotate([1, 0, 0], 90).translate(-162, 245.3, 165), accent);
add('pneumatic-tire-1-1-hub-1', cylinder(14.4, 62.7, 10).rotate([1, 0, 0], 90).translate(-162, 349.7, 165), accent);
add('pneumatic-tire-2--1', cylinder(90, 165, 12).rotate([1, 0, 0], 90).translate(162, -252.5, 165), "#40474b");
add('pneumatic-tire-2--1-hub--1', cylinder(14.4, 62.7, 10).rotate([1, 0, 0], 90).translate(162, -349.7, 165), accent);
add('pneumatic-tire-2--1-hub-1', cylinder(14.4, 62.7, 10).rotate([1, 0, 0], 90).translate(162, -245.3, 165), accent);
add('pneumatic-tire-2-1', cylinder(90, 165, 12).rotate([1, 0, 0], 90).translate(162, 342.5, 165), "#40474b");
add('pneumatic-tire-2-1-hub--1', cylinder(14.4, 62.7, 10).rotate([1, 0, 0], 90).translate(162, 245.3, 165), accent);
add('pneumatic-tire-2-1-hub-1', cylinder(14.4, 62.7, 10).rotate([1, 0, 0], 90).translate(162, 349.7, 165), accent);
add('pneumatic-tire-3--1', cylinder(90, 165, 12).rotate([1, 0, 0], 90).translate(472.5, -252.5, 165), "#40474b");
add('pneumatic-tire-3--1-hub--1', cylinder(14.4, 62.7, 10).rotate([1, 0, 0], 90).translate(472.5, -349.7, 165), accent);
add('pneumatic-tire-3--1-hub-1', cylinder(14.4, 62.7, 10).rotate([1, 0, 0], 90).translate(472.5, -245.3, 165), accent);
add('pneumatic-tire-3-1', cylinder(90, 165, 12).rotate([1, 0, 0], 90).translate(472.5, 342.5, 165), "#40474b");
add('pneumatic-tire-3-1-hub--1', cylinder(14.4, 62.7, 10).rotate([1, 0, 0], 90).translate(472.5, 245.3, 165), accent);
add('pneumatic-tire-3-1-hub-1', cylinder(14.4, 62.7, 10).rotate([1, 0, 0], 90).translate(472.5, 349.7, 165), accent);
add('engine-cover', box(378, 382.5, 250, true).translate(216, 0, 535), accent);
add('operator-platform', box(337.5, 323, 50, true).translate(-189, 0, 445), body);
add('canopy-posts', box(28, 272, 252, true).translate(-229.5, 0, 596), accent);
add('canopy-roof', box(472.5, 374, 42, true).translate(-229.5, 0, 743), body);

return p.model();
