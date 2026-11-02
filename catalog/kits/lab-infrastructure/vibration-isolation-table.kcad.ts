// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly vibration isolation table scene prop, modeled from scratch.
meta({
  name: 'vibration-isolation-table',
  license: 'CC0-1.0',
  title: 'Vibration isolation table',
  description: 'Laboratory isolation table with a thick top plate, pneumatic-looking supports and cross-braced base. Knobs: overall scale, body color and accent color.',
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
const p = assembly('vibration-isolation-table');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('worktop', box(1000, 800, 36, true).translate(0, 0, 802), accent);
add('leg-0--320-0', box(42, 42, 784, true).translate(-430, -320, 392), body);
add('leg-0-320-0', box(42, 42, 784, true).translate(-430, 320, 392), body);
add('leg-1--320-0', box(42, 42, 784, true).translate(-143.333, -320, 392), body);
add('leg-1-320-0', box(42, 42, 784, true).translate(-143.333, 320, 392), body);
add('leg-2--320-0', box(42, 42, 784, true).translate(143.333, -320, 392), body);
add('leg-2-320-0', box(42, 42, 784, true).translate(143.333, 320, 392), body);
add('leg-3--320-0', box(42, 42, 784, true).translate(430, -320, 392), body);
add('leg-3-320-0', box(42, 42, 784, true).translate(430, 320, 392), body);
add('lower-cross-rail', box(860, 36, 28, true).translate(0, 0, 210.8), accent);
add('cross-brace--1', box(700, 20, 22, true).translate(0, -280, 421), accent);
add('cross-brace-1', box(700, 20, 22, true).translate(0, 280, 421), accent);

return p.model();
