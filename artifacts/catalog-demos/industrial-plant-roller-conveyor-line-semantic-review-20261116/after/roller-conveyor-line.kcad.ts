// SPDX-License-Identifier: CC0-1.0
// Straight gravity conveyor with transverse steel rollers, side rails and three support stations.
meta({
  name: 'roller-conveyor-line',
  license: 'CC0-1.0',
  title: 'Roller conveyor line',
  description: 'Straight gravity conveyor with transverse steel rollers, side rails and three support stations. Controls: overall scale, structural steel, roller steel and safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#707f84', { label: 'Structural steel' });
const rollerSteel = param('rollerSteel', '#b7c1c3', { label: 'Roller steel' });
const safetyPaint = param('safetyPaint', '#e4ab47', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', rollerSteel: '#7d8583', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('roller-conveyor-line');
for (const [side, y] of [['left', -165.6], ['right', 165.6]] as const) {
  p.part(`side-rail-${side}`, box(920, 30, 50, true).translate(0, y, 320).scale(scale).color(safetyPaint));
  for (const [station, x] of [['front', -349.6], ['middle', 0], ['rear', 349.6]] as const) {
    p.part(`support-${side}-${station}`, box(26, 26, 282, true).translate(x, y, 155).scale(scale).color(steel));
    p.part(`foot-${side}-${station}`, box(74, 70, 18, true).translate(x, y, 9).scale(scale).color(safetyPaint));
  }
}

// Eleven crosswise rollers leave an open bed so loads sit on rotating steel cylinders.
for (const [index, x] of [-400, -320, -240, -160, -80, 0, 80, 160, 240, 320, 400].entries()) {
  p.part(`roller-${index}`, cylinder(310, 22, 8).rotate([1, 0, 0], 90).translate(x, 155, 323).scale(scale).color(rollerSteel));
}

return p.model();
