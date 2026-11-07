// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly ride-on power trowel scene prop, modeled from scratch.
meta({
  name: "ride-on-power-trowel",
  license: 'CC0-1.0',
  title: "Ride-on power trowel",
  description: "Concrete finishing machine with twin guarded rotor pans, seat and control console. Knobs: overall scale, body color and accent color.",
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
const p = assembly('ride-on-power-trowel');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('operator-platform', box(680, 504, 85, true).translate(0, 0, 202.5), body);
add('rotor-guard--1', cylinder(72, 230, 12).translate(-238, 0, 0), accent);
add('rotor-guard-1', cylinder(72, 230, 12).translate(238, 0, 0), accent);
add('seat-post', box(58, 58, 230, true).translate(-68, 0, 360), accent);
add('seat', box(180, 160, 70, true).translate(-68, 0, 510), body);
add('control-console', box(200, 180, 125, true).translate(170, 0, 337.5), accent);

return p.model();
