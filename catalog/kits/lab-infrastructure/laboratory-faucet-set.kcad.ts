// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly laboratory faucet set scene prop, modeled from scratch.
meta({
  name: 'laboratory-faucet-set',
  license: 'CC0-1.0',
  title: 'Laboratory faucet set',
  description: 'Bench-mounted faucet assembly with a tall neck, paired handles and a projecting spout. Knobs: overall scale, body color and accent color.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#829092', { label: 'Body color' });
const accent = param('accent', '#39a89b', { label: 'Accent color' });
const p = assembly('laboratory-faucet-set');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('mounting-deck', box(300, 200, 40, true).translate(0, 0, 20), body);
add('riser', cylinder(355.2, 24, 8).translate(0, 0, 40), accent);
add('spout', box(210, 32, 22, true).translate(145, 0, 376.2), accent);
add('tap-stem--1', cylinder(192, 15, 8).translate(-99, 0, 40), body);
add('tap-handle--1', box(82, 30, 18, true).translate(-99, 0, 246), accent);
add('tap-stem-1', cylinder(192, 15, 8).translate(99, 0, 40), body);
add('tap-handle-1', box(82, 30, 18, true).translate(99, 0, 246), accent);

return p.model();
