// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly electric chain hoist scene prop, modeled from scratch.
meta({
  name: 'electric-chain-hoist',
  license: 'CC0-1.0',
  title: 'Electric chain hoist',
  description: 'Compact electric chain hoist with a trolley, chain fall, hook block and suspension eye. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#667780', { label: 'Body color' });
const accent = param('accent', '#e8a93e', { label: 'Accent color' });
const p = assembly('electric-chain-hoist');
p.part('hoist-case', box(280, 250, 176.4, true).translate(0, 0, 268.8).translate(0, 0, -2).scale(scale).color(body));
p.part('trolley-plate', box(448, 145, 32, true).translate(0, 0, 382.2).translate(0, 0, -2).scale(scale).color(accent));
p.part('trolley-wheel--1', cylinder(28, 44, 8).rotate([1, 0, 0], 90).translate(-162.4, 14, 399).translate(0, 0, -2).scale(scale).color(body));
p.part('trolley-wheel-1', cylinder(28, 44, 8).rotate([1, 0, 0], 90).translate(162.4, 14, 399).translate(0, 0, -2).scale(scale).color(body));
p.part('chain', cylinder(180.6, 12, 8).translate(0, 0, 84).translate(0, 0, -2).scale(scale).color(accent));
p.part('hook-block', box(58, 56, 64, true).translate(0, 0, 60).translate(0, 0, -2).scale(scale).color(body));
p.part('hook-tip', box(42, 28, 42, true).translate(28, 0, 23).translate(0, 0, -2).scale(scale).color(accent));
p.part('suspension-eye', box(65, 30, 65, true).translate(0, 0, 390.6).translate(0, 0, -2).scale(scale).color(body));

return p.model();
