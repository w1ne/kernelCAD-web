// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly tandem vibratory roller scene prop, modeled from scratch.
meta({
  name: "tandem-vibratory-roller",
  license: 'CC0-1.0',
  title: "Tandem vibratory roller",
  description: "Compaction roller with front and rear steel drums, operator canopy and central chassis. Knobs: overall scale, body color and accent color.",
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
const p = assembly('tandem-vibratory-roller');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('roller-frame', box(714, 350, 180, true).translate(63, 0, 320), body);
add('front-drum', cylinder(532, 180, 12).rotate([1, 0, 0], 90).translate(357, 266, 180), "#657078");
add('front-drum-hub--1', cylinder(85.12, 68.4, 10).rotate([1, 0, 0], 90).translate(357, -308.56, 180), accent);
add('front-drum-hub-1', cylinder(85.12, 68.4, 10).rotate([1, 0, 0], 90).translate(357, 308.56, 180), accent);
add('rear-drum', cylinder(532, 180, 12).rotate([1, 0, 0], 90).translate(-336, 266, 180), "#657078");
add('rear-drum-hub--1', cylinder(85.12, 68.4, 10).rotate([1, 0, 0], 90).translate(-336, -308.56, 180), accent);
add('rear-drum-hub-1', cylinder(85.12, 68.4, 10).rotate([1, 0, 0], 90).translate(-336, 308.56, 180), accent);
add('engine-cover', box(294, 315, 250, true).translate(168, 0, 535), accent);
add('operator-platform', box(262.5, 266, 50, true).translate(-147, 0, 445), body);
add('canopy-posts', box(28, 224, 252, true).translate(-178.5, 0, 596), accent);
add('canopy-roof', box(367.5, 308, 42, true).translate(-178.5, 0, 743), body);

return p.model();
