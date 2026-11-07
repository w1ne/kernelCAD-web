// SPDX-License-Identifier: CC0-1.0
// Gravity roller conveyor section with a sturdy side frame, repeated rollers and end stops.
meta({
  name: 'roller-conveyor-line',
  license: 'CC0-1.0',
  title: 'Roller conveyor line',
  description: 'Gravity roller conveyor section with a sturdy side frame, repeated rollers and end stops. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#707f84', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e4ab47', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('roller-conveyor-line');
p.part('side-frame--1', box(920, 30, 55, true).translate(0, -165.6, 228).scale(scale).color(safetyPaint));
p.part('support--1-0', box(26, 26, 210, true).translate(-349.6, -122.4, 108).scale(scale).color(steel));
p.part('foot--1-0', box(74, 70, 18, true).translate(-349.6, -122.4, 9).scale(scale).color(safetyPaint));
p.part('support--1-1', box(26, 26, 210, true).translate(0, -122.4, 108).scale(scale).color(steel));
p.part('foot--1-1', box(74, 70, 18, true).translate(0, -122.4, 9).scale(scale).color(safetyPaint));
p.part('support--1-2', box(26, 26, 210, true).translate(349.6, -122.4, 108).scale(scale).color(steel));
p.part('foot--1-2', box(74, 70, 18, true).translate(349.6, -122.4, 9).scale(scale).color(safetyPaint));
p.part('side-frame-1', box(920, 30, 55, true).translate(0, 165.6, 228).scale(scale).color(safetyPaint));
p.part('support-1-0', box(26, 26, 210, true).translate(-349.6, 122.4, 108).scale(scale).color(steel));
p.part('foot-1-0', box(74, 70, 18, true).translate(-349.6, 122.4, 9).scale(scale).color(safetyPaint));
p.part('support-1-1', box(26, 26, 210, true).translate(0, 122.4, 108).scale(scale).color(steel));
p.part('foot-1-1', box(74, 70, 18, true).translate(0, 122.4, 9).scale(scale).color(safetyPaint));
p.part('support-1-2', box(26, 26, 210, true).translate(349.6, 122.4, 108).scale(scale).color(steel));
p.part('foot-1-2', box(74, 70, 18, true).translate(349.6, 122.4, 9).scale(scale).color(safetyPaint));
p.part('conveyor-deck', box(920, 295.2, 22, true).translate(0, 0, 300).scale(scale).color(steel));
p.part('roller-0', cylinder(324, 22, 8).rotate([0, 1, 0], 90).translate(-548.4, 0, 324).scale(scale).color(safetyPaint));
p.part('roller-1', cylinder(324, 22, 8).rotate([0, 1, 0], 90).translate(-451.8, 0, 324).scale(scale).color(safetyPaint));
p.part('roller-2', cylinder(324, 22, 8).rotate([0, 1, 0], 90).translate(-355.2, 0, 324).scale(scale).color(safetyPaint));
p.part('roller-3', cylinder(324, 22, 8).rotate([0, 1, 0], 90).translate(-258.6, 0, 324).scale(scale).color(safetyPaint));
p.part('roller-4', cylinder(324, 22, 8).rotate([0, 1, 0], 90).translate(-162, 0, 324).scale(scale).color(safetyPaint));
p.part('roller-5', cylinder(324, 22, 8).rotate([0, 1, 0], 90).translate(-65.4, 0, 324).scale(scale).color(safetyPaint));
p.part('roller-6', cylinder(324, 22, 8).rotate([0, 1, 0], 90).translate(31.2, 0, 324).scale(scale).color(safetyPaint));
p.part('roller-7', cylinder(324, 22, 8).rotate([0, 1, 0], 90).translate(127.8, 0, 324).scale(scale).color(safetyPaint));
p.part('roller-8', cylinder(324, 22, 8).rotate([0, 1, 0], 90).translate(224.4, 0, 324).scale(scale).color(safetyPaint));

return p.model();
