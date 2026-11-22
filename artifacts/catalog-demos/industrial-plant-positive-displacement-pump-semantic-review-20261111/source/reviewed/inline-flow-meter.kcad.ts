// SPDX-License-Identifier: CC0-1.0
// Inline flow meter with flanged pipe ends, instrument body, readable display block and cable gland.
meta({
  name: 'inline-flow-meter',
  license: 'CC0-1.0',
  title: 'Inline flow meter',
  description: 'Inline flow meter with flanged pipe ends, instrument body, readable display block and cable gland. Controls: overall scale, steel, safety paint, gauge glass.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#6e7e84', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e1aa48', { label: 'Safety paint' });
const gaugeGlass = param('gaugeGlass', '#91c6c8', { label: 'Gauge glass' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f', gaugeGlass: '#78989b' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('inline-flow-meter');
p.part('pipe-run', cylinder(520, 63.3, 10).rotate([0, 1, 0], 90).translate(-260, 0, 225).translate(0, 0, -110).scale(scale).color(steel));
p.part('flange--1', cylinder(24, 115, 10).rotate([0, 1, 0], 90).translate(-235.6, 0, 225).translate(0, 0, -110).scale(scale).color(safetyPaint));
p.part('flange-1', cylinder(24, 115, 10).rotate([0, 1, 0], 90).translate(211.6, 0, 225).translate(0, 0, -110).scale(scale).color(safetyPaint));
p.part('meter-housing', box(172.5, 138, 210.8, true).translate(0, 0, 305.5).translate(0, 0, -110).scale(scale).color(safetyPaint));
p.part('display', box(94.3, 18, 91.8, true).translate(0, -73.6, 311.2).translate(0, 0, -110).scale(scale).color(gaugeGlass));
p.part('cable-gland', box(46, 48, 55, true).translate(51.8, 0, 374.5).translate(0, 0, -110).scale(scale).color(steel));
p.part('instrument-neck', cylinder(72, 30, 10).translate(0, 0, 363).translate(0, 0, -110).scale(scale).color(steel));

return p.model();
