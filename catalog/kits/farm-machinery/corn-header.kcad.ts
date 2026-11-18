// SPDX-License-Identifier: CC0-1.0
// Corn header: the row-crop front end a combine carries through standing maize.
// What makes it one rather than a box: a row of long pointed snouts (poly
// dividers) that slide between the rows and lift lodged stalks, a pair of
// stalk rolls and gathering chains in each row gap pulling the stalks down
// past the stripper plates, a deep auger trough with a flighted cross auger
// feeding the centre, a tall back sheet with the feeder-house opening, end
// sheets, the rear drive shaft with row gearboxes, and skid shoes it parks on.
// Generic visualization geometry at real size (30 in / 762 mm rows; an
// 8-row header is about 6.1 m wide), millimetres, Z up, snouts pointing -Y,
// skids on z = 0.
meta({
  name: "corn-header",
  license: 'CC0-1.0',
  title: "Corn header",
  description: "Row-crop corn header at real size on 762 mm (30 in) rows: lofted pointed snouts between the rows, stalk rolls and gathering-chain lugs in each row gap, stripper plates, a deep auger trough with a flighted cross auger, tall back sheet with feeder-house opening, end sheets, rear drive shaft with row gearboxes, and skid shoes. Row choice 6 or 8. Material controls: header paint, snout polymer, drive steel, chain and rubber; harvestRed, fieldYellow and weathered presets.",
  tags: ['corn header', 'maize header', 'combine header', 'row crop', 'snouts', 'stalk rolls', 'farm machinery', 'agriculture', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'prop',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 6000
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const rows = param('rows', '8 rows', { choices: ['6 rows', '8 rows'], label: 'Row units' });
const headerPaint = param('headerPaint', '#3d7a3a', { label: 'Header paint' });
const snoutPolymer = param('snoutPolymer', '#e2b523', { label: 'Snout polymer' });
const driveSteel = param('driveSteel', '#9aa3a6', { label: 'Drive and roll steel' });
const chainDark = param('chainDark', '#2b2e30', { label: 'Chains, rubber and openings' });
presets({
  harvestRed: { headerPaint: '#b52a22', snoutPolymer: '#c9302a', chainDark: '#262626' },
  fieldYellow: { headerPaint: '#e0a51c', snoutPolymer: '#2f3336', driveSteel: '#a8aeb0' },
  weathered: { headerPaint: '#55684a', snoutPolymer: '#a99551', driveSteel: '#7b8180', chainDark: '#3a3530' },
});

const p = assembly('corn-header');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Solid along +X from x0 for length len, with a YZ-plane cross-section given as [y, z] points.
const alongX = (pts, x0, len) => extrudePolygon(pts.map(([y, z]) => [-z, y]), len).rotateY(90).translate(x0, 0, 0);
// Plate across X (thickness t, centred on x = 0) from a side profile in [y, z] points.
const sidePlate = (pts, t) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(-t / 2, 0, 0);
// Ruled loft along +Y through stations [y, [[x, z], ...]].
const loftY = (stations) => {
  const prof = stations.map(([, pts]) => {
    let o = path().moveTo(pts[0][0], -pts[0][1]);
    for (const [x, z] of pts.slice(1)) o = o.lineTo(x, -z);
    return o.close();
  });
  return prof[0].loft(prof.slice(1), { planes: stations.map(([y]) => ({ plane: 'XY', origin: [0, 0, y] })), ruled: true }).rotateX(-90);
};
// Tube from p0 to p1 with an n-sided section.
const rod = (p0, p1, r, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const ring = Array.from({ length: n }, (_, i) => [r * Math.cos(((i + 0.5) / n) * Math.PI * 2), r * Math.sin(((i + 0.5) / n) * Math.PI * 2)]);
  return extrudePolygon(ring, len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

const N = rows.value === '6 rows' ? 6 : 8;
const RS = 762;                    // row spacing
const W = N * RS;                  // header width
const X0 = -W / 2;
const rowX = (i) => X0 + RS / 2 + i * RS;
const divX = (i) => X0 + i * RS;   // dividers sit between rows and at both ends

// Auger trough: floor curving up into the back sheet, with the feeder-house opening.
const trough = [[-700, 180], [-420, 150], [-250, 170], [-120, 240], [-40, 360], [0, 1150], [40, 1150], [40, 340], [-60, 190], [-260, 110], [-700, 140]];
add('auger-trough', alongX(trough, X0, W).color(headerPaint));
add('back-sheet-top-lip', alongX([[0, 1150], [-120, 1180], [-120, 1210], [40, 1210], [40, 1150]], X0, W).color(headerPaint));
add('feeder-opening', box(1300, 12, 520, true).translate(0, 46, 560).color(chainDark));
add('feeder-flange', box(1420, 30, 40, true).translate(0, 55, 840).color(driveSteel));
for (const s of [-1, 1]) {
  const k = s < 0 ? 'left' : 'right';
  add(`end-sheet-${k}`, sidePlate([[-1600, 120], [-700, 140], [40, 140], [40, 1210], [-300, 1210], [-1100, 520]], 14).translate(s * (W / 2 + 7), 0, 0).color(headerPaint));
  add(`skid-shoe-${k}`, sidePlate([[-900, 50], [-600, 0], [-80, 0], [-80, 80], [-900, 80]], 120).translate(s * (W / 2 - 160), 0, 0).color(driveSteel));
  add(`skid-strut-${k}`, box(100, 100, 120, true).translate(s * (W / 2 - 160), -400, 120).color(headerPaint));
}
add('skid-shoe-centre', sidePlate([[-900, 50], [-600, 0], [-80, 0], [-80, 80], [-900, 80]], 160).color(driveSteel));

// Cross auger: tube with flighting rings, centre paddles and end bearings.
const ZA = 360;
const YA = -300;
add('cross-auger-tube', rod([X0 + 60, YA, ZA], [W / 2 - 60, YA, ZA], 130, 12).color(headerPaint));
const flights = Math.round(W / 320);
for (let i = 0; i < flights; i++) {
  const x = X0 + 160 + i * ((W - 320) / (flights - 1));
  if (Math.abs(x) < 400) continue;
  add(`auger-flight-${i}`, rod([x, YA, ZA], [x + 24, YA, ZA], 215, 12).color(driveSteel));
}
for (const s of [-1, 1]) add(`auger-paddle-${s < 0 ? 'a' : 'b'}`, box(300, 40, 120, true).translate(0, YA, ZA + s * 180).color(driveSteel));

// Rear drive shaft with a gearbox behind every row and the main gearbox at one end.
add('drive-shaft', rod([X0 + 100, -480, 760], [W / 2 - 100, -480, 760], 30, 6).color(driveSteel));
add('main-gearbox', box(260, 220, 260, true).translate(W / 2 - 220, -380, 820).color(headerPaint));
add('drive-input', rod([W / 2 - 220, -270, 880], [W / 2 - 220, 120, 980], 40, 8).color(driveSteel));

// Row units: deck, stripper plates, stalk rolls, gathering chains and gearbox.
for (let i = 0; i < N; i++) {
  const x = rowX(i);
  add(`row-deck-${i}`, box(560, 1100, 60, true).translate(x, -1150, 300).color(headerPaint));
  for (const s of [-1, 1]) {
    add(`stripper-plate-${i}-${s < 0 ? 'l' : 'r'}`, box(150, 900, 10, true).translate(x + s * 100, -1150, 335).color(driveSteel));
    add(`stalk-roll-${i}-${s < 0 ? 'l' : 'r'}`, rod([x + s * 32, -1700, 230], [x + s * 32, -700, 300], 32, 6).color(driveSteel));
    add(`gathering-chain-${i}-${s < 0 ? 'l' : 'r'}`, box(24, 1000, 30, true).translate(x + s * 110, -1180, 360).color(chainDark));
    for (let j = 0; j < 5; j++) add(`chain-lug-${i}-${s < 0 ? 'l' : 'r'}-${j}`, box(70, 16, 24, true).translate(x + s * 80, -1580 + j * 200, 380).color(chainDark));
  }
  add(`row-gearbox-${i}`, box(200, 200, 220, true).translate(x, -560, 520).color(headerPaint));
  add(`row-gearbox-cap-${i}`, rod([x, -480, 640], [x, -480, 790], 45, 8).color(driveSteel));
}

// Snouts: long pointed poly dividers, outer ones with a raised end-divider hood.
for (let i = 0; i <= N; i++) {
  const x = divX(i);
  const end = i === 0 || i === N;
  const hw = end ? 140 : 190;
  const rise = end ? 760 : 620;
  add(`snout-${i}`, loftY([
    [-2250, [[-14, 70], [14, 70], [0, 110]]],
    [-1750, [[-hw * 0.55, 150], [hw * 0.55, 150], [hw * 0.45, 300], [0, 360], [-hw * 0.45, 300]]],
    [-1000, [[-hw, 260], [hw, 260], [hw * 0.85, 520], [0, rise], [-hw * 0.85, 520]]],
    [-560, [[-hw, 300], [hw, 300], [hw * 0.85, 600], [0, rise + 120], [-hw * 0.85, 600]]],
  ]).translate(x, 0, 0).color(snoutPolymer));
  add(`snout-skid-${i}`, rod([x, -2100, 90], [x, -1300, 180], 18, 6).color(driveSteel));
}

return p.model();
