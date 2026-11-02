// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly fertilizer spreader scene prop, modeled from scratch.
meta({
  name: "fertilizer-spreader",
  license: 'CC0-1.0',
  title: "Fertilizer spreader",
  description: "Tractor-mounted fertilizer hopper with twin spinner discs, guard frame and support feet. Knobs: overall scale, body color and accent color.",
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
const p = assembly('fertilizer-spreader');
const groundOffset = 35;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('spreader-frame', box(722.5, 554.8, 76, true).translate(0, 0, 73), accent);
add('fertilizer-hopper', box(680, 554.8, 714, true).translate(0, 0, 924), body);
add('hopper-lid', box(748, 598.6, 38, true).translate(0, 0, 953.5), accent);
add('spinner--1', cylinder(35, 135, 10).translate(-187, -306.6, 80), accent);
add('spinner-vane--1', box(210, 24, 15, true).translate(-187, -306.6, 132.5), body);
add('spinner-1', cylinder(35, 135, 10).translate(187, -306.6, 80), accent);
add('spinner-vane-1', box(210, 24, 15, true).translate(187, -306.6, 132.5), body);
add('mounting-tower', box(289, 85, 567, true).translate(0, 328.5, 682.5), accent);

return p.model();
