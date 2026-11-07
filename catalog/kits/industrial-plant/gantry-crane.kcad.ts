// SPDX-License-Identifier: CC0-1.0
// Mobile gantry crane with paired portal frames, caster trucks, crossbeam and chain hoist.
meta({
  name: 'gantry-crane',
  license: 'CC0-1.0',
  title: 'Gantry crane',
  description: 'Mobile gantry crane with paired portal frames, caster trucks, crossbeam and chain hoist. Controls: overall scale, steel, safety paint, rubber.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#748087', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e7ad43', { label: 'Safety paint' });
const rubber = param('rubber', '#30363a', { label: 'Rubber' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f', rubber: '#27292b' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('gantry-crane');
p.part('base-rail-left', box(840, 42, 34, true).translate(0, -268.4, 17).translate(0, 0, 6).scale(scale).color(safetyPaint));
p.part('base-rail-right', box(840, 42, 34, true).translate(0, 268.4, 17).translate(0, 0, 6).scale(scale).color(safetyPaint));
p.part('portal-leg-front--1', box(42, 42, 705.2, true).rotate([0, 1, 0], -8).translate(-352.8, -256.2, 352.6).translate(0, 0, 6).scale(scale).color(steel));
p.part('portal-leg-back--1', box(42, 42, 705.2, true).rotate([0, 1, 0], 8).translate(352.8, -256.2, 352.6).translate(0, 0, 6).scale(scale).color(steel));
p.part('caster--1', cylinder(40, 48, 8).rotate([1, 0, 0], 90).translate(0, -236.2, 42).translate(0, 0, 6).scale(scale).color(rubber));
p.part('portal-leg-front-1', box(42, 42, 705.2, true).rotate([0, 1, 0], 8).translate(-352.8, 256.2, 352.6).translate(0, 0, 6).scale(scale).color(steel));
p.part('portal-leg-back-1', box(42, 42, 705.2, true).rotate([0, 1, 0], -8).translate(352.8, 256.2, 352.6).translate(0, 0, 6).scale(scale).color(steel));
p.part('caster-1', cylinder(40, 48, 8).rotate([1, 0, 0], 90).translate(0, 276.2, 42).translate(0, 0, 6).scale(scale).color(rubber));
p.part('bridge-beam', box(58, 634.4, 72, true).translate(0, 0, 705.2).translate(0, 0, 6).scale(scale).color(steel));
p.part('trolley', box(220, 190, 80, true).translate(0, 0, 746.2).translate(0, 0, 6).scale(scale).color(safetyPaint));
p.part('chain', cylinder(278.8, 11, 8).translate(0, 0, 459.2).translate(0, 0, 6).scale(scale).color(steel));
p.part('hook-block', box(46, 50, 70, true).translate(0, 0, 147.6).translate(0, 0, 6).scale(scale).color(safetyPaint));
p.part('hook', box(42, 24, 38, true).translate(20, 0, 90.2).translate(0, 0, 6).scale(scale).color(steel));

return p.model();
