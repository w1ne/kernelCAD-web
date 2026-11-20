// SPDX-License-Identifier: CC0-1.0
// Adjustable 900 to 1800 mm schematic ladder section, default 1035 mm, with eight rungs and an open wraparound cage. CC0 visualization only, not manufacturer CAD or a safety-rated access-ladder design.
meta({
  name: 'vertical-cage-ladder',
  license: 'CC0-1.0',
  title: 'Vertical cage ladder',
  description: 'Adjustable 900 to 1800 mm schematic ladder section, default 1035 mm, with eight rungs and an open wraparound cage. CC0 visualization only, not manufacturer CAD or a safety-rated access-ladder design. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const sectionHeight = param('sectionHeight', 1035, { label: 'Section height', unit: 'mm', min: 900, max: 1800, step: 5 });
const railHeight = sectionHeight - 105;
const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#6f7f85', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e2a846', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('vertical-cage-ladder');
for (const side of [-1, 1]) {
  p.part(`ladder-rail-${side}`, box(24, 24, railHeight, true)
    .translate(side * 88.2, 0, railHeight / 2).scale(scale).color(steel));
}
for (let i = 0; i < 8; i++) {
  const z = Math.round((35 + i * (railHeight - 70) / 7) * 10) / 10;
  p.part(`rung-${i}`, box(193.2, 26, 18, true).translate(0, 0, z).scale(scale).color(safetyPaint));
}
// Open U-shaped straps wrap around the clear climbing corridor in the XY plane.
// The ends overlap the ladder rails; the centre stays empty through every hoop.
const cageStrap = () => path()
  .moveTo(-100.2, -12).lineTo(-167.2, 96).lineTo(-167.2, 216)
  .lineTo(-108, 296).lineTo(108, 296).lineTo(167.2, 216)
  .lineTo(167.2, 96).lineTo(100.2, -12)
  .lineTo(88.2, 0).lineTo(151.2, 100).lineTo(151.2, 210)
  .lineTo(100, 280).lineTo(-100, 280).lineTo(-151.2, 210)
  .lineTo(-151.2, 100).lineTo(-88.2, 0).close().extrude(16);
for (const [i, fraction] of [0.35, 0.5, 0.65, 0.8].entries()) {
  const z = railHeight * fraction;
  p.part(`safety-hoop-${i}`, cageStrap().translate(0, 0, z - 8).scale(scale).color(safetyPaint));
}
for (const [i, [x, y]] of [[-159.2, 155], [159.2, 155], [0, 288]].entries()) {
  p.part(`cage-upright-${i}`, box(16, 16, railHeight * 0.45 + 16, true)
    .translate(x, y, railHeight * 0.575).scale(scale).color(safetyPaint));
}
p.part('top-grab-left', box(18, 22, 110, true).translate(-88.2, 0, railHeight + 50).scale(scale).color(safetyPaint));
p.part('top-grab-right', box(18, 22, 110, true).translate(88.2, 0, railHeight + 50).scale(scale).color(safetyPaint));

return p.model();
