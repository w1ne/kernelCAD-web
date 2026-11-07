// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly ductless fume enclosure scene prop, modeled from scratch.
meta({
  name: 'ductless-fume-enclosure',
  license: 'CC0-1.0',
  title: 'Ductless fume enclosure',
  description: 'Compact countertop enclosure with a clear-front frame, top filter housing and lower controls. Knobs: overall scale, body color and accent color.',
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
const p = assembly('ductless-fume-enclosure');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('base-cabinet', box(900, 650, 315, true).translate(0, 0, 157.5), body);
add('work-surface', box(936, 682.5, 34, true).translate(0, 0, 332), accent);
add('side-cheek--1', box(54, 650, 585, true).translate(-423, 0, 641.5), body);
add('side-cheek-1', box(54, 650, 585, true).translate(423, 0, 641.5), body);
add('rear-chamber-wall', box(792, 52, 585, true).translate(0, 299, 641.5), body);
add('sash-header', box(900, 30, 100, true).translate(0, -318.5, 930), accent);
add('sash-rail', box(792, 28, 34, true).translate(0, -325, 595.25), accent);
add('upper-housing', box(792, 507, 170, true).translate(0, 0, 965), accent);
add('exhaust-neck', box(198, 143, 150, true).translate(0, 78, 1125), body);
add('control-button-0', box(30, 12, 24, true).translate(-288, -351, 153.75), accent);
add('control-button-1', box(30, 12, 24, true).translate(-198, -351, 153.75), accent);
add('control-button-2', box(30, 12, 24, true).translate(-108, -351, 153.75), accent);
add('lower-control-panel', box(684, 18, 40, true).translate(0, -351, 246.8), accent);

return p.model();
