// SPDX-License-Identifier: CC0-1.0
// Top-bar hive: a Kenyan-style horizontal beehive, the long trough-shaped hive
// used in natural and small-scale beekeeping.
// What makes it a top-bar hive rather than a box on legs: a long body whose
// sides slope inward to a narrow floor (bees build comb that hangs free in
// that trapezoid), a row of parallel timber top bars laid across the top with
// their ends showing under the eave, painted trapezoid end boards, a glazed
// observation window with a shutter on the sloped side, a row of round
// entrance holes, and a gabled galvanized roof standing on four legs.
// Generic visualization geometry at real size (1 m body), millimetres, Z up,
// ground on z = 0, long axis along X, window side facing -Y.

meta({
  name: "top-bar-hive",
  license: 'CC0-1.0',
  title: "Top-bar hive",
  description: "Kenyan-style top-bar hive: long trapezoid body with sloped sides, row of timber top bars with ends showing under the eave, painted trapezoid end boards, glazed observation window with an open shutter, round entrance holes, gabled galvanized roof with ridge cap, four legs with side rails. Material controls: hive timber, end-board paint, roof sheet, window glass. Window-shutter choice; freshApiary, weatheredYard and paintedRoof presets.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'beehive', 'top bar hive', 'kenyan hive', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const shutter = param('shutter', 'open', { choices: ['open', 'closed'], label: 'Observation window shutter' });

const timber = param('timber', '#b8874a', { label: 'Body, bars and legs (hive timber)' });
const endPaint = param('endPaint', '#5f7f58', { label: 'End boards and shutter (exterior paint)' });
const roofSheet = param('roofSheet', '#aeb9b7', { label: 'Roof (galvanized sheet)' });
const glass = param('glass', '#9ac1bd', { label: 'Observation window (glass)' });

presets({
  freshApiary: { timber: '#d4a462', endPaint: '#7fa06b', roofSheet: '#d3dad8', glass: '#c9dfd8' },
  weatheredYard: { timber: '#68543d', endPaint: '#4b5f48', roofSheet: '#788482', glass: '#6e9392' },
  paintedRoof: { timber: '#c39a63', endPaint: '#e8e2cf', roofSheet: '#9b3b2c', glass: '#a9cbc6' },
});

const p = assembly("top-bar-hive");
const add = (name, shape) => p.part(name, shape.scale(scale));
const b = (x, y, z, w, d, h) => box(w, d, h, true).translate(x, y, z + h / 2);
// Extrude a (y, z) profile along X, centred on x.
const alongX = (pts, len, x = 0) => extrudePolygon(pts, len).rotateX(90).rotateZ(90).translate(x - len / 2, 0, 0);

const L = 1000; // body length
const Z0 = 560; // floor of the body
const H = 300; // body height
const TW = 480; // top width
const BW = 250; // floor width
const slope = (Math.atan((TW - BW) / 2 / H) * 180) / Math.PI;
const trap = (top, bottom, h, z) => [[-bottom / 2, z], [bottom / 2, z], [top / 2, z + h], [-top / 2, z + h]];

// Legs with long side rails tying them together.
for (const x of [-380, 380]) {
  for (const y of [-95, 95]) add(`leg-${x}-${y}`, b(x, y, 0, 60, 60, Z0 + 10).color(timber));
  add(`leg-crossbar-${x}`, b(x, 0, 200, 50, 250, 50).color(timber));
}
for (const y of [-95, 95]) add(`side-rail-${y}`, b(0, y, 200, 820, 40, 50).color(timber));

// Trapezoid body and its painted end boards.
add('body', alongX(trap(TW, BW, H, Z0), L).color(timber));
for (const sx of [-1, 1]) {
  add(`end-board-${sx}`, alongX(trap(TW + 30, BW + 30, H + 10, Z0 - 10), 24, sx * (L / 2 + 12)).color(endPaint));
}

// Top bars laid across the body; their ends stick out past the sloped sides.
const nBars = 26;
const pitch = L / nBars;
for (let i = 0; i < nBars; i += 1) {
  add(`top-bar-${i + 1}`, b(-L / 2 + pitch * (i + 0.5), 0, Z0 + H, pitch - 3, TW + 40, 20).color(timber));
}

// Observation window on the -Y sloped side, framed, with a hinged shutter.
const midY = -(TW + BW) / 4;
const onSide = (shape, x, z, out) => shape.rotateX(slope).translate(x, midY - out, Z0 + z);
add('window-frame', onSide(box(560, 8, 190, true), 0, H / 2, 4).color(timber));
if (shutter.value === 'open') {
  add('window-glass', onSide(box(500, 4, 140, true), 0, H / 2, 9).color(glass));
  // Shutter hinged at the window's bottom edge, dropped open to hang down.
  const hz = H / 2 - 95;
  const hy = -(BW / 2 + ((TW - BW) / 2) * (hz / H));
  add('shutter', b(0, hy - 14, Z0 + hz - 188, 560, 16, 190).color(endPaint));
  add('shutter-knob', cylinder(16, 12, 10).rotateX(90).translate(0, hy - 22, Z0 + hz - 140).color(timber));
} else {
  add('shutter', onSide(box(560, 16, 190, true), 0, H / 2, 12).color(endPaint));
  add('shutter-knob', onSide(cylinder(16, 12, 10).rotateX(90), 0, H / 2 - 50, 20).color(timber));
}

// Round entrance holes near one end on the window side.
for (const x of [-420, -380, -340]) {
  add(`entrance-${x}`, onSide(cylinder(6, 14, 12).rotateX(90), x, 50, 0).color('#1d1a16'));
}
add('landing-strip', onSide(box(150, 30, 14, true), -380, 18, 12).color(timber));

// Gabled galvanized roof resting on two spacer blocks above the bars.
const RZ = Z0 + H + 50;
for (const x of [-420, 420]) add(`roof-spacer-${x}`, b(x, 0, Z0 + H + 20, 60, 200, 30).color(timber));
const RW = TW + 160;
add('roof', alongX([[-RW / 2, RZ], [RW / 2, RZ], [RW / 2, RZ + 12], [0, RZ + 150], [-RW / 2, RZ + 12]], L + 140).color(roofSheet));
add('roof-ridge', alongX([[-30, RZ + 140], [30, RZ + 140], [0, RZ + 168]], L + 150).color(roofSheet));

return p.model();
