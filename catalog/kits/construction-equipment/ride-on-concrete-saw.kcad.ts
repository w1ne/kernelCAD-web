// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly ride-on concrete saw scene prop, modeled from scratch.
meta({
  name: "ride-on-concrete-saw",
  license: 'CC0-1.0',
  title: "Ride-on concrete saw",
  description: "Self-propelled slab saw with operator seat, blade guard and water tank. Knobs: overall scale, body color and accent color.",
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
const p = assembly('ride-on-concrete-saw');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('saw-wheel-0--1', cylinder(64, 100, 12).rotate([1, 0, 0], 90).translate(-273, -180.38, 100), "#40474b");
add('saw-wheel-0--1-hub--1', cylinder(10.24, 38, 10).rotate([1, 0, 0], 90).translate(-273, -249.5, 100), accent);
add('saw-wheel-0--1-hub-1', cylinder(10.24, 38, 10).rotate([1, 0, 0], 90).translate(-273, -175.26, 100), accent);
add('saw-wheel-0-1', cylinder(64, 100, 12).rotate([1, 0, 0], 90).translate(-273, 244.38, 100), "#40474b");
add('saw-wheel-0-1-hub--1', cylinder(10.24, 38, 10).rotate([1, 0, 0], 90).translate(-273, 175.26, 100), accent);
add('saw-wheel-0-1-hub-1', cylinder(10.24, 38, 10).rotate([1, 0, 0], 90).translate(-273, 249.5, 100), accent);
add('saw-wheel-1--1', cylinder(64, 100, 12).rotate([1, 0, 0], 90).translate(283.5, -180.38, 100), "#40474b");
add('saw-wheel-1--1-hub--1', cylinder(10.24, 38, 10).rotate([1, 0, 0], 90).translate(283.5, -249.5, 100), accent);
add('saw-wheel-1--1-hub-1', cylinder(10.24, 38, 10).rotate([1, 0, 0], 90).translate(283.5, -175.26, 100), accent);
add('saw-wheel-1-1', cylinder(64, 100, 12).rotate([1, 0, 0], 90).translate(283.5, 244.38, 100), "#40474b");
add('saw-wheel-1-1-hub--1', cylinder(10.24, 38, 10).rotate([1, 0, 0], 90).translate(283.5, 175.26, 100), accent);
add('saw-wheel-1-1-hub-1', cylinder(10.24, 38, 10).rotate([1, 0, 0], 90).translate(283.5, 249.5, 100), accent);
add('saw-frame', box(756, 420, 100, true).translate(0, 0, 230), body);
add('engine-cover', box(336, 336, 278.8, true).translate(126, 0, 419.4), accent);
add('blade', cylinder(42, 205, 12).translate(357, 0, 95), body);
add('blade-guard', box(100, 364, 246, true).translate(357, 0, 223), accent);
add('operator-seat', box(180, 170, 90, true).translate(-210, 0, 335), accent);
add('water-tank', box(190, 252, 130, true).translate(-126, 0, 435), body);

return p.model();
