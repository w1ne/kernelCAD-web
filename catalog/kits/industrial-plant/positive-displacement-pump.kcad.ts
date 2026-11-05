// SPDX-License-Identifier: CC0-1.0
// Compact positive-displacement pump with a ribbed gearbox, inlet flange and pressure bypass.
meta({
  name: 'positive-displacement-pump',
  license: 'CC0-1.0',
  title: 'Positive displacement pump',
  description: 'Compact positive-displacement pump with a ribbed gearbox, inlet flange and pressure bypass. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#647985', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e2a747', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('positive-displacement-pump');
p.part('skid', box(480, 250, 38, true).translate(0, 0, 19).scale(scale).color(safetyPaint));
p.part('motor-foot', box(216, 145, 32, true).translate(-86.4, 0, 54).scale(scale).color(steel));
p.part('motor', cylinder(201.6, 74.4, 12).rotate([0, 1, 0], 90).translate(-196.8, 0, 164.3).scale(scale).color(steel));
p.part('coupling', cylinder(70, 40.3, 8).rotate([0, 1, 0], 90).translate(-6.2, 0, 164.3).scale(scale).color(safetyPaint));
p.part('coupling-guard', box(100, 145, 52, true).translate(28.8, 0, 164.3).scale(scale).color(steel));
p.part('gearbox', box(134.4, 155, 173.6, true).translate(139.2, 0, 170.5).scale(scale).color(safetyPaint));
p.part('pump-head', cylinder(124, 60, 10).translate(148.8, 0, 124).scale(scale).color(steel));
p.part('inlet', cylinder(175, 32.5, 10).rotate([0, 1, 0], 90).translate(114.1, 0, 133.3).scale(scale).color(safetyPaint));
p.part('outlet', cylinder(71.3, 30, 10).translate(144, 0, 241.8).scale(scale).color(safetyPaint));
p.part('outlet-flange', cylinder(18, 50, 10).translate(144, 0, 297.6).scale(scale).color(steel));

return p.model();
