// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly root grapple attachment scene prop, modeled from scratch.
meta({
  name: "root-grapple-attachment",
  license: 'CC0-1.0',
  title: "Root grapple attachment",
  description: "Loader grapple bucket with lower scoop, split upper claws and hinge crossbar. Knobs: overall scale, body color and accent color.",
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
const p = assembly('root-grapple-attachment');
const groundOffset = 20;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('mounting-frame', box(803.6, 100, 324.8, true).translate(0, 204, 222.4), body);
add('crossbar', box(980, 95, 80, true).translate(0, 138, 387.2), accent);
add('bucket-floor', box(980, 468, 38, true).translate(0, -60, 39), accent);
add('bucket-cheek--1', box(50, 600, 392, true).translate(-431.2, 0, 392), body);
add('bucket-cheek-1', box(50, 600, 392, true).translate(431.2, 0, 392), body);
add('cutting-edge', box(1019.2, 45, 52, true).translate(0, -312, 66), body);
add('back-shell', box(931, 108, 302.4, true).translate(0, 162, 352.8), accent);
add('grapple-crossbar', box(842.8, 90, 72, true).translate(0, 132, 540), body);
add('grapple-tine-0', box(48, 372, 336, true).translate(-372.4, 108, 487.2), accent);
add('grapple-tine-1', box(48, 372, 336, true).translate(-186.2, 108, 487.2), accent);
add('grapple-tine-2', box(48, 372, 336, true).translate(0, 108, 487.2), accent);
add('grapple-tine-3', box(48, 372, 336, true).translate(186.2, 108, 487.2), accent);
add('grapple-tine-4', box(48, 372, 336, true).translate(372.4, 108, 487.2), accent);

return p.model();
