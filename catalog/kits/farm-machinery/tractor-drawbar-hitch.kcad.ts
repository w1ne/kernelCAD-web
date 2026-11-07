// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly tractor drawbar hitch scene prop, modeled from scratch.
meta({
  name: "tractor-drawbar-hitch",
  license: 'CC0-1.0',
  title: "Tractor drawbar hitch",
  description: "Heavy drawbar with cross pin, stepped support plate and clevis coupling. Knobs: overall scale, body color and accent color.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'prop',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#5d7f75', { label: 'Body color' });
const accent = param('accent', '#c67b39', { label: 'Accent color' });
const p = assembly('tractor-drawbar-hitch');
const groundOffset = 60;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('mounting-frame', box(598.6, 100, 162.4, true).translate(0, 122.4, 141.2), body);
add('crossbar', box(730, 95, 80, true).translate(0, 82.8, 213.6), accent);
add('drawbar-shank', box(150, 342, 90, true).translate(0, -126, 125), body);
add('clevis', box(210, 85, 75, true).translate(0, -273.6, 132.5), accent);
add('hitch-pin', cylinder(110, 27, 8).translate(0, -273.6, 80), body);

return p.model();
