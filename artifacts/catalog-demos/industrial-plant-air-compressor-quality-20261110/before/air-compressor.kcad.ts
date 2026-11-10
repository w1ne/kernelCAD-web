// SPDX-License-Identifier: CC0-1.0
// Packaged air compressor with a receiver tank, motor head, intake filter and service gauge.
meta({
  name: 'air-compressor',
  license: 'CC0-1.0',
  title: 'Industrial air compressor',
  description: 'Packaged air compressor with a receiver tank, motor head, intake filter and service gauge. Controls: overall scale, steel, safety paint, gauge glass.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#657c87', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e4ab45', { label: 'Safety paint' });
const gaugeGlass = param('gaugeGlass', '#91c6c8', { label: 'Gauge glass' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f', gaugeGlass: '#78989b' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('air-compressor');
p.part('base-frame', box(720, 360, 38, true).translate(0, 0, 19).scale(scale).color(safetyPaint));
p.part('receiver', cylinder(460.8, 90, 12).rotate([0, 1, 0], 90).translate(-230.4, 0, 135).scale(scale).color(steel));
p.part('motor', cylinder(259.2, 85, 12).rotate([0, 1, 0], 90).translate(-302.4, 0, 325).scale(scale).color(safetyPaint));
p.part('cylinder-head-0', cylinder(140, 35, 8).translate(86.4, 0, 275).scale(scale).color(steel));
p.part('head-cap-0', cylinder(14, 44, 8).translate(86.4, 0, 415).scale(scale).color(safetyPaint));
p.part('cylinder-head-1', cylinder(140, 35, 8).translate(134.4, 0, 275).scale(scale).color(steel));
p.part('head-cap-1', cylinder(14, 44, 8).translate(134.4, 0, 415).scale(scale).color(safetyPaint));
p.part('cylinder-head-2', cylinder(140, 35, 8).translate(182.4, 0, 275).scale(scale).color(steel));
p.part('head-cap-2', cylinder(14, 44, 8).translate(182.4, 0, 415).scale(scale).color(safetyPaint));
p.part('intake-filter', cylinder(96, 52, 10).translate(-223.2, 0, 385).scale(scale).color(safetyPaint));
p.part('pressure-gauge', cylinder(22, 38, 10).rotate([1, 0, 0], 90).translate(180, -115, 345).scale(scale).color(gaugeGlass));
p.part('air-line', cylinder(201.6, 18, 10).rotate([0, 1, 0], 90).translate(122.4, 0, 215).scale(scale).color(steel));
p.part('vent-slot-0', box(9, 22, 160, true).translate(-201.6, -183.6, 250).scale(scale).color(safetyPaint));
p.part('vent-slot-1', box(9, 22, 160, true).translate(-179.6, -183.6, 250).scale(scale).color(safetyPaint));
p.part('vent-slot-2', box(9, 22, 160, true).translate(-157.6, -183.6, 250).scale(scale).color(safetyPaint));
p.part('vent-slot-3', box(9, 22, 160, true).translate(-135.6, -183.6, 250).scale(scale).color(safetyPaint));

return p.model();
