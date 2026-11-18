// SPDX-License-Identifier: CC0-1.0
// Compact electric chain hoist with a trolley, chain fall, hook block and suspension eye.
meta({
  name: 'electric-chain-hoist',
  license: 'CC0-1.0',
  title: 'Electric chain hoist',
  description: 'Compact electric chain hoist with a trolley, chain fall, hook block and suspension eye. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#667780', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e8a93e', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('electric-chain-hoist');
p.part('hoist-case', box(280, 250, 176.4, true).translate(0, 0, 268.8).translate(0, 0, -2).scale(scale).color(steel));
p.part('trolley-plate', box(448, 145, 32, true).translate(0, 0, 382.2).translate(0, 0, -2).scale(scale).color(safetyPaint));
p.part('trolley-wheel--1', cylinder(28, 44, 8).rotate([1, 0, 0], 90).translate(-162.4, 14, 399).translate(0, 0, -2).scale(scale).color(steel));
p.part('trolley-wheel-1', cylinder(28, 44, 8).rotate([1, 0, 0], 90).translate(162.4, 14, 399).translate(0, 0, -2).scale(scale).color(steel));
p.part('chain', cylinder(180.6, 12, 8).translate(0, 0, 84).translate(0, 0, -2).scale(scale).color(safetyPaint));
p.part('hook-block', box(58, 56, 64, true).translate(0, 0, 60).translate(0, 0, -2).scale(scale).color(steel));
p.part('hook-tip', box(42, 28, 42, true).translate(28, 0, 23).translate(0, 0, -2).scale(scale).color(safetyPaint));
p.part('suspension-eye', box(65, 30, 65, true).translate(0, 0, 390.6).translate(0, 0, -2).scale(scale).color(steel));

return p.model();
