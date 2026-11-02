// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly traveling sprinkler cart scene prop, modeled from scratch.
meta({
  name: "traveling-sprinkler-cart",
  license: 'CC0-1.0',
  title: "Traveling sprinkler cart",
  description: "Portable irrigation cart with hose reel, large wheels, guide frame and elevated sprinkler head. Knobs: overall scale, body color and accent color.",
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
const p = assembly('traveling-sprinkler-cart');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('cart-frame', box(950, 937.5, 80, true).translate(0, 0, 130), body);
add('cart-wheel--1', cylinder(88, 180, 12).rotate([0, 1, 0], 90).translate(-44, -525, 180), "#414848");
add('cart-wheel--1-hub', cylinder(96.8, 61.2, 10).translate(-48.4, -525, 180), accent);
add('cart-wheel-1', cylinder(88, 180, 12).rotate([0, 1, 0], 90).translate(-44, 525, 180), "#414848");
add('cart-wheel-1-hub', cylinder(96.8, 61.2, 10).translate(-48.4, 525, 180), accent);
add('hose-reel', box(646, 90, 810, true).translate(0, 0, 1230), accent);
add('sprinkler-mast', cylinder(1020, 28, 8).translate(0, 450, 220), body);
add('sprinkler-arm', box(320, 25, 28, true).translate(0, 450, 1349), accent);

return p.model();
