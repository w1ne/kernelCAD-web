// SPDX-License-Identifier: CC0-1.0
// Horizontal centrifugal pump with a volute housing, guarded coupling, motor and mounting skid.
meta({
  name: 'centrifugal-pump',
  license: 'CC0-1.0',
  title: 'Centrifugal process pump',
  description: 'Horizontal centrifugal pump with a volute housing, guarded coupling, motor and mounting skid. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#597785', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e7ad42', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('centrifugal-pump');
p.part('skid', box(620, 240, 38, true).translate(0, 0, 19).scale(scale).color(safetyPaint));
p.part('motor-foot', box(279, 139.2, 32, true).translate(-111.6, 0, 54).scale(scale).color(steel));
p.part('motor', cylinder(260.4, 72, 12).rotate([0, 1, 0], 90).translate(-254.2, 0, 159).scale(scale).color(steel));
p.part('coupling', cylinder(70, 39, 8).rotate([0, 1, 0], 90).translate(2.2, 0, 159).scale(scale).color(safetyPaint));
p.part('coupling-guard', box(100, 139.2, 52, true).translate(37.2, 0, 159).scale(scale).color(steel));
p.part('volute', sphere(57.6).translate(186, 0, 156).scale(scale).color(safetyPaint));
p.part('pump-neck', cylinder(96, 43.2, 10).translate(186, 0, 201).scale(scale).color(steel));
p.part('inlet', cylinder(168, 31.2, 10).rotate([0, 1, 0], 90).translate(176.4, 0, 129).scale(scale).color(safetyPaint));
p.part('outlet', cylinder(69, 28.8, 10).translate(186, 0, 234).scale(scale).color(safetyPaint));
p.part('outlet-flange', cylinder(18, 48, 10).translate(186, 0, 288).scale(scale).color(steel));

return p.model();
