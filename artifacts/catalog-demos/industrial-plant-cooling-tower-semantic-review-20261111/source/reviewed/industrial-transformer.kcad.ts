// SPDX-License-Identifier: CC0-1.0
// An oil-filled distribution transformer with finned cooling banks, ribbed
// porcelain bushings, copper terminals, lifting lugs and wheel skids.
meta({
  name: 'industrial-transformer',
  license: 'CC0-1.0',
  title: 'Industrial distribution transformer',
  description: 'Oil-filled transformer with adjustable radiator fin count, cooling banks, ribbed bushings, copper terminals and wheel skids. Controls: scale, radiator fins, tank paint, steel, porcelain, copper.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const radiatorFins = param('radiatorFins', '8', { choices: ['6', '8', '10'], label: 'Radiator fins per bank' });
const tankPaint = param('tankPaint', '#687c72', { label: 'Tank paint' });
const steel = param('steel', '#68747a', { label: 'Frame and radiator steel' });
const porcelain = param('porcelain', '#d5c6a3', { label: 'Porcelain insulation' });
const copper = param('copper', '#a66b42', { label: 'Copper terminals' });

presets({
  weathered: { tankPaint: '#615b4d', steel: '#89857c', porcelain: '#b7a98d', copper: '#80583f' },
  highVisibility: { tankPaint: '#d7733e', steel: '#c0c6c7', porcelain: '#eee2c3', copper: '#b87342' },
  utilityGreen: { tankPaint: '#4b7060', steel: '#8d999a', porcelain: '#ddd1b2', copper: '#a56c43' },
});

const finCount = Number(radiatorFins.value);
const p = assembly('industrial-transformer');

p.part('wheel-skid', box(604, 441, 35, true).translate(0, 0, 18).scale(scale).color(steel));
p.part('transformer-tank', box(403, 315, 414, true).translate(0, 0, 268).scale(scale).color(tankPaint));
p.part('tank-top-seam', box(414, 326, 10, true).translate(0, 0, 471).scale(scale).color(steel));

// Two matched banks of thin cooling plates break up the broad tank sides.
for (const side of [-1, 1]) {
  for (let i = 0; i < finCount; i++) {
    const x = finCount === 1 ? 0 : -168 + (336 * i) / (finCount - 1);
    p.part(`radiator-bank-${side}-fin-${i + 1}`, box(13, 82, 300, true).translate(x, side * 194, 255).scale(scale).color(steel));
  }
  p.part(`radiator-header-${side}`, box(372, 22, 26, true).translate(0, side * 194, 416).scale(scale).color(steel));
  p.part(`radiator-footer-${side}`, box(372, 22, 26, true).translate(0, side * 194, 94).scale(scale).color(steel));
}

// Four feet bridge the tank to the skid. The two rail wheels stay outside the tank body.
for (const x of [-168, 168]) {
  for (const y of [-126, 126]) {
    p.part(`tank-foot-${x}-${y}`, box(32, 30, 48, true).translate(x, y, 43).scale(scale).color(steel));
  }
}
for (const x of [-190, 190]) {
  p.part(`skid-wheel-${x}`, cylinder(32, 55, 12).translate(0, 0, -16).rotate([1, 0, 0], 90).translate(x, 192, 55).scale(scale).color(steel));
  p.part(`skid-wheel-hub-${x}`, cylinder(36, 23, 12).translate(0, 0, -18).rotate([1, 0, 0], 90).translate(x, 211, 55).scale(scale).color(copper));
}

// Each high-voltage porcelain bushing has a tapered stack of visible shed ribs.
for (const [index, x] of [-132, 0, 132].entries()) {
  const baseZ = 472;
  p.part(`hv-bushing-stem-${index + 1}`, cylinder(130, 22, 12).translate(x, -22, baseZ).scale(scale).color(porcelain));
  for (let rib = 0; rib < 5; rib++) {
    const radius = 35 - rib * 2;
    p.part(`hv-bushing-${index + 1}-shed-${rib + 1}`, cylinder(12, radius, 12).translate(x, -22, baseZ + 28 + rib * 19).scale(scale).color(porcelain));
  }
  p.part(`hv-terminal-${index + 1}`, cylinder(34, 15, 10).translate(x, -22, baseZ + 123).scale(scale).color(copper));
  p.part(`hv-terminal-bolt-${index + 1}`, cylinder(12, 8, 8).translate(x, -22, baseZ + 157).scale(scale).color(steel));
}

// Short secondary bushings sit in a separate row behind the primary terminals.
for (const [index, x] of [-174, -58, 58, 174].entries()) {
  const baseZ = 472;
  p.part(`lv-bushing-stem-${index + 1}`, cylinder(92, 15, 12).translate(x, 98, baseZ).scale(scale).color(porcelain));
  for (let rib = 0; rib < 3; rib++) {
    p.part(`lv-bushing-${index + 1}-shed-${rib + 1}`, cylinder(10, 25 - rib * 2, 12).translate(x, 98, baseZ + 24 + rib * 16).scale(scale).color(porcelain));
  }
  p.part(`lv-terminal-${index + 1}`, cylinder(26, 11, 10).translate(x, 98, baseZ + 80).scale(scale).color(copper));
}

// Paired lifting ears and a front oil-level sight glass make the tank fittings visible.
for (const x of [-218, 218]) {
  p.part(`lifting-ear-${x}`, box(28, 34, 58, true).translate(x, 0, 518).scale(scale).color(steel));
}
p.part('oil-level-sight', cylinder(92, 10, 10).translate(120, -159, 300).scale(scale).color(porcelain));
p.part('oil-sight-guard-upper', box(38, 12, 10, true).translate(120, -169, 394).scale(scale).color(steel));
p.part('oil-sight-guard-lower', box(38, 12, 10, true).translate(120, -169, 298).scale(scale).color(steel));

return p.model();
