// SPDX-License-Identifier: CC0-1.0
// Braced flare stack with a service platform, ignition head and raised support frame.
meta({
  name: 'flare-stack',
  license: 'CC0-1.0',
  title: 'Flare stack',
  description: 'Braced flare stack with a service platform, ignition head and raised support frame. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#697982', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e7ac45', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('flare-stack');
p.part('foundation', cylinder(50, 189, 8).translate(0, 0, 25).scale(scale).color(safetyPaint));
p.part('stack', cylinder(1131, 70, 10).translate(0, 0, 50).scale(scale).color(steel));
p.part('top-burner', cylinder(90, 126, 10).translate(0, 0, 1181).scale(scale).color(safetyPaint));
p.part('tip', cylinder(90, 87.5, 10).translate(0, 0, 1256).scale(scale).color(steel));
p.part('platform-deck', box(560, 560, 24, true).translate(0, 0, 841).scale(scale).color(safetyPaint));
p.part('platform-rail-back', box(560, 12, 72, true).translate(0, -266, 913.5).scale(scale).color(steel));
p.part('brace-0', box(20, 20, 696, true).rotate([0, 1, 0], 12).translate(140, 0, 362.5).scale(scale).color(safetyPaint));
p.part('brace-1', box(20, 20, 696, true).rotate([0, 1, 0], -12).translate(0, 140, 362.5).scale(scale).color(safetyPaint));
p.part('brace-2', box(20, 20, 696, true).rotate([0, 1, 0], 12).translate(-140, 0, 362.5).scale(scale).color(safetyPaint));
p.part('brace-3', box(20, 20, 696, true).rotate([0, 1, 0], -12).translate(-0, -140, 362.5).scale(scale).color(safetyPaint));
p.part('ladder-rail-left', box(10, 12, 1044, true).translate(119, -126, 522).scale(scale).color(steel));
p.part('ladder-rail-right', box(10, 12, 1044, true).translate(154, -126, 522).scale(scale).color(steel));
p.part('ladder-rung-0', box(12, 39.2, 10, true).translate(136.5, -126, 72).scale(scale).color(safetyPaint));
p.part('ladder-rung-1', box(12, 39.2, 10, true).translate(136.5, -126, 176.4).scale(scale).color(safetyPaint));
p.part('ladder-rung-2', box(12, 39.2, 10, true).translate(136.5, -126, 280.8).scale(scale).color(safetyPaint));
p.part('ladder-rung-3', box(12, 39.2, 10, true).translate(136.5, -126, 385.2).scale(scale).color(safetyPaint));
p.part('ladder-rung-4', box(12, 39.2, 10, true).translate(136.5, -126, 489.6).scale(scale).color(safetyPaint));
p.part('ladder-rung-5', box(12, 39.2, 10, true).translate(136.5, -126, 594).scale(scale).color(safetyPaint));
p.part('ladder-rung-6', box(12, 39.2, 10, true).translate(136.5, -126, 698.4).scale(scale).color(safetyPaint));
p.part('ladder-rung-7', box(12, 39.2, 10, true).translate(136.5, -126, 802.8).scale(scale).color(safetyPaint));
p.part('ladder-rung-8', box(12, 39.2, 10, true).translate(136.5, -126, 907.2).scale(scale).color(safetyPaint));

return p.model();
