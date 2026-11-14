// SPDX-License-Identifier: CC0-1.0
// Cyclone separator with a tangential inlet, tall outlet stack and a segmented dust hopper.
meta({
  name: 'cyclone-separator',
  license: 'CC0-1.0',
  title: 'Cyclone separator',
  description: 'Cyclone separator with a tangential inlet, tall outlet stack and a segmented dust hopper. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#707e83', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e0a648', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('cyclone-separator');
p.part('barrel', cylinder(410, 250, 10).translate(0, 0, 352.6).scale(scale).color(steel));
p.part('upper-rim', cylinder(20, 270, 10).translate(0, 0, 705.2).scale(scale).color(safetyPaint));
p.part('cone-step-0', cylinder(69.7, 205, 10).translate(0, 0, 278.8).scale(scale).color(safetyPaint));
p.part('cone-step-1', cylinder(69.7, 165, 10).translate(0, 0, 213.2).scale(scale).color(steel));
p.part('cone-step-2', cylinder(69.7, 125, 10).translate(0, 0, 147.6).scale(scale).color(safetyPaint));
p.part('cone-step-3', cylinder(69.7, 85, 10).translate(0, 0, 82).scale(scale).color(steel));
p.part('outlet-stack', cylinder(369, 60, 10).translate(0, 0, 697).scale(scale).color(safetyPaint));
p.part('tangential-inlet', cylinder(312.5, 45, 10).rotate([0, 1, 0], 90).translate(61.2, 0, 549.4).scale(scale).color(safetyPaint));
p.part('leg-0', box(28, 28, 80, true).translate(200, 0, 40).scale(scale).color(steel));
p.part('leg-1', box(28, 28, 80, true).translate(-100, 173.2, 40).scale(scale).color(steel));
p.part('leg-2', box(28, 28, 80, true).translate(-100, -173.2, 40).scale(scale).color(steel));

return p.model();
