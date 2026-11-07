// SPDX-License-Identifier: CC0-1.0
// Modular machine guard with mesh-like infill panels, a framed service door and corner feet.
meta({
  name: 'machine-guard-enclosure',
  license: 'CC0-1.0',
  title: 'Machine guard enclosure',
  description: 'Modular machine guard with mesh-like infill panels, a framed service door and corner feet. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#727f83', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e4ae49', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('machine-guard-enclosure');
p.part('floor-frame', box(720, 580, 32, true).translate(0, 0, 16).scale(scale).color(safetyPaint));
p.part('corner-post--331-2--266-8', box(24, 24, 780, true).translate(-331.2, -266.8, 390).scale(scale).color(steel));
p.part('corner-foot--331-2--266-8', box(80, 80, 18, true).translate(-331.2, -266.8, 9).scale(scale).color(safetyPaint));
p.part('corner-post--331-2-266-8', box(24, 24, 780, true).translate(-331.2, 266.8, 390).scale(scale).color(steel));
p.part('corner-foot--331-2-266-8', box(80, 80, 18, true).translate(-331.2, 266.8, 9).scale(scale).color(safetyPaint));
p.part('corner-post-331-2--266-8', box(24, 24, 780, true).translate(331.2, -266.8, 390).scale(scale).color(steel));
p.part('corner-foot-331-2--266-8', box(80, 80, 18, true).translate(331.2, -266.8, 9).scale(scale).color(safetyPaint));
p.part('corner-post-331-2-266-8', box(24, 24, 780, true).translate(331.2, 266.8, 390).scale(scale).color(steel));
p.part('corner-foot-331-2-266-8', box(80, 80, 18, true).translate(331.2, 266.8, 9).scale(scale).color(safetyPaint));
p.part('rear-mesh-frame', box(676.8, 20, 639.6, true).translate(0, 261, 405.6).scale(scale).color(safetyPaint));
p.part('side-panel-left', box(18, 261, 639.6, true).translate(-324, 0, 405.6).scale(scale).color(safetyPaint));
p.part('side-panel-right', box(18, 261, 639.6, true).translate(324, 0, 405.6).scale(scale).color(safetyPaint));
p.part('door-panel', box(230.4, 18, 561.6, true).translate(-180, -261, 366.6).scale(scale).color(steel));
p.part('top-rail', box(720, 32, 32, true).translate(0, 0, 772).scale(scale).color(steel));

return p.model();
