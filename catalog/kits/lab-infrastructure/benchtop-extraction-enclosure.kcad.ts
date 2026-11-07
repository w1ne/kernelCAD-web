// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly benchtop extraction enclosure scene prop, modeled from scratch.
meta({
  name: 'benchtop-extraction-enclosure',
  license: 'CC0-1.0',
  title: 'Benchtop extraction enclosure',
  description: 'Small extraction chamber with a raised front lip, side panels and replaceable-looking top module. Knobs: overall scale, body color and accent color.',
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
const p = assembly('benchtop-extraction-enclosure');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('base-cabinet', box(700, 560, 234, true).translate(0, 0, 117), body);
add('work-surface', box(728, 588, 34, true).translate(0, 0, 251), accent);
add('side-cheek--1', box(42, 560, 396, true).translate(-329, 0, 466), body);
add('side-cheek-1', box(42, 560, 396, true).translate(329, 0, 466), body);
add('rear-chamber-wall', box(616, 44.8, 396, true).translate(0, 257.6, 466), body);
add('sash-header', box(700, 30, 100, true).translate(0, -274.4, 660), accent);
add('sash-rail', box(616, 28, 34, true).translate(0, -280, 429.2), accent);
add('upper-housing', box(616, 436.8, 170, true).translate(0, 0, 695), accent);
add('exhaust-neck', box(154, 123.2, 150, true).translate(0, 67.2, 855), body);
add('control-button-0', box(30, 12, 24, true).translate(-224, -302.4, 117.3), accent);
add('control-button-1', box(30, 12, 24, true).translate(-154, -302.4, 117.3), accent);
add('control-button-2', box(30, 12, 24, true).translate(-84, -302.4, 117.3), accent);
add('lower-control-panel', box(532, 18, 40, true).translate(0, -302.4, 188.48), accent);

return p.model();
