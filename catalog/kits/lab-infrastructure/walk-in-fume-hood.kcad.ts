// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly walk-in laboratory fume hood scene prop, modeled from scratch.
meta({
  name: 'walk-in-fume-hood',
  license: 'CC0-1.0',
  title: 'Walk-in laboratory fume hood',
  description: 'Large walk-in extraction enclosure with full-height side cheeks, floor pan and overhead duct. Knobs: overall scale, body color and accent color.',
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
const p = assembly('walk-in-fume-hood');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('base-cabinet', box(1500, 1100, 874, true).translate(0, 0, 437), body);
add('work-surface', box(1560, 1155, 34, true).translate(0, 0, 891), accent);
add('side-cheek--1', box(90, 1100, 1276, true).translate(-705, 0, 1546), body);
add('side-cheek-1', box(90, 1100, 1276, true).translate(705, 0, 1546), body);
add('rear-chamber-wall', box(1320, 88, 1276, true).translate(0, 506, 1546), body);
add('sash-header', box(1500, 30, 100, true).translate(0, -539, 2180), accent);
add('sash-rail', box(1320, 28, 34, true).translate(0, -550, 1465.2), accent);
add('upper-housing', box(1320, 858, 170, true).translate(0, 0, 2215), accent);
add('exhaust-neck', box(330, 242, 150, true).translate(0, 132, 2375), body);
add('control-button-0', box(30, 12, 24, true).translate(-480, -594, 405.3), accent);
add('control-button-1', box(30, 12, 24, true).translate(-330, -594, 405.3), accent);
add('control-button-2', box(30, 12, 24, true).translate(-180, -594, 405.3), accent);
add('floor-pan', box(1350, 968, 36, true).translate(0, 0, 36), accent);
add('wide-sash', box(1230, 25, 574.2, true).translate(0, -572, 1441.82), accent);

return p.model();
