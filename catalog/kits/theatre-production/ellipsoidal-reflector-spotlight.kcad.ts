// SPDX-License-Identifier: CC0-1.0
// Ellipsoidal reflector spotlight: the theatre profile fixture hung from a lighting
// pipe by a C-clamp and pointed at the stage.
// What makes it an ellipsoidal rather than a can: a bulbous cast reflector housing
// at the back with the lamp cap and its knob sticking out of the rear, a short
// shutter barrel with four shutter handles poking out at the corners and a gobo
// slot on top, a long lens tube with a focus knob, a gel-frame holder on the nose,
// and a flat-strap yoke with tilt-lock handles hanging from a C-clamp.
// Generic visualization geometry at real size (about 0.7 m long with the 26 degree
// tube), millimetres, Z up, beam along -Y, clamp bolt on the pipe axis at the top.

meta({
  name: "ellipsoidal-reflector-spotlight",
  license: 'CC0-1.0',
  title: "Ellipsoidal reflector spotlight",
  description: "Theatre ellipsoidal profile spotlight hung from a C-clamp: bulbous reflector housing with rear lamp cap and knob, shutter barrel with four shutter handles and a gobo slot, a lens tube with focus knob (19, 26 or 50 degree length), front gel-frame holder with frame, and a flat-strap yoke with tilt-lock handles. Material controls: powder-coated body and yoke, cast-aluminium clamp, handles and gel frame, plated hardware, lens. houseShow and touring presets.",
  tags: ['ellipsoidal', 'ERS', 'profile spot', 'leko', 'source four', 'stage light', 'spotlight', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "center",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const lensTube = param('lensTube', '26deg', { choices: ['19deg', '26deg', '50deg'], label: 'Lens tube (beam angle)' });

const powderCoat = param('powderCoat', '#26292d', { label: 'Housing, lens tube and yoke (powder-coated)' });
const aluminum = param('aluminum', '#b9c1c4', { label: 'C-clamp, shutter handles and gel frame (cast aluminium)' });
const hardware = param('hardware', '#c28f3e', { label: 'Knobs, tilt locks and bolts (plated steel)' });
const glass = param('glass', '#f3e9bf', { label: 'Front lens and gel' });

presets({
  houseShow: {
    powderCoat: '#1d2024',
    aluminum: '#c7cecf',
    hardware: '#c5a052',
    glass: '#ffd15d',
  },
  touring: {
    powderCoat: '#e8e8e2',
    aluminum: '#3a4148',
    hardware: '#e2b347',
    glass: '#31b9d2',
  },
});

const p = assembly("ellipsoidal-reflector-spotlight");
const add = (name, shape) => p.part(name, shape.scale(scale));

const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
// Revolve an [r, y] profile about the beam axis (Y), then move it to x, z.
const turnedY = (pts, at) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve().rotateX(-90).translate(at[0], at[1], at[2]);
};
// Rod between two points (+Z rod turned to the segment direction).
const rod = (p0, p1, r, n = 6) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

const ZC = 0; // beam axis height
const tubeLen = { '19deg': 380, '26deg': 290, '50deg': 150 }[lensTube.value];

// Reflector housing: an egg-shaped cast shell, widest just behind the shutters.
// Profile in [radius, y]; +y is the back of the fixture.
add('reflector-housing', turnedY([
  [0, 330], [55, 325], [100, 305], [132, 270], [148, 225], [150, 175], [140, 125], [118, 85], [0, 85],
], [0, 0, ZC]).color(powderCoat));
// Cooling ribs round the housing.
for (const y of [160, 215, 265]) {
  const r = y === 160 ? 152 : y === 215 ? 152 : 136;
  add(`rib-${y}`, turnedY([[r - 6, y - 5], [r + 4, y - 5], [r + 4, y + 5], [r - 6, y + 5]], [0, 0, ZC]).color(powderCoat));
}
// Lamp cap and its adjustment knob out of the back.
add('lamp-cap', turnedY([[0, 320], [62, 320], [62, 370], [52, 385], [0, 385]], [0, 0, ZC]).color(powderCoat));
add('lamp-knob', turnedY([[0, 385], [24, 385], [24, 420], [0, 420]], [0, 0, ZC]).color(hardware));
add('lamp-cord', rod([0, 395, ZC - 30], [0, 430, ZC - 150], 9, 5).color(powderCoat));

// Shutter barrel: a short drum ahead of the reflector.
add('shutter-barrel', turnedY([[0, 85], [118, 85], [118, 0], [0, 0]], [0, 0, ZC]).color(powderCoat));
// Four shutter handles out of the barrel at the diagonal corners.
for (const [i, a] of [45, 135, 225, 315].entries()) {
  const ca = Math.cos((a * Math.PI) / 180);
  const sa = Math.sin((a * Math.PI) / 180);
  const y = 18 + i * 16;
  add(`shutter-handle-${a}`, rod([ca * 112, y, ZC + sa * 112], [ca * 172, y, ZC + sa * 172], 6, 5).color(aluminum));
  add(`shutter-tab-${a}`, rod([ca * 165, y - 9, ZC + sa * 165], [ca * 165, y + 9, ZC + sa * 165], 13, 6).color(aluminum));
}
// Gobo / iris slot on top of the barrel.
add('gobo-slot', box(70, 26, 26, true).translate(0, 40, ZC + 125).color(aluminum));

// Lens tube: slightly tapered barrel ahead of the shutters, length by beam angle.
add('lens-tube', turnedY([[0, 0], [100, 0], [108, -tubeLen + 20], [114, -tubeLen + 20], [114, -tubeLen], [0, -tubeLen]], [0, 0, ZC]).color(powderCoat));
add('lens', turnedY([[0, -tubeLen - 6], [98, -tubeLen - 6], [98, -tubeLen + 1], [0, -tubeLen + 1]], [0, 0, ZC]).color(glass));
add('focus-knob', rod([0, -tubeLen * 0.45, ZC - 102], [0, -tubeLen * 0.45, ZC - 150], 14, 8).color(hardware));
add('focus-slot', box(18, tubeLen * 0.5, 10, true).translate(0, -tubeLen * 0.45, ZC - 102).color(aluminum));

// Gel-frame holder on the nose: runners on each side with a frame slotted in.
const gy = -tubeLen - 14;
add('holder-plate', extrudePolygon([[-122, -122], [122, -122], [122, -84], [-122, -84]], 10).rotateX(90).translate(0, gy + 10, ZC).color(powderCoat));
add('holder-runner-l', box(16, 22, 250, true).translate(-128, gy - 4, ZC).color(powderCoat));
add('holder-runner-r', box(16, 22, 250, true).translate(128, gy - 4, ZC).color(powderCoat));
for (const [k, [w, h, x, z]] of [[236, 34, 0, 101], [236, 34, 0, -101], [34, 168, 101, 0], [34, 168, -101, 0]].entries()) {
  add(`gel-frame-${k}`, box(w, 6, h, true).translate(x, gy - 11, ZC + z).color(aluminum));
}
add('gel', extrudePolygon(circle(96, 20), 2).rotateX(90).translate(0, gy - 9, ZC).color(glass));

// Yoke: a flat steel strap down both sides from the clamp to the pivots at
// the balance point, with tilt-lock handles on the pivots.
const YW = 172; // half-width between the strap centres
const YP = 60; // pivot position along the beam
const YT = ZC + 270; // yoke top
add('yoke-top', box(2 * YW + 14, 50, 14, true).translate(0, YP, YT).color(powderCoat));
for (const s of [-1, 1]) {
  add(`yoke-arm-${s}`, box(14, 50, YT - ZC + 30, true).translate(s * YW, YP, (YT + ZC - 30) / 2 + 7).color(powderCoat));
  add(`tilt-boss-${s}`, rod([s * 150, YP, ZC], [s * (YW + 7), YP, ZC], 28, 8).color(powderCoat));
  add(`tilt-lock-${s}`, rod([s * (YW + 7), YP, ZC], [s * (YW + 40), YP, ZC], 18, 8).color(hardware));
  add(`tilt-handle-${s}`, rod([s * (YW + 34), YP, ZC], [s * (YW + 34), YP + 30, ZC + 80], 8, 5).color(hardware));
}

// C-clamp on the yoke: an extruded C round the pipe with its T-bolt.
const PZ = YT + 95; // pipe axis
add('clamp-stud', rod([0, YP, YT + 7], [0, YP, PZ - 50], 12, 6).color(hardware));
add('c-clamp', extrudePolygon([
  [-34, -50], [34, -50], [34, -30], [-14, -30], [-14, 44], [34, 44], [34, 64], [-34, 64],
], 40).rotateX(90).translate(-12, 20, -7).rotateZ(90).translate(0, YP, PZ).color(aluminum));
add('clamp-bolt', rod([0, YP + 60, PZ - 3], [0, YP + 22, PZ - 3], 7, 6).color(hardware));
add('clamp-wing', box(60, 10, 14, true).translate(0, YP + 64, PZ - 3).color(hardware));
// Short length of the lighting pipe so the fixture reads as hung.
add('pipe-stub', rod([-320, YP, PZ], [320, YP, PZ], 24, 10).color(aluminum));

return p.model();
