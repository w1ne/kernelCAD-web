// SPDX-License-Identifier: CC0-1.0
// Industrial process blower with a broad intake housing, drive motor and raised discharge duct.
meta({
  name: 'process-blower',
  license: 'CC0-1.0',
  title: 'Process blower',
  description: 'Industrial process blower with a broad intake housing, drive motor and raised discharge duct. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#697d86', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#dfa744', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('process-blower');
p.part('base', box(611, 418, 35, true).translate(0, 0, 18).scale(scale).color(safetyPaint));
p.part('volute-housing', box(329, 258.4, 308.2, true).translate(0, 0, 193.2).scale(scale).color(steel));
p.part('inlet-flange', cylinder(30, 117.5, 10).rotate([1, 0, 0], 90).translate(0, -121.8, 207).scale(scale).color(safetyPaint));
p.part('inlet', cylinder(100, 75.2, 10).rotate([1, 0, 0], 90).translate(0, -94.4, 207).scale(scale).color(steel));
p.part('outlet-stack', cylinder(193.2, 56.4, 10).translate(112.8, 0, 331.2).scale(scale).color(safetyPaint));
p.part('drive-motor', cylinder(291.4, 78.2, 10).rotate([0, 1, 0], 90).translate(-394.8, 0, 147.2).scale(scale).color(safetyPaint));
p.part('coupler', cylinder(65, 46, 8).rotate([0, 1, 0], 90).translate(-107.7, 0, 147.2).scale(scale).color(steel));
p.part('anchor-0', box(30, 34, 70, true).translate(-173.9, -136.8, 35).scale(scale).color(steel));
p.part('anchor-1', box(30, 34, 70, true).translate(173.9, -136.8, 35).scale(scale).color(steel));
p.part('anchor-2', box(30, 34, 70, true).translate(-173.9, 136.8, 35).scale(scale).color(steel));
p.part('anchor-3', box(30, 34, 70, true).translate(173.9, 136.8, 35).scale(scale).color(steel));

return p.model();
