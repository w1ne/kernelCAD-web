// SPDX-License-Identifier: CC0-1.0
// Horizontal shell-and-tube heat exchanger with tube sheets, saddle feet and paired process nozzles.
meta({
  name: 'shell-and-tube-exchanger',
  license: 'CC0-1.0',
  title: 'Shell and tube heat exchanger',
  description: 'Horizontal shell-and-tube heat exchanger with tube sheets, saddle feet and paired process nozzles. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#687e89', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#dca144', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('shell-and-tube-exchanger');
p.part('shell', cylinder(790, 170, 10).rotate([0, 1, 0], 90).translate(-395, 0, 270).scale(scale).color(steel));
p.part('tube-sheet--1', cylinder(36, 204, 10).rotate([0, 1, 0], 90).translate(-423, 0, 270).scale(scale).color(safetyPaint));
p.part('channel-head--1', cylinder(85, 149.6, 10).rotate([0, 1, 0], 90).translate(-485.5, 0, 270).scale(scale).color(steel));
p.part('connection--1', cylinder(74, 38, 10).translate(-252.8, 0, 432).scale(scale).color(safetyPaint));
p.part('tube-sheet-1', cylinder(36, 204, 10).rotate([0, 1, 0], 90).translate(387, 0, 270).scale(scale).color(safetyPaint));
p.part('channel-head-1', cylinder(85, 149.6, 10).rotate([0, 1, 0], 90).translate(400.5, 0, 270).scale(scale).color(steel));
p.part('connection-1', cylinder(74, 38, 10).translate(252.8, 0, 432).scale(scale).color(safetyPaint));
p.part('saddle-0', box(95, 357, 90, true).translate(-237, 0, 93.5).scale(scale).color(safetyPaint));
p.part('foot-0', box(150, 391, 18, true).translate(-237, 0, 9).scale(scale).color(steel));
p.part('saddle-1', box(95, 357, 90, true).translate(237, 0, 93.5).scale(scale).color(safetyPaint));
p.part('foot-1', box(150, 391, 18, true).translate(237, 0, 9).scale(scale).color(steel));
p.part('shell-band', cylinder(16, 180.2, 10).rotate([0, 1, 0], 90).translate(-8, 0, 270).scale(scale).color(safetyPaint));

return p.model();
