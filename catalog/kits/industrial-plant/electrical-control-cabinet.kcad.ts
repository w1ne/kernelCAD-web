// SPDX-License-Identifier: CC0-1.0
// Floor-standing control cabinet with twin doors, vent slots, indicator lamps and a plinth.
meta({
  name: 'electrical-control-cabinet',
  license: 'CC0-1.0',
  title: 'Electrical control cabinet',
  description: 'Floor-standing control cabinet with twin doors, vent slots, indicator lamps and a plinth. Controls: overall scale, steel, safety paint, gauge glass.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#687a83', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#dfa746', { label: 'Safety paint' });
const gaugeGlass = param('gaugeGlass', '#91c6c8', { label: 'Gauge glass' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f', gaugeGlass: '#78989b' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('electrical-control-cabinet');
p.part('plinth', box(473, 248.4, 48, true).translate(0, 0, 24).scale(scale).color(safetyPaint));
p.part('enclosure', box(430, 230, 720, true).translate(0, 0, 408).scale(scale).color(steel));
p.part('door-0', box(180.6, 14, 590.4, true).translate(-107.5, -117.3, 386.4).scale(scale).color(safetyPaint));
p.part('handle-0', box(15, 20, 122.4, true).translate(-51.6, -131.1, 372).scale(scale).color(steel));
p.part('door-1', box(180.6, 14, 590.4, true).translate(107.5, -117.3, 386.4).scale(scale).color(steel));
p.part('handle-1', box(15, 20, 122.4, true).translate(163.4, -131.1, 372).scale(scale).color(steel));
p.part('vent-slot-0', box(86, 10, 10, true).translate(-129, -124.2, 220.8).scale(scale).color(safetyPaint));
p.part('vent-slot-1', box(86, 10, 10, true).translate(-43, -124.2, 220.8).scale(scale).color(safetyPaint));
p.part('vent-slot-2', box(86, 10, 10, true).translate(43, -124.2, 220.8).scale(scale).color(safetyPaint));
p.part('vent-slot-3', box(86, 10, 10, true).translate(129, -124.2, 220.8).scale(scale).color(safetyPaint));
p.part('display', box(107.5, 16, 86, true).translate(107.5, -124.2, 573.6).scale(scale).color(gaugeGlass));
p.part('indicator-0', cylinder(18, 12, 8).translate(-129, -131.1, 588).scale(scale).color(steel));
p.part('indicator-1', cylinder(18, 12, 8).translate(-98, -131.1, 588).scale(scale).color(steel));
p.part('indicator-2', cylinder(18, 12, 8).translate(-67, -131.1, 588).scale(scale).color(steel));

return p.model();
