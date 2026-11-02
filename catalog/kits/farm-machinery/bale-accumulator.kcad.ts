// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly bale accumulator scene prop, modeled from scratch.
meta({
  name: "bale-accumulator",
  license: 'CC0-1.0',
  title: "Bale accumulator",
  description: "Rear bale accumulator with twin collection decks, guide rails and discharge gate. Knobs: overall scale, body color and accent color.",
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
const p = assembly('bale-accumulator');
const groundOffset = 130;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('hay-frame', box(1596, 85, 78, true).translate(0, 168, 522), accent);
add('drawbar', box(95, 1050, 56, true).translate(0, 903, 603), body);
add('collection-deck-0', box(1558, 798, 36, true).translate(0, -462, 148), body);
add('collection-deck-1', box(1558, 798, 36, true).translate(0, 420, 428), body);
add('guide-rail--1', box(42, 1806, 782, true).translate(-798, 0, 908.5), accent);
add('guide-rail-1', box(42, 1806, 782, true).translate(798, 0, 908.5), accent);
add('discharge-gate', box(1330, 40, 240, true).translate(0, -945, 752.5), body);

return p.model();
