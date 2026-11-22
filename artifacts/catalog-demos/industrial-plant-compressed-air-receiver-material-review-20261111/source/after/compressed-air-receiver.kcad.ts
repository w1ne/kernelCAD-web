// SPDX-License-Identifier: CC0-1.0
// Compressed-air receiver tank with saddle feet, drain valve, top port and pressure gauge.
meta({
  name: 'compressed-air-receiver',
  license: 'CC0-1.0',
  title: 'Compressed air receiver',
  description: 'Compressed-air receiver tank with saddle feet, drain valve, top port and pressure gauge. Controls: overall scale, steel, safety paint, gauge glass.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#6a7e87', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e6ae48', { label: 'Safety paint' });
const gaugeGlass = param('gaugeGlass', '#91c6c8', { label: 'Gauge glass' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f', gaugeGlass: '#78989b' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('compressed-air-receiver');
p.part('pressure-shell', cylinder(840, 185, 10).rotate([0, 1, 0], 90).translate(-420, 0, 315).translate(0, 0, -0.5).scale(scale).color(steel));
// The welded heads and nozzle necks share the vessel's steel finish; safety paint stays on the skid and supports.
p.part('left-head', cylinder(28, 196.1, 10).rotate([0, 1, 0], 90).translate(-442, 0, 315).translate(0, 0, -0.5).scale(scale).color(steel));
p.part('right-head', cylinder(28, 196.1, 10).rotate([0, 1, 0], 90).translate(414, 0, 315).translate(0, 0, -0.5).scale(scale).color(steel));
p.part('skid-rail-left', box(756, 30, 35, true).translate(0, -111, 18).translate(0, 0, -0.5).scale(scale).color(safetyPaint));
p.part('skid-rail-right', box(756, 30, 35, true).translate(0, 111, 18).translate(0, 0, -0.5).scale(scale).color(safetyPaint));
p.part('saddle-0', box(95, 434.8, 90, true).translate(-235.2, 0, 99.9).translate(0, 0, -0.5).scale(scale).color(safetyPaint));
p.part('saddle-foot-0', box(130, 471.7, 18, true).translate(-235.2, 0, 10).translate(0, 0, -0.5).scale(scale).color(steel));
p.part('saddle-1', box(95, 434.8, 90, true).translate(235.2, 0, 99.9).translate(0, 0, -0.5).scale(scale).color(safetyPaint));
p.part('saddle-foot-1', box(130, 471.7, 18, true).translate(235.2, 0, 10).translate(0, 0, -0.5).scale(scale).color(steel));
p.part('top-port-0', cylinder(78, 25.9, 10).translate(-235.2, 0, 496).translate(0, 0, -0.5).scale(scale).color(steel));
p.part('port-flange-0', cylinder(16, 38.9, 10).translate(-235.2, 0, 553).translate(0, 0, -0.5).scale(scale).color(steel));
p.part('top-port-1', cylinder(78, 25.9, 10).translate(0, 0, 496).translate(0, 0, -0.5).scale(scale).color(steel));
p.part('port-flange-1', cylinder(16, 38.9, 10).translate(0, 0, 553).translate(0, 0, -0.5).scale(scale).color(steel));
p.part('top-port-2', cylinder(78, 25.9, 10).translate(235.2, 0, 496).translate(0, 0, -0.5).scale(scale).color(steel));
p.part('port-flange-2', cylinder(16, 38.9, 10).translate(235.2, 0, 553).translate(0, 0, -0.5).scale(scale).color(steel));
p.part('pressure-gauge', cylinder(26, 42, 10).rotate([1, 0, 0], 90).translate(117.6, -138.7, 381.6).translate(0, 0, -0.5).scale(scale).color(gaugeGlass));
p.part('drain', cylinder(62, 16.6, 10).translate(0, 0, 18).translate(0, 0, -0.5).scale(scale).color(safetyPaint));

return p.model();
