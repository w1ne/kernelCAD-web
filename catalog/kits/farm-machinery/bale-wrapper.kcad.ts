// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly bale wrapper scene prop, modeled from scratch.
meta({
  name: "bale-wrapper",
  license: 'CC0-1.0',
  title: "Bale wrapper",
  description: "Trailed bale wrapper with circular cradle rollers, film mast and support wheels. Knobs: overall scale, body color and accent color.",
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
const p = assembly('bale-wrapper');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('hay-frame', box(991.2, 85, 78, true).translate(0, 140, 501), accent);
add('drawbar', box(95, 875, 56, true).translate(0, 752.5, 578), body);
add('roller-0', cylinder(638, 95, 10).translate(-259.6, 0, 70), body);
add('roller-1', cylinder(638, 95, 10).translate(259.6, 0, 70), body);
add('film-mast', box(44, 44, 1100, true).translate(472, 0, 550), accent);
add('film-roll', box(95, 180, 260, true).translate(472, 0, 834), body);

return p.model();
