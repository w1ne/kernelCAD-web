// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly laboratory gas manifold panel scene prop, modeled from scratch.
meta({
  name: 'lab-gas-manifold-panel',
  license: 'CC0-1.0',
  title: 'Laboratory gas manifold panel',
  description: 'Wall panel with paired inlet headers, isolation wheels and capped outlet points. Knobs: overall scale, body color and accent color.',
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
const p = assembly('lab-gas-manifold-panel');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('mounting-plate', box(850, 160, 700, true).translate(0, 0, 350), body);
add('main-header', box(714, 45, 52, true).translate(0, -160, 362), accent);
add('valve-riser-0', cylinder(175, 17, 8).translate(-289, -160, 336), body);
add('valve-handle-0', box(66, 20, 16, true).translate(-289, -176, 540), accent);
add('outlet-0', box(38, 70, 35, true).translate(-289, -136, 633.5), body);
add('valve-riser-1', cylinder(175, 17, 8).translate(-96.333, -160, 336), body);
add('valve-handle-1', box(66, 20, 16, true).translate(-96.333, -176, 540), accent);
add('outlet-1', box(38, 70, 35, true).translate(-96.333, -136, 633.5), body);
add('valve-riser-2', cylinder(175, 17, 8).translate(96.333, -160, 336), body);
add('valve-handle-2', box(66, 20, 16, true).translate(96.333, -176, 540), accent);
add('outlet-2', box(38, 70, 35, true).translate(96.333, -136, 633.5), body);
add('valve-riser-3', cylinder(175, 17, 8).translate(289, -160, 336), body);
add('valve-handle-3', box(66, 20, 16, true).translate(289, -176, 540), accent);
add('outlet-3', box(38, 70, 35, true).translate(289, -136, 633.5), body);
add('wall-mount--1', box(45, 150, 100, true).translate(-357, 88, 204), accent);
add('wall-mount-1', box(45, 150, 100, true).translate(357, 88, 204), accent);

return p.model();
