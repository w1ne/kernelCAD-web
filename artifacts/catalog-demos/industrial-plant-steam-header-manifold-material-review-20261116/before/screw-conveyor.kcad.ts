// SPDX-License-Identifier: CC0-1.0
// Inclined screw conveyor with an enclosed tube, drive gearbox, feed hopper and support saddles.
meta({
  name: 'screw-conveyor',
  license: 'CC0-1.0',
  title: 'Screw conveyor',
  description: 'Inclined screw conveyor with an enclosed tube, drive gearbox, feed hopper and support saddles. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#6f7d83', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e1a742', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('screw-conveyor');
p.part('conveyor-tube', cylinder(810, 95, 12).rotate([0, 1, 0], 90).translate(-405, 0, 243.6).translate(0, 0, 5.957).scale(scale).color(steel));
p.part('drive-motor', cylinder(153.9, 74.1, 10).rotate([0, 1, 0], 90).translate(-530.6, 0, 243.6).translate(0, 0, 5.957).scale(scale).color(safetyPaint));
p.part('feed-hopper', box(199.5, 199.5, 161.5, true).translate(-267.3, 0, 117.6).translate(0, 0, 5.957).scale(scale).color(safetyPaint));
p.part('discharge-collar', box(72, 180.5, 171, true).translate(388.8, 0, 260.4).translate(0, 0, 5.957).scale(scale).color(safetyPaint));
p.part('saddle-leg-0', box(30, 32, 126, true).rotate([0, 1, 0], -14).translate(-178.2, 0, 58.8).translate(0, 0, 5.957).scale(scale).color(steel));
p.part('support-foot-0', box(115, 80, 18, true).translate(-178.2, 0, 9).translate(0, 0, 5.957).scale(scale).color(safetyPaint));
p.part('saddle-leg-1', box(30, 32, 126, true).rotate([0, 1, 0], -14).translate(243, 0, 58.8).translate(0, 0, 5.957).scale(scale).color(steel));
p.part('support-foot-1', box(115, 80, 18, true).translate(243, 0, 9).translate(0, 0, 5.957).scale(scale).color(safetyPaint));

return p.model();
