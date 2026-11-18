// SPDX-License-Identifier: CC0-1.0
// Cell site cabinet: the outdoor base-station cabinet that sits on a concrete
// pad at the foot of a mast and houses the baseband, rectifiers and batteries.
// What makes it a cell-site cabinet rather than a box: a galvanized plinth with
// forklift openings, a pair of gasketed front doors with swing handles, lock
// barrels and external hinges, a louvred air intake on the door, a door-mounted
// warning label, a gabled sun roof standing off the body on spacers, a
// heat-exchanger unit with a fan guard bolted to the left side, and a bottom cable
// gland plate with feeders dropping into the pad.
// Generic visualization geometry at real size (900 x 620 x 1450 mm body),
// millimetres, Z up, doors facing -Y, ground on z = 0.

meta({
  name: "cell-site-cabinet",
  license: 'CC0-1.0',
  title: "Cell site cabinet",
  description: "Outdoor base-station cabinet: galvanized plinth with forklift openings, powder-coated body with two gasketed doors, swing handles, lock barrels and external hinges, louvred air intake, warning label, gabled sun roof on stand-off spacers, side heat-exchanger with fan guard, and a cable gland plate with feeders into the pad. Material controls: powder-coated body, galvanized plinth and hardware, heat-exchanger housing, polymer seals and cables, signage. Field-site and high-visibility presets.",
  tags: ['cell site cabinet', 'base station cabinet', 'BTS', 'outdoor enclosure', 'telecom', 'network', 'communications', 'infrastructure', 'low poly', 'scene prop', 'CC0'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coolingUnit = param('coolingUnit', 'heat-exchanger', { choices: ['heat-exchanger', 'none'], label: 'Side cooling unit' });

const powderCoat = param('powderCoat', '#c9cec9', { label: 'Body, doors and roof (powder-coated steel)' });
const galvanizedSteel = param('galvanizedSteel', '#77868d', { label: 'Plinth, hinges and spacers (galvanized steel)' });
const hvacCasing = param('hvacCasing', '#e7e8e2', { label: 'Heat-exchanger housing' });
const polymer = param('polymer', '#22292d', { label: 'Seals, handles, glands and cables (black polymer)' });
const signage = param('signage', '#f2c21b', { label: 'Warning label' });
presets({
  fieldSite: {
    powderCoat: '#7f9a8a',
    galvanizedSteel: '#8f9b9b',
    hvacCasing: '#c9d1c8',
    polymer: '#263a37',
    signage: '#f2c21b',
  },
  highVisibility: {
    powderCoat: '#e0aa18',
    galvanizedSteel: '#3a4b51',
    hvacCasing: '#e8e4d6',
    polymer: '#27363c',
    signage: '#d93a23',
  },
});

const p = assembly("cell-site-cabinet");
const add = (name, shape) => p.part(name, shape.scale(scale));
const b = (x, y, z, w, d, h) => box(w, d, h, true).translate(x, y, z + h / 2);

const orient = (shape, d, at) => {
  const len = Math.hypot(d[0], d[1], d[2]);
  return shape
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(at[0], at[1], at[2]);
};
const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
const rod = (p0, p1, r, n = 6) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  return orient(extrudePolygon(circle(r, n), Math.hypot(d[0], d[1], d[2])), d, p0);
};
// Prism along X from a [y, z] cross-section.
const prismX = (pts, len) => extrudePolygon(pts.map(([y, z]) => [-z, y]), len).rotateY(90).translate(-len / 2, 0, 0);

const W = 900;
const D = 620;
const Z0 = 110; // top of the plinth
const H = 1450;
const ZT = Z0 + H;
const FY = -D / 2; // door face

// Plinth: galvanized frame with two forklift openings front and back.
add('plinth', b(0, 0, 0, W + 40, D + 40, Z0).color(galvanizedSteel));
for (const x of [-230, 230]) {
  add(`fork-slot-front-${x}`, b(x, FY - 21, 20, 220, 4, 60).color(polymer));
  add(`fork-slot-back-${x}`, b(x, -FY + 21, 20, 220, 4, 60).color(polymer));
}

// Body and the dark gasket line that shows round and between the doors.
add('body', b(0, 0, Z0, W, D, H).color(powderCoat));
add('door-gasket', b(0, FY - 4, Z0 + 40, W - 30, 8, H - 80).color(polymer));

// Doors, each with a raised stiffening panel, swing handle and lock barrel.
for (const [side, sx] of [['left', -1], ['right', 1]]) {
  const cx = sx * (W / 4 - 2);
  add(`door-${side}`, b(cx, FY - 22, Z0 + 46, W / 2 - 22, 18, H - 92).color(powderCoat));
  add(`door-panel-${side}`, b(cx + sx * 20, FY - 28, Z0 + 520, W / 2 - 120, 6, H - 640).color(powderCoat));
  const hx = sx * 50;
  add(`handle-recess-${side}`, b(hx, FY - 26, Z0 + 640, 46, 6, 200).color(polymer));
  add(`handle-lever-${side}`, b(hx, FY - 44, Z0 + 620, 28, 24, 170).color(polymer));
  add(`lock-barrel-${side}`, rod([hx, FY - 26, Z0 + 880], [hx, FY - 44, Z0 + 880], 14, 8).color(galvanizedSteel));
  for (const z of [Z0 + 160, Z0 + H / 2, Z0 + H - 220]) {
    add(`hinge-${side}-${z}`, rod([sx * (W / 2 - 8), FY - 26, z], [sx * (W / 2 - 8), FY - 26, z + 90], 12, 8).color(galvanizedSteel));
  }
}

// Louvred air intake on the lower left door: angled blades in a frame.
add('louvre-frame', b(-240, FY - 34, Z0 + 140, 300, 8, 300).color(powderCoat));
for (let i = 0; i < 6; i += 1) {
  add(`louvre-blade-${i}`, box(270, 44, 6, true).rotateX(-35).translate(-240, FY - 52, Z0 + 175 + i * 45).color(polymer));
}

// Warning label and rating plate on the right door.
add('warning-label', extrudePolygon([[-60, 0], [60, 0], [0, 104]], 3).rotateX(90).translate(230, FY - 31, Z0 + 1060).color(signage));
add('warning-mark', b(230, FY - 35, Z0 + 1080, 10, 3, 46).color(polymer));
add('rating-plate', b(230, FY - 31, Z0 + 330, 160, 3, 90).color(galvanizedSteel));

// Gabled sun roof standing off the body on four spacers.
for (const x of [-W / 2 + 80, W / 2 - 80]) {
  for (const y of [-D / 2 + 80, D / 2 - 80]) {
    add(`roof-spacer-${x}-${y}`, rod([x, y, ZT], [x, y, ZT + 40], 18, 6).color(galvanizedSteel));
  }
}
add('roof', prismX([[-D / 2 - 50, ZT + 40], [D / 2 + 50, ZT + 40], [D / 2 + 50, ZT + 70], [0, ZT + 130], [-D / 2 - 50, ZT + 70]], W + 100).color(powderCoat));
add('roof-drip', prismX([[-D / 2 - 56, ZT + 30], [-D / 2 - 44, ZT + 30], [-D / 2 - 44, ZT + 70], [-D / 2 - 56, ZT + 70]], W + 100).color(powderCoat));

// Side heat-exchanger: housing, horizontal grille bars and a circular fan guard.
if (coolingUnit.value === 'heat-exchanger') {
  const X = -W / 2;
  add('hx-housing', b(X - 90, 0, Z0 + 260, 180, D - 120, 1000).color(hvacCasing));
  add('hx-top-hood', prismX([[-D / 2 + 50, 0], [D / 2 - 50, 0], [D / 2 - 50, 40], [-D / 2 + 50, 20]], 200).translate(X - 90, 0, Z0 + 1260).color(hvacCasing));
  for (let i = 0; i < 7; i += 1) {
    add(`hx-grille-${i}`, b(X - 182, 0, Z0 + 330 + i * 36, 8, D - 200, 14).color(polymer));
  }
  const fz = Z0 + 900;
  add('fan-shroud', path().moveTo(150, -10).lineTo(170, -10).lineTo(170, 22).lineTo(150, 22).close().revolve()
    .rotateY(90).translate(X - 180, 0, fz).color(polymer));
  add('fan-hub', rod([X - 180, 0, fz], [X - 205, 0, fz], 40, 10).color(polymer));
  for (let i = 0; i < 4; i += 1) {
    const a = (i * Math.PI) / 4;
    add(`fan-guard-${i}`, rod([X - 200, -155 * Math.cos(a), fz - 155 * Math.sin(a)], [X - 200, 155 * Math.cos(a), fz + 155 * Math.sin(a)], 4, 4).color(polymer));
  }
}

// Cable gland plate on the right side with feeders dropping into the pad.
add('gland-plate', b(W / 2 + 6, 0, Z0 + 30, 12, 360, 200).color(galvanizedSteel));
for (let i = 0; i < 4; i += 1) {
  const y = -120 + i * 80;
  add(`gland-${i}`, rod([W / 2 + 12, y, Z0 + 130], [W / 2 + 52, y, Z0 + 130], 22, 8).color(polymer));
  add(`feeder-${i}`, rod([W / 2 + 52, y, Z0 + 130], [W / 2 + 120, y, Z0 + 60], 13, 6).color(polymer));
  add(`feeder-drop-${i}`, rod([W / 2 + 120, y, Z0 + 60], [W / 2 + 120, y, 2], 13, 6).color(polymer));
}

// Ground bar with a green-yellow earth lead on the plinth.
add('ground-bar', b(-W / 2 - 26, -200, 40, 12, 180, 30).color(galvanizedSteel));
add('earth-lead', rod([-W / 2 - 32, -150, 55], [-W / 2 - 70, -150, 9], 6, 5).color(signage));

return p.model();
