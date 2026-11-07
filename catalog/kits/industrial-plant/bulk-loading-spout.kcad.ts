// SPDX-License-Identifier: CC0-1.0
// Bulk loading spout with a telescoping-looking outlet, overhead frame and dust skirt.
meta({
  name: 'bulk-loading-spout',
  license: 'CC0-1.0',
  title: 'Bulk loading spout',
  description: 'Bulk loading spout with a telescoping-looking outlet, overhead frame and dust skirt. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#76838a', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e0aa49', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('bulk-loading-spout');
p.part('support-beam', box(612, 56, 46, true).translate(0, 0, 799.8).scale(scale).color(safetyPaint));
p.part('frame-post-left', box(42, 42, 739.6, true).translate(-238, 0, 369.8).scale(scale).color(steel));
p.part('frame-post-right', box(42, 42, 739.6, true).translate(238, 0, 369.8).scale(scale).color(steel));
p.part('fixed-chute', cylinder(412.8, 64.6, 10).translate(0, 0, 421.4).scale(scale).color(safetyPaint));
p.part('telescoping-tube', cylinder(292.4, 44.2, 10).translate(0, 0, 137.6).scale(scale).color(steel));
p.part('dust-skirt', cylinder(70, 78.2, 8).translate(0, 0, 10).scale(scale).color(safetyPaint));
p.part('hoist-motor', box(160, 130, 90, true).translate(0, -128, 705.2).scale(scale).color(steel));
p.part('cross-brace', cylinder(408, 16, 10).rotate([0, 1, 0], 90).translate(-204, 0, 481.6).scale(scale).color(safetyPaint));

return p.model();
