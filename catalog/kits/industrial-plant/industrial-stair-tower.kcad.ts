// SPDX-License-Identifier: CC0-1.0
// Compact industrial stair tower with two landings, open treads, guard rails and cross braces.
meta({
  name: 'industrial-stair-tower',
  license: 'CC0-1.0',
  title: 'Industrial stair tower',
  description: 'Compact industrial stair tower with two landings, open treads, guard rails and cross braces. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#738087', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#dfa747', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('industrial-stair-tower');
p.part('tower-post--1', box(30, 30, 920, true).translate(-184.8, 0, 460).scale(scale).color(steel));
p.part('tower-post-1', box(30, 30, 920, true).translate(184.8, 0, 460).scale(scale).color(steel));
p.part('lower-landing', box(420, 310, 26, true).translate(0, -136.4, 322).scale(scale).color(safetyPaint));
p.part('upper-landing', box(420, 310, 26, true).translate(0, 136.4, 754.4).scale(scale).color(safetyPaint));
p.part('stair-stringer-left', box(22, 22, 478.4, true).rotate([1, 0, 0], -30).translate(-134.4, 0, 524.4).scale(scale).color(steel));
p.part('stair-stringer-right', box(22, 22, 478.4, true).rotate([1, 0, 0], -30).translate(134.4, 0, 524.4).scale(scale).color(steel));
p.part('tread-0', box(277.2, 74, 20, true).translate(0, -204.6, 312.8).scale(scale).color(safetyPaint));
p.part('tread-1', box(277.2, 74, 20, true).translate(0, -158.1, 371.7).scale(scale).color(safetyPaint));
p.part('tread-2', box(277.2, 74, 20, true).translate(0, -111.6, 430.6).scale(scale).color(safetyPaint));
p.part('tread-3', box(277.2, 74, 20, true).translate(0, -65.1, 489.4).scale(scale).color(safetyPaint));
p.part('tread-4', box(277.2, 74, 20, true).translate(0, -18.6, 548.3).scale(scale).color(safetyPaint));
p.part('tread-5', box(277.2, 74, 20, true).translate(0, 27.9, 607.2).scale(scale).color(safetyPaint));
p.part('tread-6', box(277.2, 74, 20, true).translate(0, 74.4, 666.1).scale(scale).color(safetyPaint));
p.part('upper-guard--1', box(16, 297.6, 78, true).translate(-189, 136.4, 791.2).scale(scale).color(steel));
p.part('upper-guard-1', box(16, 297.6, 78, true).translate(189, 136.4, 791.2).scale(scale).color(steel));
p.part('cross-brace', box(310.8, 20, 18, true).translate(0, 0, 478.4).scale(scale).color(safetyPaint));

return p.model();
