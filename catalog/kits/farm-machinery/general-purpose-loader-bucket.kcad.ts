// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly general-purpose loader bucket scene prop, modeled from scratch.
meta({
  name: "general-purpose-loader-bucket",
  license: 'CC0-1.0',
  title: "General-purpose loader bucket",
  description: "Wide front-loader bucket with rolled upper edge, side plates and cutting lip. Knobs: overall scale, body color and accent color.",
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
const p = assembly('general-purpose-loader-bucket');
const groundOffset = 20;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('mounting-frame', box(861, 100, 249.4, true).translate(0, 176.8, 184.7), body);
add('crossbar', box(1050, 95, 80, true).translate(0, 119.6, 306.6), accent);
add('bucket-floor', box(1050, 405.6, 38, true).translate(0, -52, 39), accent);
add('bucket-cheek--1', box(50, 520, 301, true).translate(-462, 0, 301), body);
add('bucket-cheek-1', box(50, 520, 301, true).translate(462, 0, 301), body);
add('cutting-edge', box(1092, 45, 52, true).translate(0, -270.4, 66), body);
add('back-shell', box(997.5, 93.6, 232.2, true).translate(0, 140.4, 270.9), accent);

return p.model();
