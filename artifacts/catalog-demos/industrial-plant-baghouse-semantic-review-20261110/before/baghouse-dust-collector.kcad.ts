// SPDX-License-Identifier: CC0-1.0
// Baghouse collector with filter tubes, a hopper bottom, service platform and induced-draft fan.
meta({
  name: 'baghouse-dust-collector',
  license: 'CC0-1.0',
  title: 'Baghouse dust collector',
  description: 'Baghouse collector with filter tubes, a hopper bottom, service platform and induced-draft fan. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#748088', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#dfa344', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('baghouse-dust-collector');
p.part('collector-plenum', box(620, 360, 478.4, true).translate(0, 0, 598).scale(scale).color(steel));
p.part('access-roof', box(669.6, 388.8, 28, true).translate(0, 0, 855.6).scale(scale).color(safetyPaint));
p.part('filter-bag-0', cylinder(257.6, 36, 8).translate(-210.8, -100.8, 837.2).scale(scale).color(safetyPaint));
p.part('filter-bag-1', cylinder(257.6, 36, 8).translate(0, -100.8, 837.2).scale(scale).color(safetyPaint));
p.part('filter-bag-2', cylinder(257.6, 36, 8).translate(210.8, -100.8, 837.2).scale(scale).color(safetyPaint));
p.part('filter-bag-3', cylinder(257.6, 36, 8).translate(-210.8, 100.8, 837.2).scale(scale).color(safetyPaint));
p.part('filter-bag-4', cylinder(257.6, 36, 8).translate(0, 100.8, 837.2).scale(scale).color(safetyPaint));
p.part('filter-bag-5', cylinder(257.6, 36, 8).translate(210.8, 100.8, 837.2).scale(scale).color(safetyPaint));
p.part('support--1', box(36, 36, 184, true).translate(-229.4, 0, 92).scale(scale).color(safetyPaint));
p.part('support-1', box(36, 36, 184, true).translate(229.4, 0, 92).scale(scale).color(safetyPaint));
p.part('hopper', cylinder(185, 173.6, 10).translate(0, 0, 50).scale(scale).color(steel));
p.part('fan-duct', cylinder(220, 52, 10).rotate([0, 1, 0], 90).translate(237.2, 0, 671.6).scale(scale).color(safetyPaint));
p.part('fan-motor', cylinder(180, 42, 10).rotate([0, 1, 0], 90).translate(362.6, 0, 671.6).scale(scale).color(steel));
p.part('service-walkway', box(775, 65, 22, true).translate(0, -208.8, 441.6).scale(scale).color(safetyPaint));
p.part('walkway-rail', box(775, 14, 62, true).translate(0, -237.6, 478.4).scale(scale).color(steel));

return p.model();
