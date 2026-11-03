// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly cleanroom ceiling light panel scene prop, modeled from scratch.
meta({
  name: 'cleanroom-ceiling-light-panel',
  license: 'CC0-1.0',
  title: 'Cleanroom ceiling light panel',
  description: 'Flush ceiling luminaire cassette with a framed diffuser and shallow service rim. Knobs: overall scale, body color and accent color.',
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
const p = assembly('cleanroom-ceiling-light-panel');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('cassette', box(1200, 600, 90, true).translate(0, 0, 45), body);
add('diffuser', box(1080, 540, 24, true).translate(0, 0, 102), accent);
add('long-rim--1', box(1272, 28, 126, true).translate(0, -288, 63), accent);
add('long-rim-1', box(1272, 28, 126, true).translate(0, 288, 63), accent);

return p.model();
