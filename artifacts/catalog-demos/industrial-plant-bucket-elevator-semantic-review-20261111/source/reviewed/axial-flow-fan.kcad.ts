// SPDX-License-Identifier: CC0-1.0
// Axial flow fan with a faceted shroud, central hub, support frame and adjustable service mount.
meta({
  name: 'axial-flow-fan',
  license: 'CC0-1.0',
  title: 'Axial flow fan',
  description: 'Axial flow fan with a faceted shroud, central hub, support frame and adjustable service mount. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#708087', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e5ad48', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('axial-flow-fan');
p.part('mounting-base', box(625, 216, 28, true).translate(0, 0, 14).scale(scale).color(safetyPaint));
p.part('fan-support', box(30, 34, 297, true).translate(0, 0, 151.2).scale(scale).color(steel));
const fanShroud = cylinder(180, 250, 12).subtract(cylinder(182, 229, 12).translate(0, 0, -1)).rotate([1, 0, 0], 90).translate(0, 90, 367.2).scale(scale).color(steel);
p.part('fan-shroud', fanShroud);
const fanRim = cylinder(24, 275, 12).subtract(cylinder(26, 229, 12).translate(0, 0, -1)).rotate([1, 0, 0], 90).translate(0, -78, 367.2).scale(scale).color(safetyPaint);
p.part('front-rim', fanRim);
p.part('hub', cylinder(153, 60, 8).rotate([1, 0, 0], 90).translate(0, 76.5, 367.2).scale(scale).color(safetyPaint));
const fanBladeProfile = path()
  .moveTo(56, -22)
  .lineTo(188, -8)
  .lineTo(193, 12)
  .lineTo(91, 28)
  .close();
for (let blade = 0; blade < 5; blade++) {
  p.part('fan-blade-' + blade, fanBladeProfile.extrude(14).rotateX(90).rotateY(blade * 72).translate(0, 0, 367.2).scale(scale).color(steel));
}
p.part('support-brace--1', box(375, 22, 18, true).rotate([0, 1, 0], -18).translate(-77.5, 0, 221.4).scale(scale).color(safetyPaint));
p.part('support-brace-1', box(375, 22, 18, true).rotate([0, 1, 0], 18).translate(77.5, 0, 221.4).scale(scale).color(safetyPaint));

return p.model();
