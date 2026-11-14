// SPDX-License-Identifier: CC0-1.0
// Palletizing robot cell with a six-axis arm, pallet table, access gate and safety fence.
meta({
  name: 'palletizer-robot-cell',
  license: 'CC0-1.0',
  title: 'Palletizer robot cell',
  description: 'Palletizing robot cell with a six-axis arm, pallet table, access gate and safety fence. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#6b7d84', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e9a43b', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('palletizer-robot-cell');
p.part('cell-floor', box(860, 740, 28, true).translate(0, 0, 14).scale(scale).color(safetyPaint));
p.part('pallet-table', box(301, 259, 170, true).translate(-232.2, 148, 100).scale(scale).color(steel));
p.part('fence-post--1', box(24, 24, 744.8, true).translate(-387, 273.8, 382.2).scale(scale).color(safetyPaint));
p.part('fence-panel--1', box(16, 407, 607.6, true).translate(-387, 0, 421.4).scale(scale).color(steel));
p.part('fence-post-1', box(24, 24, 744.8, true).translate(387, 273.8, 382.2).scale(scale).color(safetyPaint));
p.part('fence-panel-1', box(16, 407, 607.6, true).translate(387, 0, 421.4).scale(scale).color(steel));
p.part('robot-pedestal', box(190, 190, 155, true).translate(172, -148, 92).scale(scale).color(safetyPaint));
p.part('robot-waist', cylinder(85, 92, 10).translate(172, -148, 168).scale(scale).color(steel));
p.part('robot-upper-arm', box(220, 100, 115, true).rotate([0, 1, 0], -28).translate(172, -148, 300).scale(scale).color(safetyPaint));
p.part('elbow-joint', sphere(67).translate(361.2, -148, 410).scale(scale).color(steel));
p.part('robot-forearm', box(210, 82, 92, true).rotate([0, 1, 0], 28).translate(412.8, -148, 515).scale(scale).color(safetyPaint));
p.part('gripper', box(110, 145, 50, true).translate(464.4, -148, 600).scale(scale).color(steel));
p.part('gate-leaf', box(326.8, 18, 656.6, true).translate(-249.4, -340.4, 343).scale(scale).color(safetyPaint));

return p.model();
