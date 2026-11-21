// SPDX-License-Identifier: CC0-1.0
// Self-closing industrial access gate with a hinge post, framed infill and raised toe plate.
meta({
  name: 'steel-access-gate',
  license: 'CC0-1.0',
  title: 'Steel access gate',
  description: 'Self-closing industrial access gate with a hinge post, framed infill and raised toe plate. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#718087', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e3a744', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('steel-access-gate');
p.part('hinge-post', box(42, 58, 520, true).translate(-218.4, 0, 260).scale(scale).color(steel));
p.part('latch-post', box(42, 58, 520, true).translate(218.4, 0, 260).scale(scale).color(steel));
p.part('gate-top', box(420, 100, 28, true).translate(0, 0, 473.2).scale(scale).color(safetyPaint));
p.part('gate-bottom', box(420, 100, 28, true).translate(0, 0, 130).scale(scale).color(safetyPaint));
p.part('gate-panel', box(386.4, 42, 286, true).translate(0, 0, 306.8).scale(scale).color(steel));
p.part('infill-bar-0', box(14, 56, 291.2, true).translate(-159.6, 0, 306.8).scale(scale).color(safetyPaint));
p.part('infill-bar-1', box(14, 56, 291.2, true).translate(-79.8, 0, 306.8).scale(scale).color(safetyPaint));
p.part('infill-bar-2', box(14, 56, 291.2, true).translate(0, 0, 306.8).scale(scale).color(safetyPaint));
p.part('infill-bar-3', box(14, 56, 291.2, true).translate(79.8, 0, 306.8).scale(scale).color(safetyPaint));
p.part('infill-bar-4', box(14, 56, 291.2, true).translate(159.6, 0, 306.8).scale(scale).color(safetyPaint));
p.part('toe-plate', box(386.4, 110, 88.4, true).translate(0, 0, 72.8).scale(scale).color(safetyPaint));

return p.model();
