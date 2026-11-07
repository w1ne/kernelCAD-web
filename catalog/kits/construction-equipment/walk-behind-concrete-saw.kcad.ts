// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly walk-behind concrete saw scene prop, modeled from scratch.
meta({
  name: "walk-behind-concrete-saw",
  license: 'CC0-1.0',
  title: "Walk-behind concrete saw",
  description: "Push saw with guarded cutting blade, compact motor and adjustable handlebar. Knobs: overall scale, body color and accent color.",
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
const p = assembly('walk-behind-concrete-saw');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('saw-wheel-0--1', cylinder(64, 100, 12).rotate([1, 0, 0], 90).translate(-161.2, -119.7, 100), "#40474b");
add('saw-wheel-0--1-hub--1', cylinder(10.24, 38, 10).rotate([1, 0, 0], 90).translate(-161.2, -188.82, 100), accent);
add('saw-wheel-0--1-hub-1', cylinder(10.24, 38, 10).rotate([1, 0, 0], 90).translate(-161.2, -114.58, 100), accent);
add('saw-wheel-0-1', cylinder(64, 100, 12).rotate([1, 0, 0], 90).translate(-161.2, 183.7, 100), "#40474b");
add('saw-wheel-0-1-hub--1', cylinder(10.24, 38, 10).rotate([1, 0, 0], 90).translate(-161.2, 114.58, 100), accent);
add('saw-wheel-0-1-hub-1', cylinder(10.24, 38, 10).rotate([1, 0, 0], 90).translate(-161.2, 188.82, 100), accent);
add('saw-wheel-1--1', cylinder(64, 100, 12).rotate([1, 0, 0], 90).translate(167.4, -119.7, 100), "#40474b");
add('saw-wheel-1--1-hub--1', cylinder(10.24, 38, 10).rotate([1, 0, 0], 90).translate(167.4, -188.82, 100), accent);
add('saw-wheel-1--1-hub-1', cylinder(10.24, 38, 10).rotate([1, 0, 0], 90).translate(167.4, -114.58, 100), accent);
add('saw-wheel-1-1', cylinder(64, 100, 12).rotate([1, 0, 0], 90).translate(167.4, 183.7, 100), "#40474b");
add('saw-wheel-1-1-hub--1', cylinder(10.24, 38, 10).rotate([1, 0, 0], 90).translate(167.4, 114.58, 100), accent);
add('saw-wheel-1-1-hub-1', cylinder(10.24, 38, 10).rotate([1, 0, 0], 90).translate(167.4, 188.82, 100), accent);
add('saw-frame', box(446.4, 300, 100, true).translate(0, 0, 230), body);
add('engine-cover', box(198.4, 240, 217.6, true).translate(74.4, 0, 388.8), accent);
add('blade', cylinder(42, 160, 12).translate(210.8, 0, 95), body);
add('blade-guard', box(100, 260, 192, true).translate(210.8, 0, 196), accent);
add('push-handle', box(55, 60, 268.8, true).translate(-210.8, 0, 414.4), accent);

return p.model();
