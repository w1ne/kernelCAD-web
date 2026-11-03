// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly tractor box blade scene prop, modeled from scratch.
meta({
  name: "tractor-box-blade",
  license: 'CC0-1.0',
  title: "Tractor box blade",
  description: "Rear grading box blade with twin side plates, replaceable cutting edge and scarifier shanks. Knobs: overall scale, body color and accent color.",
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
const p = assembly('tractor-box-blade');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('mounting-frame', box(1066, 100, 278.4, true).translate(0, 190.4, 199.2), body);
add('crossbar', box(1300, 95, 80, true).translate(0, 128.8, 337.6), accent);
add('side-plate--1', box(52, 560, 264, true).translate(-572, 0, 261.6), body);
add('side-plate-1', box(52, 560, 264, true).translate(572, 0, 261.6), body);
add('moldboard', box(1144, 60, 297.6, true).translate(0, 156.8, 312), accent);
add('cutting-edge', box(1300, 32, 42, true).translate(0, -179.2, 41), body);
add('scarifier-0', box(34, 42, 240, true).translate(-442, 0, 120), accent);
add('scarifier-1', box(34, 42, 240, true).translate(-221, 0, 120), accent);
add('scarifier-2', box(34, 42, 240, true).translate(0, 0, 120), accent);
add('scarifier-3', box(34, 42, 240, true).translate(221, 0, 120), accent);
add('scarifier-4', box(34, 42, 240, true).translate(442, 0, 120), accent);

return p.model();
