// SPDX-License-Identifier: CC0-1.0
// Survey total station on its tripod, the instrument that records every find
// and context point on an excavation. What makes it one: a yellow-and-aluminium
// tripod with clamped extension legs and spiked shoes; a three-screw tribrach;
// a rotating alidade with two upright standards carrying a telescope on a
// horizontal trunnion axis; a large objective at the front and an eyepiece at
// the back; a keypad and screen on both faces; tangent knobs; a carry handle.
// Millimetres, Z up, tripod feet on z = 0, instrument centred on the origin.
meta({
  name: "total-station",
  license: 'CC0-1.0',
  title: "Survey total station",
  description: "Survey total station at about real size on a field tripod: three clamped extension legs with spiked shoes and foot pegs, head plate and centring screw, three-screw tribrach, rotating alidade with two standards and a carry handle, telescope on its trunnion axis with objective lens, EDM ring, sighting collimator and eyepiece, a screen and keypad on both faces, horizontal and vertical tangent knobs and a battery door. Material controls: painted polymer, aluminium, glass, rubber and dark trim; fieldReady, weathered and charcoalBody presets.",
  tags: ["archaeology", "excavation", "fieldwork", "survey", "total station", "tripod", "theodolite", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const paintedPolymer = param('paintedPolymer', '#e0a92e', { label: 'Painted polymer' });
const aluminum = param('aluminum', '#b4c0c6', { label: 'Aluminium' });
const glass = param('glass', '#4f8fa6', { label: 'Glass' });
const rubber = param('rubber', '#2c3133', { label: 'Rubber and dark trim' });
presets({
  fieldReady: { paintedPolymer: '#edb83f', aluminum: '#c3ccd0', glass: '#94bdc3', rubber: '#454c4d' },
  weathered: { paintedPolymer: '#ad7c2d', aluminum: '#788990', glass: '#5d7b7f', rubber: '#292f30' },
  charcoalBody: { paintedPolymer: '#4b5458', aluminum: '#c9cfd1', glass: '#5b8fa0', rubber: '#1f2325' },
});

const p = assembly("total-station");
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
// Lathe along X / Y: [[radius, x or y], ...] rising, centred on the other two axes.
const latheX = (pts, y, z, n = 12) => lathe(pts, n).rotateY(90).translate(0, y, z);
const latheY = (pts, x, z, n = 12) => lathe(pts, n).rotateX(-90).translate(x, 0, z);
const outline = (pts) => {
  let o = path().moveTo(pts[0][0], pts[0][1]);
  for (const [u, v] of pts.slice(1)) o = o.lineTo(u, v);
  return o.close();
};
// Closed (y, z) profile along X; (x, y) plan along Z.
const sideX = (pts, x0, x1) => outline(pts).extrude(x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);
const planZ = (pts, z0, z1) => outline(pts).extrude(z1 - z0).translate(0, 0, z0);
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
const polar = (r, deg, z) => [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180), z];
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

const steel = '#8e979a', screen = '#9bd3c2';
const LA = [90, 210, 330]; // leg bearings

// ---- Tripod ----
add('head-plate', lathe([[95, 1325], [100, 1340], [100, 1365]], 16).color(aluminum));
add('centring-screw', rod(14, 1240, 1325, 8).color(rubber));
add('centring-knob', lathe([[30, 1220], [34, 1240], [30, 1260]], 10).color(rubber));
for (const a of LA) {
  const top = polar(95, a, 1335), foot = polar(600, a, 0);
  add(`leg-hinge-${a}`, latheX([[26, -40], [26, 40]], 0, 0, 10).rotateZ(a + 90).translate(...top).color(aluminum));
  // Upper section: twin painted rails; lower section slides out in aluminium.
  for (const s of [-1, 1]) {
    const off = polar(24, a + 90, 0).map((v) => v * s);
    add(`leg-upper-${a}-${s}`, tube(lerp(top, foot, 0.03).map((v, i) => v + off[i]), lerp(top, foot, 0.55).map((v, i) => v + off[i]), 15, 6).color(paintedPolymer));
  }
  add(`leg-lower-${a}`, tube(lerp(top, foot, 0.45), lerp(top, foot, 0.93), 13, 6).color(aluminum));
  add(`leg-clamp-${a}`, tube(lerp(top, foot, 0.53), lerp(top, foot, 0.58), 30, 8).color(rubber));
  add(`leg-clamp-screw-${a}`, tube(lerp(top, foot, 0.555), lerp(top, foot, 0.555).map((v, i) => v + polar(70, a, 0)[i]), 9, 6).color(rubber));
  add(`leg-shoe-${a}`, tube(lerp(top, foot, 0.91), lerp(top, foot, 0.985), 18, 6).color(steel));
  add(`leg-spike-${a}`, tube(lerp(top, foot, 0.985), [foot[0], foot[1], 14], 6, 6).color(steel));
  add(`leg-spike-tip-${a}`, lathe([[1, 0], [6, 16]], 6).translate(foot[0], foot[1], 0).color(steel));
  add(`foot-peg-${a}`, tube(lerp(top, foot, 0.95), lerp(top, foot, 0.95).map((v, i) => v + polar(70, a, 0)[i]), 9, 6).color(steel));
}

// ---- Tribrach ----
add('tribrach-base', planZ([...Array(3)].flatMap((_, i) => [polar(110, i * 120 + 30, 0), polar(60, i * 120 + 90, 0)]).map(([x, y]) => [x, y]), 1365, 1385).color(rubber));
for (let i = 0; i < 3; i++) {
  const [x, y] = polar(92, i * 120 + 30, 0);
  add(`levelling-screw-${i}`, rod(9, 1385, 1430, 8).translate(x, y, 0).color(steel));
  add(`levelling-knob-${i}`, lathe([[24, 1395], [27, 1402], [27, 1414], [24, 1420]], 10).translate(x, y, 0).color(rubber));
}
add('tribrach-plate', lathe([[86, 1430], [86, 1444], [80, 1450]], 16).color(rubber));
add('circular-level', lathe([[14, 1444], [14, 1452]], 10).translate(55, 30, 0).color(screen));

// ---- Alidade ----
add('circle-housing', lathe([[96, 1450], [102, 1462], [102, 1500], [94, 1510]], 18).color(paintedPolymer));
add('circle-band', lathe([[104, 1470], [104, 1478]], 18).color(rubber));
add('alidade-body', blk(-110, -75, 1510, 110, 75, 1585).color(paintedPolymer));
// Standards: tapered uprights either side of the telescope, (y, z) profile.
const standard = [[-70, 1585], [70, 1585], [60, 1745], [40, 1775], [-40, 1775], [-60, 1745]];
add('standard-left', sideX(standard, -110, -72).color(paintedPolymer));
add('standard-right', sideX(standard, 72, 110).color(paintedPolymer));
add('battery-door', blk(110, -40, 1610, 116, 40, 1720).color(rubber));
add('handle-post-left', blk(-100, -14, 1775, -84, 14, 1820).color(rubber));
add('handle-post-right', blk(84, -14, 1775, 100, 14, 1820).color(rubber));
add('carry-handle', blk(-100, -16, 1820, 100, 16, 1842).color(rubber));
// Screen and keypad on both faces.
for (const s of [-1, 1]) {
  const y0 = s * 75, y1 = s * 88;
  add(`panel-${s}`, blk(-95, Math.min(y0, y1), 1518, 95, Math.max(y0, y1), 1580).color(rubber));
  const ys = s * 89;
  add(`screen-${s}`, blk(-85, ys - 1, 1550, -5, ys + 1, 1574).color(screen));
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
    add(`key-${s}-${r}-${c}`, blk(8 + c * 20, ys - 2, 1528 + r * 22, 22 + c * 20, ys + 2, 1542 + r * 22).color(aluminum));
  }
}
add('h-tangent-knob', latheX([[16, 110], [18, 118], [18, 140]], -40, 1540, 10).color(rubber));
add('h-clamp', latheX([[10, -130], [10, -110]], 40, 1540, 8).color(rubber));

// ---- Telescope on the trunnion axis (along X at z = 1680) ----
const TZ = 1680;
add('trunnion-left', latheX([[32, -118], [32, -110]], 0, TZ, 14).color(aluminum));
add('trunnion-right', latheX([[32, 110], [32, 118]], 0, TZ, 14).color(aluminum));
add('v-tangent-knob', latheX([[18, 118], [20, 128], [20, 150]], 30, TZ - 40, 10).color(rubber));
add('telescope-housing', blk(-64, -70, TZ - 52, 64, 85, TZ + 52).color(paintedPolymer));
add('objective-barrel', latheY([[54, -185], [56, -170], [52, -70]], 0, TZ, 16).color(paintedPolymer));
add('edm-ring', latheY([[58, -200], [58, -185]], 0, TZ, 16).color(rubber));
add('objective-lens', latheY([[46, -203], [46, -199]], 0, TZ, 16).color(glass));
add('eyepiece-tube', latheY([[26, 85], [24, 130]], 0, TZ, 12).color(rubber));
add('eyepiece', latheY([[24, 130], [32, 150], [32, 175], [28, 180]], 0, TZ, 12).color(rubber));
add('eyepiece-lens', latheY([[20, 180], [20, 182]], 0, TZ, 10).color(glass));
add('focus-ring', latheY([[40, 30], [40, 70]], 0, TZ, 14).color(rubber));
add('collimator', blk(-12, -110, TZ + 52, 12, 20, TZ + 70).color(rubber));
add('collimator-sight', blk(-6, -112, TZ + 56, 6, -108, TZ + 66).color(glass));

return p.model();
