// SPDX-License-Identifier: CC0-1.0
// Warehouse forklift with a raised mast, overhead guard, counterweight, paired wheels and forks.
meta({
  name: 'forklift-truck',
  license: 'CC0-1.0',
  title: 'Forklift truck',
  description: 'Warehouse forklift with a raised mast, overhead guard, counterweight, paired wheels and forks. Controls: overall scale, steel, safety paint, rubber.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'vehicle',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#758187', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e4a43c', { label: 'Safety paint' });
const rubber = param('rubber', '#30363a', { label: 'Rubber' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f', rubber: '#27292b' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('forklift-truck');
p.part('chassis', box(660, 340, 105, true).translate(0, 0, 90).scale(scale).color(steel));
p.part('counterweight', box(184.8, 346.8, 180, true).translate(-217.8, 0, 210).scale(scale).color(safetyPaint));
p.part('operator-seat', box(155, 150, 70, true).translate(-19.8, 0, 245).scale(scale).color(safetyPaint));
p.part('overhead-guard-roof', box(448.8, 312.8, 30, true).translate(-13.2, 0, 582.4).scale(scale).color(safetyPaint));
p.part('guard-post-rear--1', box(26, 26, 352, true).translate(-198, -122.4, 403.2).scale(scale).color(steel));
p.part('guard-post-front--1', box(26, 26, 352, true).translate(165, -122.4, 403.2).scale(scale).color(steel));
p.part('rear-wheel--1', cylinder(52, 82, 8).rotate([1, 0, 0], 90).translate(-184.8, -147.4, 82).scale(scale).color(rubber));
p.part('front-wheel--1', cylinder(58, 100, 8).rotate([1, 0, 0], 90).translate(158.4, -144.4, 100).scale(scale).color(rubber));
p.part('mast-rail--1', box(30, 30, 473.6, true).translate(264, -115.6, 262.4).scale(scale).color(safetyPaint));
p.part('guard-post-rear-1', box(26, 26, 352, true).translate(-198, 122.4, 403.2).scale(scale).color(steel));
p.part('guard-post-front-1', box(26, 26, 352, true).translate(165, 122.4, 403.2).scale(scale).color(steel));
p.part('rear-wheel-1', cylinder(52, 82, 8).rotate([1, 0, 0], 90).translate(-184.8, 199.4, 82).scale(scale).color(rubber));
p.part('front-wheel-1', cylinder(58, 100, 8).rotate([1, 0, 0], 90).translate(158.4, 202.4, 100).scale(scale).color(rubber));
p.part('mast-rail-1', box(30, 30, 473.6, true).translate(264, 115.6, 262.4).scale(scale).color(safetyPaint));
p.part('mast-carriage', box(38, 272, 224, true).translate(283.8, 0, 371.2).scale(scale).color(steel));
p.part('fork--1', box(363, 54, 34, true).translate(462, -85, 44).scale(scale).color(safetyPaint));
p.part('fork-1', box(363, 54, 34, true).translate(462, 85, 44).scale(scale).color(safetyPaint));

return p.model();
