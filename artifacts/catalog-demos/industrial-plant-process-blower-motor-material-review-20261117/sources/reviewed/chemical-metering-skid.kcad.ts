// SPDX-License-Identifier: CC0-1.0
// Chemical dosing skid with paired metering pumps, a shared manifold, gauges and a raised control box.
meta({
  name: 'chemical-metering-skid',
  license: 'CC0-1.0',
  title: 'Chemical metering skid',
  description: 'Chemical dosing skid with paired metering pumps, a shared manifold, gauges and a raised control box. Controls: overall scale, steel, safety paint, gauge glass.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#687c83', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e2a747', { label: 'Safety paint' });
const gaugeGlass = param('gaugeGlass', '#91c6c8', { label: 'Gauge glass' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f', gaugeGlass: '#78989b' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('chemical-metering-skid');
p.part('base-skid', box(760, 390, 40, true).translate(0, 0, 20).scale(scale).color(safetyPaint));
p.part('common-header', cylinder(668.8, 32, 10).rotate([0, 1, 0], 90).translate(-334.4, 120.9, 279.5).scale(scale).color(steel));
p.part('metering-pump-0', box(155, 150, 172, true).translate(-182.4, -46.8, 94.6).scale(scale).color(steel));
p.part('pump-diaphragm-0', cylinder(58, 60, 10).translate(-182.4, -46.8, 275.2).scale(scale).color(safetyPaint));
p.part('suction-line-0', cylinder(172, 16, 10).translate(-182.4, -46.8, 262.3).scale(scale).color(steel));
p.part('dose-valve-0', cylinder(50, 28, 10).translate(-182.4, 117, 258).scale(scale).color(safetyPaint));
p.part('metering-pump-1', box(155, 150, 172, true).translate(182.4, -46.8, 94.6).scale(scale).color(steel));
p.part('pump-diaphragm-1', cylinder(58, 60, 10).translate(182.4, -46.8, 275.2).scale(scale).color(safetyPaint));
p.part('suction-line-1', cylinder(172, 16, 10).translate(182.4, -46.8, 262.3).scale(scale).color(steel));
p.part('dose-valve-1', cylinder(50, 28, 10).translate(182.4, 117, 258).scale(scale).color(safetyPaint));
p.part('control-box', box(210, 120, 190, true).translate(273.6, -105.3, 227.9).scale(scale).color(safetyPaint));
p.part('control-display', box(90, 12, 54, true).translate(273.6, -132.6, 275.2).scale(scale).color(gaugeGlass));
p.part('cross-member', box(668.8, 24, 22, true).translate(0, 0, 150.5).scale(scale).color(steel));

return p.model();
