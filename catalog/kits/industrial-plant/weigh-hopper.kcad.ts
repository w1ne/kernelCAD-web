// SPDX-License-Identifier: CC0-1.0
// Batch weigh hopper with a broad upper bin, load-cell supports, tapered rectangular discharge chute and outlet gate.
meta({
  name: 'weigh-hopper',
  license: 'CC0-1.0',
  title: 'Weigh hopper',
  description: 'Batch weigh hopper with a broad upper bin, load-cell supports, tapered rectangular discharge chute and outlet gate. Controls: overall scale, steel, safety paint, wear liner.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#748089', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e0a747', { label: 'Safety paint' });
const liner = param('liner', '#50666b', { label: 'Wear liner' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f', liner: '#3f5054' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('weigh-hopper');
p.part('upper-bin', box(520, 440, 292.8, true).translate(0, 0, 414.8).scale(scale).color(steel));
p.part('top-rim', box(561.6, 475.2, 28, true).translate(0, 0, 567.3).scale(scale).color(safetyPaint));
const chamferedRectangle = (width: number, depth: number, corner: number) => path()
  .moveTo(-width / 2 + corner, -depth / 2)
  .lineTo(width / 2 - corner, -depth / 2)
  .lineTo(width / 2, -depth / 2 + corner)
  .lineTo(width / 2, depth / 2 - corner)
  .lineTo(width / 2 - corner, depth / 2)
  .lineTo(-width / 2 + corner, depth / 2)
  .lineTo(-width / 2, depth / 2 - corner)
  .lineTo(-width / 2, -depth / 2 + corner)
  .close();
const hopperTransition = chamferedRectangle(450, 380, 34).loft([
  chamferedRectangle(300, 245, 28),
  chamferedRectangle(165, 135, 18),
  chamferedRectangle(128, 98, 16),
], {
  planes: [268, 190, 105, 70].map((z) => ({
    plane: 'XY' as const,
    origin: [0, 0, z] as [number, number, number],
  })),
  ruled: true,
});
p.part('hopper-transition', hopperTransition.scale(scale).color(liner));
p.part('outlet', cylinder(62, 62.4, 10).translate(0, 0, 0).scale(scale).color(safetyPaint));
p.part('support-leg-0', box(30, 30, 414.8, true).translate(-218.4, -184.8, 207.4).scale(scale).color(steel));
p.part('foot-0', box(84, 76, 18, true).translate(-218.4, -184.8, 9).scale(scale).color(safetyPaint));
p.part('support-leg-1', box(30, 30, 414.8, true).translate(218.4, -184.8, 207.4).scale(scale).color(steel));
p.part('foot-1', box(84, 76, 18, true).translate(218.4, -184.8, 9).scale(scale).color(safetyPaint));
p.part('support-leg-2', box(30, 30, 414.8, true).translate(-218.4, 184.8, 207.4).scale(scale).color(steel));
p.part('foot-2', box(84, 76, 18, true).translate(-218.4, 184.8, 9).scale(scale).color(safetyPaint));
p.part('support-leg-3', box(30, 30, 414.8, true).translate(218.4, 184.8, 207.4).scale(scale).color(steel));
p.part('foot-3', box(84, 76, 18, true).translate(218.4, 184.8, 9).scale(scale).color(safetyPaint));
p.part('slide-gate', box(228.8, 154, 24, true).translate(0, 0, 82).scale(scale).color(safetyPaint));

return p.model();
