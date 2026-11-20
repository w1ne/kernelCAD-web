// SPDX-License-Identifier: CC0-1.0
// Short 1035 mm schematic ladder section with eight rungs and an open wraparound cage. CC0 visualization only, not manufacturer CAD or a safety-rated access-ladder design.
meta({
  name: 'vertical-cage-ladder',
  license: 'CC0-1.0',
  title: 'Vertical cage ladder',
  description: 'Short 1035 mm schematic ladder section with eight rungs and an open wraparound cage. CC0 visualization only, not manufacturer CAD or a safety-rated access-ladder design. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#6f7f85', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e2a846', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('vertical-cage-ladder');
p.part('ladder-rail--1', box(24, 24, 930, true).translate(-88.2, 0, 465).scale(scale).color(steel));
p.part('ladder-rail-1', box(24, 24, 930, true).translate(88.2, 0, 465).scale(scale).color(steel));
p.part('rung-0', box(193.2, 26, 18, true).translate(0, 0, 35).scale(scale).color(safetyPaint));
p.part('rung-1', box(193.2, 26, 18, true).translate(0, 0, 157.9).scale(scale).color(safetyPaint));
p.part('rung-2', box(193.2, 26, 18, true).translate(0, 0, 280.7).scale(scale).color(safetyPaint));
p.part('rung-3', box(193.2, 26, 18, true).translate(0, 0, 403.6).scale(scale).color(safetyPaint));
p.part('rung-4', box(193.2, 26, 18, true).translate(0, 0, 526.4).scale(scale).color(safetyPaint));
p.part('rung-5', box(193.2, 26, 18, true).translate(0, 0, 649.3).scale(scale).color(safetyPaint));
p.part('rung-6', box(193.2, 26, 18, true).translate(0, 0, 772.1).scale(scale).color(safetyPaint));
p.part('rung-7', box(193.2, 26, 18, true).translate(0, 0, 895).scale(scale).color(safetyPaint));
// Open U-shaped straps wrap around the clear climbing corridor in the XY plane.
// The ends overlap the ladder rails; the centre stays empty through every hoop.
const cageStrap = () => path()
  .moveTo(-100.2, -12).lineTo(-167.2, 96).lineTo(-167.2, 216)
  .lineTo(-108, 296).lineTo(108, 296).lineTo(167.2, 216)
  .lineTo(167.2, 96).lineTo(100.2, -12)
  .lineTo(88.2, 0).lineTo(151.2, 100).lineTo(151.2, 210)
  .lineTo(100, 280).lineTo(-100, 280).lineTo(-151.2, 210)
  .lineTo(-151.2, 100).lineTo(-88.2, 0).close().extrude(16);
for (const [i, z] of [325.5, 465, 604.5, 744].entries()) {
  p.part(`safety-hoop-${i}`, cageStrap().translate(0, 0, z - 8).scale(scale).color(safetyPaint));
}
for (const [i, [x, y]] of [[-159.2, 155], [159.2, 155], [0, 288]].entries()) {
  p.part(`cage-upright-${i}`, box(16, 16, 434.5, true)
    .translate(x, y, 534.75).scale(scale).color(safetyPaint));
}
p.part('top-grab-left', box(18, 22, 110, true).translate(-88.2, 0, 980).scale(scale).color(safetyPaint));
p.part('top-grab-right', box(18, 22, 110, true).translate(88.2, 0, 980).scale(scale).color(safetyPaint));

return p.model();
