// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly irrigation hose reel scene prop, modeled from scratch.
meta({
  name: "irrigation-hose-reel",
  license: 'CC0-1.0',
  title: "Irrigation hose reel",
  description: "Towable irrigation hose reel with wide spool, support frame, crank and wheeled axle. Knobs: overall scale, body color and accent color.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'structure',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#5d7f75', { label: 'Body color' });
const accent = param('accent', '#c67b39', { label: 'Accent color' });
const p = assembly('irrigation-hose-reel');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('reel-frame', box(1250, 1900, 70, true).translate(0, 0, 35), accent);
add('reel-side-a', box(1100, 80, 1332, true).translate(0, -608, 1628), body);
add('reel-side-b', box(1100, 80, 1332, true).translate(0, 608, 1628), body);
add('reel-drum', cylinder(1258, 400, 12).translate(0, 0, 333), accent);
add('reel-wheel--1', cylinder(70, 120, 12).rotate([0, 1, 0], 90).translate(-35, -912, 120), "#414848");
add('reel-wheel--1-hub', cylinder(77, 40.8, 10).translate(-38.5, -912, 120), accent);
add('reel-wheel-1', cylinder(70, 120, 12).rotate([0, 1, 0], 90).translate(-35, 912, 120), "#414848");
add('reel-wheel-1-hub', cylinder(77, 40.8, 10).translate(-38.5, 912, 120), accent);
add('crank-handle', box(180, 40, 36, true).translate(637.5, 0, 943), accent);

return p.model();
