// SPDX-License-Identifier: CC0-1.0
// Raised maintenance platform with toe boards, guarded perimeter, access ladder and braced legs.
meta({
  name: 'maintenance-platform',
  license: 'CC0-1.0',
  title: 'Maintenance platform',
  description: 'Raised maintenance platform with toe boards, guarded perimeter, access ladder and braced legs. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#738087', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e0a33f', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('maintenance-platform');
p.part('deck', box(620, 540, 28, true).translate(0, 0, 660).scale(scale).color(safetyPaint));
p.part('post--260-4--226-79999999999998', box(32, 32, 660, true).translate(-260.4, -226.8, 330).scale(scale).color(steel));
p.part('base-foot--260-4--226-79999999999998', box(82, 82, 18, true).translate(-260.4, -226.8, 9).scale(scale).color(safetyPaint));
p.part('post--260-4-226-79999999999998', box(32, 32, 660, true).translate(-260.4, 226.8, 330).scale(scale).color(steel));
p.part('base-foot--260-4-226-79999999999998', box(82, 82, 18, true).translate(-260.4, 226.8, 9).scale(scale).color(safetyPaint));
p.part('post-260-4--226-79999999999998', box(32, 32, 660, true).translate(260.4, -226.8, 330).scale(scale).color(steel));
p.part('base-foot-260-4--226-79999999999998', box(82, 82, 18, true).translate(260.4, -226.8, 9).scale(scale).color(safetyPaint));
p.part('post-260-4-226-79999999999998', box(32, 32, 660, true).translate(260.4, 226.8, 330).scale(scale).color(steel));
p.part('base-foot-260-4-226-79999999999998', box(82, 82, 18, true).translate(260.4, 226.8, 9).scale(scale).color(safetyPaint));
p.part('rail-long--1', box(620, 18, 22, true).translate(0, -253.8, 765).scale(scale).color(safetyPaint));
p.part('mid-rail--1--1', box(620, 14, 18, true).translate(0, -253.8, 720).scale(scale).color(steel));
p.part('mid-rail--1-1', box(620, 14, 18, true).translate(0, -253.8, 720).scale(scale).color(steel));
p.part('rail-long-1', box(620, 18, 22, true).translate(0, 253.8, 765).scale(scale).color(safetyPaint));
p.part('mid-rail-1--1', box(620, 14, 18, true).translate(0, 253.8, 720).scale(scale).color(steel));
p.part('mid-rail-1-1', box(620, 14, 18, true).translate(0, 253.8, 720).scale(scale).color(steel));
p.part('access-step', box(150, 160, 34, true).translate(359.6, -178.2, 18).scale(scale).color(steel));

return p.model();
