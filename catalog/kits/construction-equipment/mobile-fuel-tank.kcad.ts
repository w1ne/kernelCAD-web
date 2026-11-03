// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly mobile site fuel tank scene prop, modeled from scratch.
meta({
  name: "mobile-fuel-tank",
  license: 'CC0-1.0',
  title: "Mobile site fuel tank",
  description: "Bunded fuel pod on a towable chassis with hose reel, pump box and filler neck. Knobs: overall scale, body color and accent color.",
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
const p = assembly('mobile-fuel-tank');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('trailer-wheel--1', cylinder(80, 145, 12).rotate([1, 0, 0], 90).translate(-336, -248.8, 145), "#40474b");
add('trailer-wheel--1-hub--1', cylinder(12.8, 55.1, 10).rotate([1, 0, 0], 90).translate(-336, -335.2, 145), accent);
add('trailer-wheel--1-hub-1', cylinder(12.8, 55.1, 10).rotate([1, 0, 0], 90).translate(-336, -242.4, 145), accent);
add('trailer-wheel-1', cylinder(80, 145, 12).rotate([1, 0, 0], 90).translate(-336, 328.8, 145), "#40474b");
add('trailer-wheel-1-hub--1', cylinder(12.8, 55.1, 10).rotate([1, 0, 0], 90).translate(-336, 242.4, 145), accent);
add('trailer-wheel-1-hub-1', cylinder(12.8, 55.1, 10).rotate([1, 0, 0], 90).translate(-336, 335.2, 145), accent);
add('tow-frame', box(582.4, 60, 55, true).translate(336, 0, 122.5), accent);
add('skid-base', box(1008, 653.6, 65, true).translate(0, 0, 32.5), body);
add('bunded-tank', box(806.4, 494, 626.4, true).translate(0, 0, 378.2), accent);
add('outer-containment', box(940.8, 592.8, 712.8, true).translate(0, 0, 421.4), body);
add('pump-box', box(257.6, 85, 180, true).translate(313.6, -319.2, 210), accent);
add('filler-cap', cylinder(64, 38, 8).translate(-268.8, 0, 756), body);

return p.model();
