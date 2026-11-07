// SPDX-License-Identifier: CC0-1.0
// Pipe rack bay with cross-braced uprights, a raised service beam and three parallel utility lines.
meta({
  name: 'pipe-rack-bay',
  license: 'CC0-1.0',
  title: 'Pipe rack bay',
  description: 'Pipe rack bay with cross-braced uprights, a raised service beam and three parallel utility lines. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#707d84', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e2a844', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('pipe-rack-bay');
p.part('support-column--1', box(48, 48, 740, true).translate(0, -226.8, 370).scale(scale).color(steel));
p.part('baseplate--1', box(125, 125, 22, true).translate(0, -226.8, 11).scale(scale).color(safetyPaint));
p.part('crossbeam--1', box(880, 44, 46, true).translate(0, -226.8, 606.8).scale(scale).color(safetyPaint));
p.part('brace--1', box(651.2, 28, 25, true).rotate([0, 1, 0], -12).translate(0, -226.8, 318.2).scale(scale).color(steel));
p.part('support-column-1', box(48, 48, 740, true).translate(0, 226.8, 370).scale(scale).color(steel));
p.part('baseplate-1', box(125, 125, 22, true).translate(0, 226.8, 11).scale(scale).color(safetyPaint));
p.part('crossbeam-1', box(880, 44, 46, true).translate(0, 226.8, 606.8).scale(scale).color(safetyPaint));
p.part('brace-1', box(651.2, 28, 25, true).rotate([0, 1, 0], 12).translate(0, 226.8, 318.2).scale(scale).color(steel));
p.part('pipe-run-0', cylinder(932.8, 34, 10).rotate([0, 1, 0], 90).translate(-466.4, -151.2, 636.4).scale(scale).color(steel));
p.part('pipe-flange-0', cylinder(18, 55, 10).rotate([0, 1, 0], 90).translate(334.2, -151.2, 636.4).scale(scale).color(safetyPaint));
p.part('pipe-run-1', cylinder(932.8, 42, 10).rotate([0, 1, 0], 90).translate(-466.4, 0, 636.4).scale(scale).color(safetyPaint));
p.part('pipe-flange-1', cylinder(18, 55, 10).rotate([0, 1, 0], 90).translate(334.2, 0, 636.4).scale(scale).color(safetyPaint));
p.part('pipe-run-2', cylinder(932.8, 50, 10).rotate([0, 1, 0], 90).translate(-466.4, 151.2, 636.4).scale(scale).color(steel));
p.part('pipe-flange-2', cylinder(18, 55, 10).rotate([0, 1, 0], 90).translate(334.2, 151.2, 636.4).scale(scale).color(safetyPaint));

return p.model();
