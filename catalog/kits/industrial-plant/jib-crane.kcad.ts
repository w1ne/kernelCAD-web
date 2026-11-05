// SPDX-License-Identifier: CC0-1.0
// Floor-mounted jib crane with a base plate, mast, cantilevered boom, brace and chain block.
meta({
  name: 'jib-crane',
  license: 'CC0-1.0',
  title: 'Jib crane',
  description: 'Floor-mounted jib crane with a base plate, mast, cantilevered boom, brace and chain block. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#708088', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e6ad42', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('jib-crane');
p.part('base-rail-left', box(610, 42, 34, true).translate(0, -136.4, 17).scale(scale).color(safetyPaint));
p.part('base-rail-right', box(610, 42, 34, true).translate(0, 136.4, 17).scale(scale).color(safetyPaint));
p.part('mast', cylinder(688.8, 38, 10).translate(-183, 0, 36).scale(scale).color(steel));
p.part('boom', box(610, 44, 42, true).translate(0, 0, 672.4).scale(scale).color(safetyPaint));
p.part('brace', box(427, 24, 22, true).rotate([0, 1, 0], -24).translate(-42.7, 0, 475.6).scale(scale).color(steel));
p.part('hoist', box(120, 110, 88, true).translate(195.2, 0, 639.6).scale(scale).color(safetyPaint));
p.part('chain', cylinder(254.2, 10, 8).translate(195.2, 0, 393.6).scale(scale).color(steel));
p.part('hook', box(38, 24, 45, true).translate(195.2, 0, 131.2).scale(scale).color(safetyPaint));

return p.model();
