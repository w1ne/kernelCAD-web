// SPDX-License-Identifier: CC0-1.0
// Warehouse pallet-rack bay with braced uprights, three beam levels and safety foot plates.
meta({
  name: 'pallet-rack-bay',
  license: 'CC0-1.0',
  title: 'Pallet rack bay',
  description: 'Warehouse pallet-rack bay with braced uprights, three beam levels and safety foot plates. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#738088', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e4a43f', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('pallet-rack-bay');
p.part('upright--1', box(34, 32, 900, true).translate(-377.2, 0, 450).scale(scale).color(steel));
p.part('footplate--1', box(88, 78, 18, true).translate(-377.2, 0, 9).scale(scale).color(safetyPaint));
p.part('diagonal-brace--1', box(24, 20, 720, true).rotate([0, 1, 0], -10).translate(-377.2, 0, 432).scale(scale).color(safetyPaint));
p.part('upright-1', box(34, 32, 900, true).translate(377.2, 0, 450).scale(scale).color(steel));
p.part('footplate-1', box(88, 78, 18, true).translate(377.2, 0, 9).scale(scale).color(safetyPaint));
p.part('diagonal-brace-1', box(24, 20, 720, true).rotate([0, 1, 0], 10).translate(377.2, 0, 432).scale(scale).color(safetyPaint));
p.part('beam-front-0', box(820, 34, 42, true).translate(0, -106.4, 180).scale(scale).color(safetyPaint));
p.part('beam-back-0', box(820, 34, 42, true).translate(0, 106.4, 180).scale(scale).color(safetyPaint));
p.part('shelf-deck-0', box(705.2, 190.4, 22, true).translate(0, 0, 155).scale(scale).color(steel));
p.part('beam-front-1', box(820, 34, 42, true).translate(0, -106.4, 387).scale(scale).color(safetyPaint));
p.part('beam-back-1', box(820, 34, 42, true).translate(0, 106.4, 387).scale(scale).color(safetyPaint));
p.part('shelf-deck-1', box(705.2, 190.4, 22, true).translate(0, 0, 362).scale(scale).color(steel));
p.part('beam-front-2', box(820, 34, 42, true).translate(0, -106.4, 594).scale(scale).color(safetyPaint));
p.part('beam-back-2', box(820, 34, 42, true).translate(0, 106.4, 594).scale(scale).color(safetyPaint));
p.part('shelf-deck-2', box(705.2, 190.4, 22, true).translate(0, 0, 569).scale(scale).color(steel));

return p.model();
