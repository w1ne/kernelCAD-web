// SPDX-License-Identifier: CC0-1.0
// Spring-loaded pressure relief valve with inlet flange, bonnet, adjustment cap and lift lever.
meta({
  name: 'pressure-relief-valve',
  license: 'CC0-1.0',
  title: 'Pressure relief valve',
  description: 'Spring-loaded pressure relief valve with inlet flange, bonnet, adjustment cap and lift lever. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#788189', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e3aa46', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('pressure-relief-valve');
p.part('inlet-flange', cylinder(30, 120, 12).translate(0, 0, 15).translate(0, 0, -15).scale(scale).color(safetyPaint));
p.part('inlet-neck', cylinder(110, 69.6, 10).translate(0, 0, 70).translate(0, 0, -15).scale(scale).color(steel));
p.part('valve-body', cylinder(135, 98.4, 10).translate(0, 0, 140).translate(0, 0, -15).scale(scale).color(safetyPaint));
p.part('bonnet', cylinder(155.8, 50.4, 10).translate(0, 0, 265).translate(0, 0, -15).scale(scale).color(steel));
p.part('spring-cap', cylinder(42, 76.8, 10).translate(0, 0, 388).translate(0, 0, -15).scale(scale).color(safetyPaint));
p.part('lift-lever', cylinder(252, 16, 10).rotate([0, 1, 0], 90).translate(-12, 0, 328).translate(0, 0, -15).scale(scale).color(steel));
p.part('outlet', cylinder(192, 45.6, 10).rotate([1, 0, 0], 90).translate(0, 150, 213.2).translate(0, 0, -15).scale(scale).color(safetyPaint));
p.part('outlet-flange', cylinder(18, 72, 10).rotate([1, 0, 0], 90).translate(0, 141, 213.2).translate(0, 0, -15).scale(scale).color(steel));
p.part('spring-band-0', cylinder(12, 57.6, 8).translate(0, 0, 258.3).translate(0, 0, -15).scale(scale).color(safetyPaint));
p.part('spring-band-1', cylinder(12, 57.6, 8).translate(0, 0, 282.3).translate(0, 0, -15).scale(scale).color(safetyPaint));
p.part('spring-band-2', cylinder(12, 57.6, 8).translate(0, 0, 306.3).translate(0, 0, -15).scale(scale).color(safetyPaint));

return p.model();
