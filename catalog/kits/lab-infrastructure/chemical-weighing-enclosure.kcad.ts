// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly chemical weighing enclosure scene prop, modeled from scratch.
meta({
  name: 'chemical-weighing-enclosure',
  license: 'CC0-1.0',
  title: 'Chemical weighing enclosure',
  description: 'Compact shielded enclosure with three clear-looking sides, a low sill and overhead filter box. Knobs: overall scale, body color and accent color.',
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
const p = assembly('chemical-weighing-enclosure');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('base-cabinet', box(680, 600, 255, true).translate(0, 0, 127.5), body);
add('work-surface', box(707.2, 630, 34, true).translate(0, 0, 272), accent);
add('side-cheek--1', box(40.8, 600, 445, true).translate(-319.6, 0, 511.5), body);
add('side-cheek-1', box(40.8, 600, 445, true).translate(319.6, 0, 511.5), body);
add('rear-chamber-wall', box(598.4, 48, 445, true).translate(0, 276, 511.5), body);
add('sash-header', box(680, 30, 100, true).translate(0, -294, 730), accent);
add('sash-rail', box(598.4, 28, 34, true).translate(0, -300, 472.25), accent);
add('upper-housing', box(598.4, 468, 170, true).translate(0, 0, 765), accent);
add('exhaust-neck', box(149.6, 132, 150, true).translate(0, 72, 925), body);
add('control-button-0', box(30, 12, 24, true).translate(-217.6, -324, 126.75), accent);
add('control-button-1', box(30, 12, 24, true).translate(-149.6, -324, 126.75), accent);
add('control-button-2', box(30, 12, 24, true).translate(-81.6, -324, 126.75), accent);
add('lower-control-panel', box(516.8, 18, 40, true).translate(0, -324, 203.6), accent);

return p.model();
