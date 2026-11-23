// SPDX-License-Identifier: CC0-1.0
// Enclosed baghouse with filter media inside the plenum, a tapered dust hopper,
// supported housing, service walkway and induced-draft fan.
meta({
  name: 'baghouse-dust-collector',
  license: 'CC0-1.0',
  title: 'Baghouse dust collector',
  description: 'Baghouse collector with enclosed filter media, a tapered dust hopper and outlet, supported plenum, service walkway and induced-draft fan. Controls: scale, steel and safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#748088', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#dfa344', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('baghouse-dust-collector');
p.part('collector-plenum', box(620, 360, 478.4, true).translate(0, 0, 598).scale(scale).color(steel));
// The bags are filter media inside the sheet-metal plenum, not tubes on its roof.
p.part('access-roof', box(669.6, 388.8, 28, true).translate(0, 0, 849.2).scale(scale).color(safetyPaint));
p.part('filter-bag-0', cylinder(257.6, 36, 8).translate(-210.8, -100.8, 488).scale(scale).color('#c3b280'));
p.part('filter-bag-1', cylinder(257.6, 36, 8).translate(0, -100.8, 488).scale(scale).color('#c3b280'));
p.part('filter-bag-2', cylinder(257.6, 36, 8).translate(210.8, -100.8, 488).scale(scale).color('#c3b280'));
p.part('filter-bag-3', cylinder(257.6, 36, 8).translate(-210.8, 100.8, 488).scale(scale).color('#c3b280'));
p.part('filter-bag-4', cylinder(257.6, 36, 8).translate(0, 100.8, 488).scale(scale).color('#c3b280'));
p.part('filter-bag-5', cylinder(257.6, 36, 8).translate(210.8, 100.8, 488).scale(scale).color('#c3b280'));

// Four legs reach the collector body. The hopper walls overlap the plenum and
// meet at a short discharge throat instead of hanging as a separate cylinder.
for (const x of [-320, 320]) {
  for (const y of [-120, 120]) {
    p.part(`support-leg-${x}-${y}`, box(40, 40, 370, true).translate(x, y, 185).scale(scale).color(safetyPaint));
  }
}
const prismY = (pts, y0, y1) => extrudePolygon(pts, y1 - y0).rotateX(90).translate(0, y1, 0);
const prismX = (pts, x0, x1) => extrudePolygon(pts, x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);
const hopperFrontProfile = [[-280, 370], [280, 370], [75, 140], [-75, 140]];
const hopperSideProfile = [[-145, 370], [145, 370], [65, 140], [-65, 140]];
p.part('hopper-front', prismY(hopperFrontProfile, -165, -145).scale(scale).color(steel));
p.part('hopper-back', prismY(hopperFrontProfile, 145, 165).scale(scale).color(steel));
p.part('hopper-left', prismX(hopperSideProfile, -300, -280).scale(scale).color(steel));
p.part('hopper-right', prismX(hopperSideProfile, 280, 300).scale(scale).color(steel));
p.part('hopper-discharge', box(150, 130, 92, true).translate(0, 0, 120).scale(scale).color(steel));
p.part('dust-outlet', cylinder(80, 42, 10).translate(0, 0, 12).scale(scale).color(steel));
p.part('fan-duct', cylinder(220, 52, 10).rotate([0, 1, 0], 90).translate(237.2, 0, 671.6).scale(scale).color(safetyPaint));
p.part('fan-motor', cylinder(180, 42, 10).rotate([0, 1, 0], 90).translate(362.6, 0, 671.6).scale(scale).color(steel));
p.part('service-walkway', box(775, 65, 22, true).translate(0, -208.8, 441.6).scale(scale).color(safetyPaint));
p.part('walkway-rail', box(775, 14, 62, true).translate(0, -237.6, 478.4).scale(scale).color(steel));

return p.model();
