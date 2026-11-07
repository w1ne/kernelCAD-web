// SPDX-License-Identifier: CC0-1.0
// Industrial grated walkway module with bearer beams, support legs, kick plates and handrails.
meta({
  name: 'grating-walkway-module',
  license: 'CC0-1.0',
  title: 'Grating walkway module',
  description: 'Industrial grated walkway module with bearer beams, support legs, kick plates and handrails. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#768187', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#dfa642', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('grating-walkway-module');
p.part('deck', box(820, 340, 24, true).translate(0, 0, 360).scale(scale).color(safetyPaint));
p.part('grating-bar-0', box(12, 312.8, 16, true).translate(-360.8, 0, 378).scale(scale).color(steel));
p.part('grating-bar-1', box(12, 312.8, 16, true).translate(-257.7, 0, 378).scale(scale).color(steel));
p.part('grating-bar-2', box(12, 312.8, 16, true).translate(-154.6, 0, 378).scale(scale).color(steel));
p.part('grating-bar-3', box(12, 312.8, 16, true).translate(-51.5, 0, 378).scale(scale).color(steel));
p.part('grating-bar-4', box(12, 312.8, 16, true).translate(51.5, 0, 378).scale(scale).color(steel));
p.part('grating-bar-5', box(12, 312.8, 16, true).translate(154.6, 0, 378).scale(scale).color(steel));
p.part('grating-bar-6', box(12, 312.8, 16, true).translate(257.7, 0, 378).scale(scale).color(steel));
p.part('grating-bar-7', box(12, 312.8, 16, true).translate(360.8, 0, 378).scale(scale).color(steel));
p.part('support-leg--311-6', box(34, 34, 360, true).translate(-311.6, 0, 180).scale(scale).color(steel));
p.part('foot--311-6', box(95, 90, 18, true).translate(-311.6, 0, 9).scale(scale).color(safetyPaint));
p.part('support-leg-311-6', box(34, 34, 360, true).translate(311.6, 0, 180).scale(scale).color(steel));
p.part('foot-311-6', box(95, 90, 18, true).translate(311.6, 0, 9).scale(scale).color(safetyPaint));
p.part('handrail--1', box(820, 16, 22, true).translate(0, -163.2, 464).scale(scale).color(safetyPaint));
p.part('rail-post--1-0', box(16, 16, 110, true).translate(-328, -163.2, 416).scale(scale).color(steel));
p.part('rail-post--1-1', box(16, 16, 110, true).translate(-106.6, -163.2, 416).scale(scale).color(steel));
p.part('rail-post--1-2', box(16, 16, 110, true).translate(114.8, -163.2, 416).scale(scale).color(steel));
p.part('rail-post--1-3', box(16, 16, 110, true).translate(336.2, -163.2, 416).scale(scale).color(steel));
p.part('toe-plate--1', box(820, 16, 65, true).translate(0, -166.6, 404).scale(scale).color(steel));
p.part('handrail-1', box(820, 16, 22, true).translate(0, 163.2, 464).scale(scale).color(safetyPaint));
p.part('rail-post-1-0', box(16, 16, 110, true).translate(-328, 163.2, 416).scale(scale).color(steel));
p.part('rail-post-1-1', box(16, 16, 110, true).translate(-106.6, 163.2, 416).scale(scale).color(steel));
p.part('rail-post-1-2', box(16, 16, 110, true).translate(114.8, 163.2, 416).scale(scale).color(steel));
p.part('rail-post-1-3', box(16, 16, 110, true).translate(336.2, 163.2, 416).scale(scale).color(steel));
p.part('toe-plate-1', box(820, 16, 65, true).translate(0, 166.6, 404).scale(scale).color(steel));

return p.model();
