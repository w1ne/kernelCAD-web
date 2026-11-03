// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly grain header scene prop, modeled from scratch.
meta({
  name: "grain-header",
  license: 'CC0-1.0',
  title: "Grain header",
  description: "Wide grain platform header with reel, cutter bar, end dividers and center feeder opening. Knobs: overall scale, body color and accent color.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'prop',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#5d7f75', { label: 'Body color' });
const accent = param('accent', '#c67b39', { label: 'Accent color' });
const p = assembly('grain-header');
const groundOffset = 50;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('header-floor', box(4200, 961, 54, true).translate(0, 0, 97), body);
add('cutterbar', box(4074, 34, 56, true).translate(0, -589, 123), accent);
add('end-divider--1', box(80, 682, 693, true).translate(-2016, -263.5, 808.5), body);
add('end-divider-1', box(80, 682, 693, true).translate(2016, -263.5, 808.5), body);
add('reel-shaft', box(3948, 46, 46, true).translate(0, 232.5, 758), accent);
add('reel-spoke-0', box(22, 28, 504, true).translate(-1806, 232.5, 798), body);
add('snout-0', box(336, 434, 75, true).translate(-1806, -806, 87.5), accent);
add('reel-spoke-1', box(22, 28, 504, true).translate(-1290, 232.5, 798), body);
add('snout-1', box(336, 434, 75, true).translate(-1290, -806, 87.5), accent);
add('reel-spoke-2', box(22, 28, 504, true).translate(-774, 232.5, 798), body);
add('snout-2', box(336, 434, 75, true).translate(-774, -806, 87.5), accent);
add('reel-spoke-3', box(22, 28, 504, true).translate(-258, 232.5, 798), body);
add('snout-3', box(336, 434, 75, true).translate(-258, -806, 87.5), accent);
add('reel-spoke-4', box(22, 28, 504, true).translate(258, 232.5, 798), body);
add('snout-4', box(336, 434, 75, true).translate(258, -806, 87.5), accent);
add('reel-spoke-5', box(22, 28, 504, true).translate(774, 232.5, 798), body);
add('snout-5', box(336, 434, 75, true).translate(774, -806, 87.5), accent);
add('reel-spoke-6', box(22, 28, 504, true).translate(1290, 232.5, 798), body);
add('snout-6', box(336, 434, 75, true).translate(1290, -806, 87.5), accent);
add('reel-spoke-7', box(22, 28, 504, true).translate(1806, 232.5, 798), body);
add('snout-7', box(336, 434, 75, true).translate(1806, -806, 87.5), accent);

return p.model();
