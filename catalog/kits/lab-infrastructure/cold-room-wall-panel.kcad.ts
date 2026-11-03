// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly cold-room wall panel scene prop, modeled from scratch.
meta({
  name: 'cold-room-wall-panel',
  license: 'CC0-1.0',
  title: 'Cold-room wall panel',
  description: 'Insulated modular cold-room panel with edge cams, panel joints and a floor channel. Knobs: overall scale, body color and accent color.',
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
const p = assembly('cold-room-wall-panel');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('wall-core', box(1200, 120, 2300, true).translate(0, 0, 1150), body);
add('edge-channel--576-0', box(42, 144, 2300, true).translate(-576, 0, 1150), accent);
add('edge-channel-576-0', box(42, 144, 2300, true).translate(576, 0, 1150), accent);
add('floor-track', box(1236, 150, 52, true).translate(0, 0, 26), accent);
add('head-track', box(1236, 150, 70, true).translate(0, 0, 2300), accent);

return p.model();
