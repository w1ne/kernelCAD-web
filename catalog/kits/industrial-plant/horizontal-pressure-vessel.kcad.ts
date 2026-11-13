// SPDX-License-Identifier: CC0-1.0
// Horizontal pressure vessel on saddle supports with end flanges, top nozzles and a service gauge.
meta({
  name: 'horizontal-pressure-vessel',
  license: 'CC0-1.0',
  title: 'Horizontal pressure vessel',
  description: 'Horizontal pressure vessel on saddle supports with end flanges, top nozzles and a service gauge. Controls: overall scale, steel, safety paint, gauge glass.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#607986', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e2a849', { label: 'Safety paint' });
const gaugeGlass = param('gaugeGlass', '#91c6c8', { label: 'Gauge glass' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f', gaugeGlass: '#78989b' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('horizontal-pressure-vessel');
p.part('pressure-shell', cylinder(1050, 220, 10).rotate([0, 1, 0], 90).translate(-525, 0, 350).translate(0, 0, -0.5).scale(scale).color(steel));
// The heads and nozzle necks are part of the carbon-steel pressure boundary.
p.part('left-head', cylinder(28, 233.2, 10).rotate([0, 1, 0], 90).translate(-547, 0, 350).translate(0, 0, -0.5).scale(scale).color(steel));
p.part('right-head', cylinder(28, 233.2, 10).rotate([0, 1, 0], 90).translate(519, 0, 350).translate(0, 0, -0.5).scale(scale).color(steel));
p.part('skid-rail-left', box(945, 30, 35, true).translate(0, -132, 18).translate(0, 0, -0.5).scale(scale).color(safetyPaint));
p.part('skid-rail-right', box(945, 30, 35, true).translate(0, 132, 18).translate(0, 0, -0.5).scale(scale).color(safetyPaint));
p.part('saddle-0', box(95, 517, 90, true).translate(-294, 0, 118.8).translate(0, 0, -0.5).scale(scale).color(safetyPaint));
p.part('saddle-foot-0', box(130, 561, 18, true).translate(-294, 0, 10).translate(0, 0, -0.5).scale(scale).color(steel));
p.part('saddle-1', box(95, 517, 90, true).translate(294, 0, 118.8).translate(0, 0, -0.5).scale(scale).color(safetyPaint));
p.part('saddle-foot-1', box(130, 561, 18, true).translate(294, 0, 10).translate(0, 0, -0.5).scale(scale).color(steel));
p.part('top-port-0', cylinder(78, 30.8, 10).translate(-294, 0, 566).translate(0, 0, -0.5).scale(scale).color(steel));
p.part('port-flange-0', cylinder(16, 46.2, 10).translate(-294, 0, 623).translate(0, 0, -0.5).scale(scale).color(steel));
p.part('top-port-1', cylinder(78, 30.8, 10).translate(294, 0, 566).translate(0, 0, -0.5).scale(scale).color(steel));
p.part('port-flange-1', cylinder(16, 46.2, 10).translate(294, 0, 623).translate(0, 0, -0.5).scale(scale).color(steel));
p.part('pressure-gauge', cylinder(26, 42, 10).rotate([1, 0, 0], 90).translate(147, -167.4, 429.2).translate(0, 0, -0.5).scale(scale).color(gaugeGlass));
p.part('drain', cylinder(62, 19.8, 10).translate(0, 0, 18).translate(0, 0, -0.5).scale(scale).color(safetyPaint));

return p.model();
