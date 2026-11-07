// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly shell and tube heat exchanger scene prop, modeled from scratch.
meta({
  name: 'shell-and-tube-exchanger',
  license: 'CC0-1.0',
  title: 'Shell and tube heat exchanger',
  description: 'Horizontal shell-and-tube heat exchanger with tube sheets, saddle feet and paired process nozzles. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#687e89', { label: 'Body color' });
const accent = param('accent', '#dca144', { label: 'Accent color' });
const p = assembly('shell-and-tube-exchanger');
p.part('shell', cylinder(790, 170, 10).rotate([0, 1, 0], 90).translate(-395, 0, 270).scale(scale).color(body));
p.part('tube-sheet--1', cylinder(36, 204, 10).rotate([0, 1, 0], 90).translate(-423, 0, 270).scale(scale).color(accent));
p.part('channel-head--1', cylinder(85, 149.6, 10).rotate([0, 1, 0], 90).translate(-485.5, 0, 270).scale(scale).color(body));
p.part('connection--1', cylinder(74, 38, 10).translate(-252.8, 0, 432).scale(scale).color(accent));
p.part('tube-sheet-1', cylinder(36, 204, 10).rotate([0, 1, 0], 90).translate(387, 0, 270).scale(scale).color(accent));
p.part('channel-head-1', cylinder(85, 149.6, 10).rotate([0, 1, 0], 90).translate(400.5, 0, 270).scale(scale).color(body));
p.part('connection-1', cylinder(74, 38, 10).translate(252.8, 0, 432).scale(scale).color(accent));
p.part('saddle-0', box(95, 357, 90, true).translate(-237, 0, 93.5).scale(scale).color(accent));
p.part('foot-0', box(150, 391, 18, true).translate(-237, 0, 9).scale(scale).color(body));
p.part('saddle-1', box(95, 357, 90, true).translate(237, 0, 93.5).scale(scale).color(accent));
p.part('foot-1', box(150, 391, 18, true).translate(237, 0, 9).scale(scale).color(body));
p.part('shell-band', cylinder(16, 180.2, 10).rotate([0, 1, 0], 90).translate(-8, 0, 270).scale(scale).color(accent));

return p.model();
