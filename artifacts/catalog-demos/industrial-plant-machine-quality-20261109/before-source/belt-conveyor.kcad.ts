// SPDX-License-Identifier: CC0-1.0
// Straight belt conveyor with a raised deck, roller ends, side guides and adjustable support legs.
meta({
  name: 'belt-conveyor',
  license: 'CC0-1.0',
  title: 'Belt conveyor',
  description: 'Straight belt conveyor with a raised deck, roller ends, side guides and adjustable support legs. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#687b83', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e2a744', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('belt-conveyor');
p.part('side-frame--1', box(980, 30, 55, true).translate(0, -151.8, 296.4).scale(scale).color(safetyPaint));
p.part('support--1-0', box(26, 26, 273, true).translate(-372.4, -112.2, 140.4).scale(scale).color(steel));
p.part('foot--1-0', box(74, 70, 18, true).translate(-372.4, -112.2, 9).scale(scale).color(safetyPaint));
p.part('support--1-1', box(26, 26, 273, true).translate(0, -112.2, 140.4).scale(scale).color(steel));
p.part('foot--1-1', box(74, 70, 18, true).translate(0, -112.2, 9).scale(scale).color(safetyPaint));
p.part('support--1-2', box(26, 26, 273, true).translate(372.4, -112.2, 140.4).scale(scale).color(steel));
p.part('foot--1-2', box(74, 70, 18, true).translate(372.4, -112.2, 9).scale(scale).color(safetyPaint));
p.part('side-frame-1', box(980, 30, 55, true).translate(0, 151.8, 296.4).scale(scale).color(safetyPaint));
p.part('support-1-0', box(26, 26, 273, true).translate(-372.4, 112.2, 140.4).scale(scale).color(steel));
p.part('foot-1-0', box(74, 70, 18, true).translate(-372.4, 112.2, 9).scale(scale).color(safetyPaint));
p.part('support-1-1', box(26, 26, 273, true).translate(0, 112.2, 140.4).scale(scale).color(steel));
p.part('foot-1-1', box(74, 70, 18, true).translate(0, 112.2, 9).scale(scale).color(safetyPaint));
p.part('support-1-2', box(26, 26, 273, true).translate(372.4, 112.2, 140.4).scale(scale).color(steel));
p.part('foot-1-2', box(74, 70, 18, true).translate(372.4, 112.2, 9).scale(scale).color(safetyPaint));
p.part('conveyor-deck', box(980, 270.6, 22, true).translate(0, 0, 390).scale(scale).color(steel));
p.part('roller-0', cylinder(297, 22, 8).rotate([0, 1, 0], 90).translate(-560.1, 0, 414).scale(scale).color(safetyPaint));
p.part('roller-1', cylinder(297, 22, 8).rotate([0, 1, 0], 90).translate(263.1, 0, 414).scale(scale).color(safetyPaint));
p.part('belt-surface', box(921.2, 244.2, 16, true).translate(0, 0, 417).scale(scale).color(safetyPaint));
p.part('end-stop', box(24, 270.6, 72, true).translate(470.4, 0, 426).scale(scale).color(steel));

return p.model();
