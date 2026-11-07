// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly tractor ballast weight scene prop, modeled from scratch.
meta({
  name: "tractor-ballast-weight",
  license: 'CC0-1.0',
  title: "Tractor ballast weight",
  description: "Rear-mounted counterweight block with mounting frame and raised lifting loop. Knobs: overall scale, body color and accent color.",
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
const p = assembly('tractor-ballast-weight');
const groundOffset = 60;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('mounting-frame', box(508.4, 100, 266.8, true).translate(0, 142.8, 193.4), body);
add('crossbar', box(620, 95, 80, true).translate(0, 96.6, 325.2), accent);
add('weight-block', box(620, 319.2, 331.2, true).translate(0, 0, 245.6), accent);
add('mounting-lugs', box(310, 110, 276, true).translate(0, 201.6, 423.2), body);
add('lift-loop', box(198.4, 75, 46, true).translate(0, 0, 400.2), body);

return p.model();
