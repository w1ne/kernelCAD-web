// SPDX-License-Identifier: CC0-1.0
// Mine survey set-up, the instrument a mine surveyor stands over a station
// to measure drives, stopes and stockpiles. What makes it one: a heavy
// surveying tripod, its three twin-bar legs splayed wide with sliding
// aluminium extensions, clamp screws and steel shoes with kick spurs,
// carrying a flat head plate, a tribrach with three levelling screws and
// the instrument. The total station has a squat base, two standards (the
// yoke) holding a telescope that tips on a horizontal axis, a keypad and
// screen on its face and a carry handle on top; the scanner version is a
// box body with a spinning mirror drum between two uprights. Beside it
// stand a prism pole held plumb on a bipod and the hard carry case.
// Millimetres, Z up, tripod centred on the origin.
meta({
  name: "mine-survey-tripod",
  license: 'CC0-1.0',
  title: "Mine survey tripod",
  description: "Mine survey set-up at real size: surveying tripod with three splayed twin-bar legs, aluminium sliding extensions with clamp blocks and screws, steel shoes with spikes and kick spurs, triangular head plate and centring screw, tribrach with three levelling screws, and an instrument choice. Total station: base with circular level, two standards, telescope with objective and eyepiece on the trunnion axis, screen and keypad, side drive knobs and carry handle. Laser scanner: box body with screen, two uprights and a mirror drum. A prism pole with circular prism, red and white bands and a bipod, and a hard carry case with handle and latches stand beside it. Material controls: tripod legs, leg metal, instrument housing and instrument trim. weathered, timberTripod and highVisibility presets.",
  tags: ['mining', 'underground', 'surveying', 'total station', 'laser scanner', 'tripod', 'prism pole'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1900,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const tripodLegs = param('tripodLegs', '#e2a72a', { label: 'Tripod legs' });
const legMetal = param('legMetal', '#b9bfc3', { label: 'Leg metal' });
const instrumentHousing = param('instrumentHousing', '#ebe8de', { label: 'Instrument housing' });
const instrumentTrim = param('instrumentTrim', '#c8352b', { label: 'Instrument trim' });
const instrument = param('instrument', 'totalStation', { choices: ['totalStation', 'laserScanner'], label: 'Instrument' });
presets({
  weathered: { tripodLegs: '#a88a4e', legMetal: '#8e9294', instrumentHousing: '#c9c4b6', instrumentTrim: '#8a4a3a' },
  timberTripod: { tripodLegs: '#a8723f', legMetal: '#9aa1a5', instrumentHousing: '#e4e6e8', instrumentTrim: '#2f5fa8' },
  highVisibility: { tripodLegs: '#f08a1c', legMetal: '#c5ccca', instrumentHousing: '#f2f0e8', instrumentTrim: '#2a2d2f' },
});

const p = assembly("mine-survey-tripod");
const add = (name, shape) => p.part(name, shape.scale(scale));

const ngon = (r, n) => {
  let o = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) o = o.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return o.close();
};
// Faceted lathe about Z: [[radius, z], ...] with z strictly rising.
const lathe = (pts, n = 12) => ngon(pts[0][0], n).loft(pts.slice(1).map(([r]) => ngon(r, n)), {
  planes: pts.map(([, z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: true,
});
const rod = (r, z0, z1, n = 12) => lathe([[r, z0], [r, z1]], n);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Round bar along X from x0 to x1, centred on (y, z).
const cylX = (r, x0, x1, y, z, n = 12) => rod(r, x0, x1, n).rotateY(90).translate(0, y, z);
// Round bar along Y from y0 to y1, centred on (x, z).
const cylY = (r, y0, y1, x, z, n = 12) => rod(r, -y1, -y0, n).rotateX(90).translate(x, 0, z);
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

const black = '#1f2224', glass = '#3d5f78', steel = '#6d7377';
const scanner = instrument.value === 'laserScanner';
const ZH = 1420; // top of the head plate

// ---- Tripod ----
add('head-plate', ngon(130, 3).loft([ngon(130, 3)], { planes: [{ plane: 'XY', origin: [0, 0, ZH - 40] }, { plane: 'XY', origin: [0, 0, ZH] }], ruled: true }).color(legMetal));
add('centring-screw', rod(18, ZH - 120, ZH - 40, 8).color(legMetal));
for (const [k, deg] of [-90, 30, 150].entries()) {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a), s = Math.sin(a);
  const top = [95 * c, 95 * s, ZH - 60];
  const foot = [640 * c, 640 * s, 130];
  const joint = lerp(top, foot, 0.5);
  // Twin upper bars spread across the leg, joined at the clamp.
  for (const [j, o] of [-1, 1].entries()) {
    const off = [-s * 32 * o, c * 32 * o, 0];
    add(`leg-${k}-bar-${j}`, tube(top.map((v, i) => v + off[i]), joint.map((v, i) => v + off[i] * 0.5), 18, 6).color(tripodLegs));
  }
  add(`leg-${k}-hinge`, blk(-30, -30, -30, 30, 30, 30).translate(top[0], top[1], top[2]).color(legMetal));
  add(`leg-${k}-clamp`, blk(-35, -45, -45, 35, 45, 45).translate(joint[0], joint[1], joint[2]).color(legMetal));
  add(`leg-${k}-clamp-screw`, tube(joint, [joint[0] - s * 80, joint[1] + c * 80, joint[2]], 12, 6).color(black));
  add(`leg-${k}-extension`, tube(joint, foot, 16, 6).color(legMetal));
  add(`leg-${k}-shoe`, blk(-28, -28, 0, 28, 28, 70).translate(foot[0], foot[1], 100).color(steel));
  add(`leg-${k}-spike`, lathe([[2, 0], [20, 100]], 6).translate(foot[0], foot[1], 0).color(steel));
  add(`leg-${k}-kick-spur`, blk(-20, -20, -8, 60, 20, 8).rotateZ(deg).translate(foot[0], foot[1], 170).color(steel));
}

// ---- Tribrach ----
add('tribrach-base', ngon(110, 3).loft([ngon(95, 3)], { planes: [{ plane: 'XY', origin: [0, 0, ZH] }, { plane: 'XY', origin: [0, 0, ZH + 30] }], ruled: true }).color(black));
for (let i = 0; i < 3; i++) {
  const a = (2 * Math.PI * i) / 3;
  add(`levelling-screw-${i}`, rod(18, ZH + 30, ZH + 75, 8).translate(80 * Math.cos(a), 80 * Math.sin(a), 0).color(black));
}
add('tribrach-plate', rod(95, ZH + 75, ZH + 100, 12).color(black));

if (!scanner) {
  // ---- Total station ----
  const ZB = ZH + 100;
  add('station-base', lathe([[90, ZB], [85, ZB + 70]], 14).color(instrumentHousing));
  add('circular-level', rod(18, ZB + 70, ZB + 82, 8).translate(-40, 50, 0).color(glass));
  add('station-body', blk(-95, -110, ZB + 70, 95, 110, ZB + 140).color(instrumentHousing));
  add('screen-face', blk(-80, -126, ZB + 40, 80, -110, ZB + 140).color(black));
  add('screen', blk(-60, -128, ZB + 95, 60, -126, ZB + 132).color(glass));
  // Two tapered standards (the yoke), 35 mm thick, either side of the telescope.
  for (const [k, y] of [-75, 110].entries()) {
    add(`standard-${k}`, extrudePolygon([[-85, ZB + 140], [85, ZB + 140], [55, ZB + 300], [-55, ZB + 300]], 35).rotateX(90).translate(0, y, 0).color(instrumentHousing));
  }
  add('trunnion-knob', cylY(22, -135, -110, 0, ZB + 240, 8).color(instrumentTrim));
  add('vertical-drive', cylY(16, 110, 140, 30, ZB + 200, 8).color(instrumentTrim));
  // Telescope tipped 10 degrees, pointing along +X.
  add('telescope', rod(48, -110, 150, 12).rotateY(80).translate(0, 0, ZB + 240).color(instrumentHousing));
  add('objective', rod(54, 150, 175, 12).rotateY(80).translate(0, 0, ZB + 240).color(instrumentTrim));
  add('objective-glass', rod(40, 175, 178, 12).rotateY(80).translate(0, 0, ZB + 240).color(glass));
  add('eyepiece', rod(22, -150, -110, 8).rotateY(80).translate(0, 0, ZB + 240).color(black));
  add('handle', blk(-70, -20, ZB + 300, 70, 20, ZB + 325).color(instrumentTrim));
  add('handle-post-0', blk(-70, -20, ZB + 300, -50, 20, ZB + 360).color(instrumentTrim));
  add('handle-post-1', blk(50, -20, ZB + 300, 70, 20, ZB + 360).color(instrumentTrim));
  add('handle-grip', cylX(14, -70, 70, 0, ZB + 360, 8).color(instrumentTrim));
} else {
  // ---- Laser scanner ----
  const ZB = ZH + 100;
  add('scanner-base', rod(85, ZB, ZB + 40, 14).color(black));
  add('scanner-body', blk(-90, -80, ZB + 40, 90, 80, ZB + 220).color(instrumentHousing));
  add('scanner-screen', blk(-70, -84, ZB + 80, 70, -80, ZB + 190).color(glass));
  add('scanner-trim', blk(-92, -82, ZB + 40, 92, 82, ZB + 60).color(instrumentTrim));
  for (const [k, s] of [-1, 1].entries()) add(`scanner-upright-${k}`, blk(s * 90 - 25, -60, ZB + 220, s * 90 + 25, 60, ZB + 400).color(instrumentHousing));
  add('mirror-drum', cylX(55, -65, 65, 0, ZB + 320, 14).color(glass));
  add('scanner-top', blk(-115, -60, ZB + 400, 115, 60, ZB + 430).color(instrumentTrim));
}

// ---- Prism pole on a bipod ----
const PX = 1500, PY = 700, PH = 1800;
add('pole-tip', lathe([[2, 0], [14, 80]], 6).translate(PX, PY, 0).color(steel));
for (let i = 0; i < 6; i++) {
  add(`pole-band-${i}`, rod(16, 80 + i * 280, 360 + i * 280, 8).translate(PX, PY, 0).color(i % 2 ? '#f2f2ee' : '#d23a2a'));
}
add('pole-top', rod(14, 1760, PH, 8).translate(PX, PY, 0).color(legMetal));
add('prism-holder', blk(PX - 20, PY - 60, PH, PX + 20, PY + 60, PH + 120).color(black));
add('prism', cylY(55, PY - 90, PY - 50, PX, PH + 60, 12).color(instrumentTrim));
add('prism-glass', cylY(42, PY - 95, PY - 90, PX, PH + 60, 12).color(glass));
add('pole-bubble', blk(PX - 25, PY - 25, 1400, PX + 25, PY + 25, 1460).color(black));
for (const [k, deg] of [200, 320].entries()) {
  const a = (deg * Math.PI) / 180;
  add(`bipod-leg-${k}`, tube([PX + 600 * Math.cos(a), PY + 600 * Math.sin(a), 20], [PX, PY, 1250], 12, 6).color(legMetal));
}

// ---- Hard carry case ----
const CX = -700, CY = -650;
add('case-shell', blk(CX - 280, CY - 180, 0, CX + 280, CY + 180, 420).color(instrumentTrim));
add('case-lid-seam', blk(CX - 285, CY - 185, 300, CX + 285, CY + 185, 320).color(black));
add('case-handle', blk(CX - 80, CY - 20, 420, CX + 80, CY + 20, 460).color(black));
for (const [k, x] of [CX - 160, CX + 160].entries()) add(`case-latch-${k}`, blk(x - 30, CY - 192, 280, x + 30, CY - 182, 340).color(legMetal));

return p.model();
