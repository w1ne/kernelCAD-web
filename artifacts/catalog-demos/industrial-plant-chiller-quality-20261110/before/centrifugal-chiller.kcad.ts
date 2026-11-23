// SPDX-License-Identifier: CC0-1.0
// Industrial chiller package with two compressor domes, condenser barrels and pipe connections.
meta({
  name: 'centrifugal-chiller',
  license: 'CC0-1.0',
  title: 'Centrifugal chiller',
  description: 'Industrial chiller package with two compressor domes, condenser barrels and pipe connections. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#657c83', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e4a940', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('centrifugal-chiller');
p.part('base-frame', box(780, 490, 35, true).translate(0, 0, 18).translate(0, 0, -0.5).scale(scale).color(safetyPaint));
p.part('main-casing', box(717.6, 441, 360, true).translate(0, 0, 200).translate(0, 0, -0.5).scale(scale).color(steel));
p.part('service-section-0', box(179.4, 455.7, 290, true).translate(-234, 0, 205).translate(0, 0, -0.5).scale(scale).color(steel));
p.part('inspection-door-0', box(101.4, 14, 150, true).translate(-234, -230.3, 200).translate(0, 0, -0.5).scale(scale).color(safetyPaint));
p.part('service-section-1', box(179.4, 455.7, 290, true).translate(0, 0, 205).translate(0, 0, -0.5).scale(scale).color(safetyPaint));
p.part('inspection-door-1', box(101.4, 14, 150, true).translate(0, -230.3, 200).translate(0, 0, -0.5).scale(scale).color(safetyPaint));
p.part('compressor-dome-0', cylinder(175, 63.7, 12).translate(-241.8, 0, 390).translate(0, 0, -0.5).scale(scale).color(safetyPaint));
p.part('compressor-dome-1', cylinder(175, 63.7, 12).translate(241.8, 0, 390).translate(0, 0, -0.5).scale(scale).color(safetyPaint));
p.part('support-foot-0', box(55, 45, 85, true).translate(-304.2, -176.4, 44).translate(0, 0, -0.5).scale(scale).color(steel));
p.part('support-foot-1', box(55, 45, 85, true).translate(304.2, -176.4, 44).translate(0, 0, -0.5).scale(scale).color(steel));
p.part('support-foot-2', box(55, 45, 85, true).translate(-304.2, 176.4, 44).translate(0, 0, -0.5).scale(scale).color(steel));
p.part('support-foot-3', box(55, 45, 85, true).translate(304.2, 176.4, 44).translate(0, 0, -0.5).scale(scale).color(steel));
p.part('pipe-header', cylinder(249.6, 24, 10).rotate([0, 1, 0], 90).translate(93.6, 0, 95).translate(0, 0, -0.5).scale(scale).color(safetyPaint));

return p.model();
