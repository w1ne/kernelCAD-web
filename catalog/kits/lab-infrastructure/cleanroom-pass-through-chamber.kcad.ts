// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly cleanroom pass-through chamber scene prop, modeled from scratch.
meta({
  name: 'cleanroom-pass-through-chamber',
  license: 'CC0-1.0',
  title: 'Cleanroom pass-through chamber',
  description: 'Wall pass-through cabinet with opposed doors, perimeter frame and flush handle bars. Knobs: overall scale, body color and accent color.',
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
const p = assembly('cleanroom-pass-through-chamber');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('support-plinth', box(690, 582.8, 70, true).translate(0, 0, 35), accent);
add('chamber', box(750, 620, 580, true).translate(0, 0, 360), body);
add('inner-transfer-box', box(540, 446.4, 500, true).translate(0, 0, 360), accent);
add('access-door--1', box(24, 508.4, 576, true).translate(-387, 0, 648), body);
add('door-handle--1', box(14, 28, 216, true).translate(-407.5, -155, 468), accent);
add('access-door-1', box(24, 508.4, 576, true).translate(387, 0, 648), body);
add('door-handle-1', box(14, 28, 216, true).translate(407.5, -155, 468), accent);
add('mount-frame-70', box(825, 682, 28, true).translate(0, 0, 84), accent);
add('mount-frame-650', box(825, 682, 28, true).translate(0, 0, 664), accent);

return p.model();
