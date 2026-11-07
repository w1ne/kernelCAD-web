// SPDX-License-Identifier: CC0-1.0
// Vibratory feeder with a wide feed pan, coil supports, drive unit and hopper transition.
meta({
  name: 'vibratory-feeder',
  license: 'CC0-1.0',
  title: 'Vibratory feeder',
  description: 'Vibratory feeder with a wide feed pan, coil supports, drive unit and hopper transition. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#687981', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e1a648', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('vibratory-feeder');
p.part('base', box(515.2, 270.6, 34, true).translate(0, 0, 17).scale(scale).color(safetyPaint));
p.part('feed-pan', box(560, 330, 52, true).rotate([0, 1, 0], -6).translate(0, 0, 280).scale(scale).color(steel));
p.part('rear-hopper', box(212.8, 290.4, 122.5, true).translate(-168, 0, 224).scale(scale).color(safetyPaint));
p.part('spring--1-0', cylinder(112, 25, 8).translate(-140, -105.6, 70).scale(scale).color(steel));
p.part('spring--1-1', cylinder(112, 25, 8).translate(140, -105.6, 70).scale(scale).color(steel));
p.part('spring-1-0', cylinder(112, 25, 8).translate(-140, 105.6, 70).scale(scale).color(steel));
p.part('spring-1-1', cylinder(112, 25, 8).translate(140, 105.6, 70).scale(scale).color(steel));
p.part('drive-unit', box(165, 120, 145, true).translate(196, 0, 122.5).scale(scale).color(safetyPaint));
p.part('motor', cylinder(180, 54, 10).rotate([0, 1, 0], 90).translate(184.4, 0, 136.5).scale(scale).color(steel));

return p.model();
