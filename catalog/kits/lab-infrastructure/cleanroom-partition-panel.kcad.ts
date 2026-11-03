// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly cleanroom partition panel scene prop, modeled from scratch.
meta({
  name: 'cleanroom-partition-panel',
  license: 'CC0-1.0',
  title: 'Cleanroom partition panel',
  description: 'Modular cleanroom wall panel with vertical edge channels and a shallow bottom rail. Knobs: overall scale, body color and accent color.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'structure',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#829092', { label: 'Body color' });
const accent = param('accent', '#39a89b', { label: 'Accent color' });
const p = assembly('cleanroom-partition-panel');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('wall-core', box(1200, 100, 2400, true).translate(0, 0, 1200), body);
add('edge-channel--576-0', box(42, 120, 2400, true).translate(-576, 0, 1200), accent);
add('edge-channel-576-0', box(42, 120, 2400, true).translate(576, 0, 1200), accent);
add('floor-track', box(1236, 125, 52, true).translate(0, 0, 26), accent);
add('head-track', box(1236, 125, 70, true).translate(0, 0, 2400), accent);

return p.model();
