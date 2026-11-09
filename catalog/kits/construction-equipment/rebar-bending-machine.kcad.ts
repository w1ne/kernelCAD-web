// SPDX-License-Identifier: CC0-1.0
// The table bender is recognized by its roller-pin bending disc, geared drive,
// feed supports, safety stop, and separate foot pedal. Bar form and table
// extension alter the work setup rather than recoloring the same block.
meta({
  name: 'rebar-bending-machine',
  license: 'CC0-1.0',
  title: 'Rebar bending machine',
  description: 'Portable table rebar bender with a roller-pin bending disc, geared motor, feed rollers, two-sided support table, guarded stop switch and separate foot pedal. Choose a hook or stirrup bar form and compact or extended table. Material controls: equipment enamel, structural steel, rebar steel and grip rubber; highVisibility and siteBlue presets.',
  tags: ['construction equipment', 'rebar', 'steel bending', 'reinforcement', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const workTable = param('workTable', 'compact', { choices: ['compact', 'extended'], label: 'Feed table reach' });
const barForm = param('barForm', 'hook', { choices: ['hook', 'stirrup'], label: 'Bent rebar form' });
const equipmentEnamel = param('equipmentEnamel', '#e1a31b', { label: 'Equipment enamel' });
const structuralSteel = param('structuralSteel', '#89969a', { label: 'Structural steel' });
const rebarSteel = param('rebarSteel', '#596267', { label: 'Rebar steel' });
const gripRubber = param('gripRubber', '#24282a', { label: 'Control pedal rubber' });
presets({
  highVisibility: { equipmentEnamel: '#f06b26', structuralSteel: '#c1c7c2', rebarSteel: '#596267', gripRubber: '#202326' },
  siteBlue: { equipmentEnamel: '#2a63a8', structuralSteel: '#b8c1c2', rebarSteel: '#464e51', gripRubber: '#222628' },
});

const extended = workTable.value === 'extended';
const tableWidth = extended ? 1240 : 820;
const p = assembly('rebar-bending-machine');
const colorMaterial = (shape, finish) => {
  if (finish === equipmentEnamel) return shape.color(equipmentEnamel);
  if (finish === structuralSteel) return shape.color(structuralSteel);
  if (finish === rebarSteel) return shape.color(rebarSteel);
  if (finish === gripRubber) return shape.color(gripRubber);
  return shape.color(finish);
};
const add = (name, shape, finish) => p.part(name, colorMaterial(shape.translate(0, 0, -13).scale(scale), finish));
const boxAt = (x, y, z, w, d, h) => box(w, d, h, true).translate(x, y, z);
const barBetween = (a, b, r, n = 10) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const length = Math.hypot(dx, dy, dz);
  return cylinder(length, r, n)
    .rotateY((Math.acos(dz / length) * 180) / Math.PI)
    .rotateZ((Math.atan2(dy, dx) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};

// A framed stand with feet and cross rails leaves the gearbox visible under
// the table. The table grows outward when the feed-reach choice is extended.
for (const x of [-300, 300]) {
  for (const y of [-205, 205]) {
    add(`stand-leg-${x}-${y}`, boxAt(x, y, 215, 52, 52, 370), structuralSteel);
    add(`leveling-foot-${x}-${y}`, cylinder(35, 36, 10).translate(x, y, 28), structuralSteel);
  }
}
for (const y of [-205, 205]) add(`lower-crossrail-${y}`, boxAt(0, y, 95, 620, 44, 42), structuralSteel);
add('working-table', boxAt(0, 0, 414, tableWidth, 510, 42), structuralSteel);
add('front-table-edge', boxAt(0, -244, 382, tableWidth, 24, 30), equipmentEnamel);
add('drive-cabinet', boxAt(-208, 0, 278, 310, 352, 228), equipmentEnamel);
add('gearbox-cover', boxAt(-148, 0, 426, 190, 258, 88), equipmentEnamel);
add('motor-fan-grille', cylinder(26, 78, 12).rotateY(90).translate(-371, 0, 292), structuralSteel);
add('emergency-stop-body', boxAt(-322, -28, 474, 64, 72, 86), structuralSteel);
add('emergency-stop-mushroom', cylinder(26, 38, 12).translate(-322, -28, 532), equipmentEnamel);

// Circular bending plate, center mandrel, and removable roller-pin set.
const tableX = 144;
add('bending-disc', cylinder(36, 174, 24).translate(tableX, 28, 438), equipmentEnamel);
add('disc-rim', cylinder(14, 184, 24).subtract(cylinder(16, 167, 24)).translate(tableX, 28, 448), structuralSteel);
add('center-mandrel', cylinder(110, 30, 12).translate(tableX, 28, 474), structuralSteel);
for (let k = 0; k < 5; k++) {
  const angle = (-45 + k * 22.5) * Math.PI / 180;
  const px = tableX + 112 * Math.cos(angle);
  const py = 28 + 112 * Math.sin(angle);
  add(`bending-roller-${k}`, cylinder(62, 28, 12).translate(px, py, 454), structuralSteel);
  add(`roller-cap-${k}`, cylinder(8, 17, 12).translate(px, py, 514), equipmentEnamel);
}
for (const side of [-1, 1]) {
  const y = side * 208;
  add(`feed-roller-${side}`, cylinder(65, 34, 12).rotateX(90).translate(352, y, 462), structuralSteel);
  add(`feed-guide-${side}`, boxAt(355, y, 520, 112, 34, 48), equipmentEnamel);
}

// A bent bar shows what the rollers act on; compact and extended modes keep
// the bend on the disc while moving the long support rollers outboard.
const zBar = 536;
const hookPoints = [[86, 28, zBar], [280, 28, zBar], [328, -18, zBar], [328, -178, zBar]];
const stirrupPoints = [[70, -12, zBar], [268, -12, zBar], [330, -74, zBar], [330, -208, zBar], [128, -208, zBar]];
const points = barForm.value === 'stirrup' ? stirrupPoints : hookPoints;
for (let i = 0; i < points.length - 1; i++) {
  add(`formed-rebar-${i}`, barBetween(points[i], points[i + 1], 12, 8), rebarSteel);
}
if (extended) {
  for (const side of [-1, 1]) {
    const x0 = side * 330, x1 = side * (tableWidth / 2 - 30);
    add(`extension-rail-${side}`, barBetween([x0, side * 90, 420], [x1, side * 90, 420], 22), equipmentEnamel);
    add(`extension-support-${side}`, barBetween([x1, side * 90, 58], [x1, side * 90, 420], 18), structuralSteel);
    add(`extension-roller-${side}`, cylinder(tableWidth * 0.14, 28, 12).rotateX(90).translate(x1 - side * 18, side * 90, 462), structuralSteel);
  }
}

// The hands-free control is a separate floor pedal with a protected cable.
add('pedal-cable', barBetween([-306, -110, 344], [-350, -284, 112], 8), structuralSteel);
add('pedal-base', boxAt(-350, -310, 28, 150, 210, 30), structuralSteel);
add('foot-pedal', box(100, 144, 34, true).rotateX(12).translate(-350, -310, 72), gripRubber);
add('pedal-guard', barBetween([-425, -394, 34], [-275, -394, 34], 10), equipmentEnamel);

return p.model();
