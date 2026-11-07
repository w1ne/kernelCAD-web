// SPDX-License-Identifier: CC0-1.0
// Fresnel wash fixture: the soft-edged theatre wash light hung from a lighting
// pipe by a C-clamp.
// What makes it a Fresnel rather than a PAR or a profile: a short, fat drum with
// a vented rear cap, a big stepped Fresnel lens filling the whole front, a
// focus slider on the underside, a strap yoke with tilt locks, and a four-leaf
// rotating barn door on the nose to cut the beam.
// Generic visualization geometry at real size (a 1 kW, 150 mm lens unit about
// 330 mm across), millimetres, Z up, beam along -Y, pipe along X at the top,
// lowest point on z = 0.

meta({
  name: "fresnel-wash-fixture",
  license: 'CC0-1.0',
  title: "Fresnel wash fixture",
  description: "Theatre Fresnel wash light hung from a C-clamp: short vented drum with a stepped Fresnel lens across the front, rear lamp cap with cooling louvres, focus slider underneath, gel-frame runners, strap yoke with tilt-lock handles, and an optional four-leaf barn door. Material controls: powder-coated drum and yoke, cast-aluminium clamp and barn-door ring, plated hardware, lens. houseShow and touring presets.",
  tags: ['fresnel', 'wash light', 'stage light', 'barn doors', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const barnDoor = param('barnDoor', 'fitted', { choices: ['fitted', 'none'], label: 'Barn door' });

const powderCoat = param('powderCoat', '#2b3035', { label: 'Drum, rear cap, yoke and barn-door leaves (powder-coated)' });
const hardware = param('hardware', '#c28f3e', { label: 'Tilt locks, focus knob and bolts (plated steel)' });
const aluminum = param('aluminum', '#bac3c6', { label: 'C-clamp, runners and barn-door ring (cast aluminium)' });
const glass = param('glass', '#f3e9bf', { label: 'Fresnel lens' });

presets({
  houseShow: {
    powderCoat: '#1f2428',
    hardware: '#c5a052',
    aluminum: '#c7cecf',
    glass: '#ffd15d',
  },
  touring: {
    powderCoat: '#315465',
    hardware: '#e2b347',
    aluminum: '#dce3e2',
    glass: '#31b9d2',
  },
});

const p = assembly("fresnel-wash-fixture");
// Parts are collected, then the whole model is lifted so its lowest point
// rests on z = 0.
const parts = [];
const add = (name, shape) => parts.push([name, shape]);

const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
// Revolve an [r, y] profile about the beam axis (Y).
const turnedY = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve().rotateX(-90);
};
const rod = (p0, p1, r, n = 6) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

const R = 165; // drum radius
const ZC = 0; // beam axis

// Drum: a short fat cylinder with a front bezel lip.
add('drum', turnedY([[0, 0], [R - 10, 0], [R, 15], [R, 230], [0, 230]]).color(powderCoat));
add('bezel', turnedY([[108, -16], [R + 8, -16], [R + 8, 12], [108, 12]]).color(powderCoat));
// Stepped Fresnel lens: concentric rings stepping back to the centre.
for (const [k, [r0, r1, y]] of [[0, 34, -8], [34, 60, -12], [60, 84, -16], [84, 108, -20]].entries()) {
  add(`lens-step-${k}`, turnedY([[r0, y], [r1, y], [r1, 0], [r0, 0]]).color(glass));
}
// Rear lamp cap with cooling louvres on top.
add('rear-cap', turnedY([[0, 230], [R - 6, 230], [R - 30, 300], [60, 330], [0, 330]]).color(powderCoat));
for (let i = 0; i < 4; i += 1) {
  add(`louvre-${i}`, box(170, 14, 12, true).translate(0, 60 + i * 42, ZC + R + 8).color(powderCoat));
}
add('louvre-cover', box(196, 180, 6, true).translate(0, 123, ZC + R + 20).color(powderCoat));
add('power-cord', rod([0, 320, ZC - 30], [0, 380, ZC - 220], 9, 5).color(powderCoat));
// Focus slider on the underside of the drum.
add('focus-track', box(30, 190, 14, true).translate(0, 120, ZC - R - 4).color(aluminum));
add('focus-knob', rod([0, 90, ZC - R - 10], [0, 90, ZC - R - 58], 18, 8).color(hardware));

// Gel-frame runners on the nose.
for (const s of [-1, 1]) add(`runner-${s}`, box(18, 26, 2 * R + 20, true).translate(s * (R - 6), -30, ZC).color(aluminum));

// Four-leaf rotating barn door: a ring on the runners with two big and two
// small hinged leaves splayed open.
if (barnDoor.value === 'fitted') {
  const by = -50;
  add('barn-ring', turnedY([[R - 10, by], [R + 16, by], [R + 16, by + 14], [R - 10, by + 14]]).color(aluminum));
  // Big leaves top and bottom, small leaves left and right, each opened ~35 degrees.
  const leaf = (w, l) => extrudePolygon([[-w / 2, 0], [w / 2, 0], [w / 2 - 25, l], [-w / 2 + 25, l]], 4);
  add('leaf-top', leaf(330, 210).rotateX(90 + 55).translate(0, by, ZC + R + 6).color(powderCoat));
  add('leaf-bottom', leaf(330, 210).rotateX(90 + 55).rotateY(180).translate(0, by, ZC - R - 6).color(powderCoat));
  add('leaf-left', leaf(250, 150).rotateX(90 + 55).rotateY(-90).translate(-R - 6, by, ZC).color(powderCoat));
  add('leaf-right', leaf(250, 150).rotateX(90 + 55).rotateY(90).translate(R + 6, by, ZC).color(powderCoat));
}

// Yoke: flat steel strap from the clamp to pivots either side of the drum.
const YW = R + 22;
const YP = 120;
const YT = ZC + R + 110;
add('yoke-top', box(2 * YW + 14, 50, 14, true).translate(0, YP, YT).color(powderCoat));
for (const s of [-1, 1]) {
  add(`yoke-arm-${s}`, box(14, 50, YT - ZC + 30, true).translate(s * YW, YP, (YT + ZC - 30) / 2 + 7).color(powderCoat));
  add(`tilt-boss-${s}`, rod([s * (R - 4), YP, ZC], [s * (YW + 7), YP, ZC], 30, 8).color(powderCoat));
  add(`tilt-lock-${s}`, rod([s * (YW + 7), YP, ZC], [s * (YW + 40), YP, ZC], 20, 8).color(hardware));
  add(`tilt-handle-${s}`, rod([s * (YW + 34), YP, ZC], [s * (YW + 34), YP + 30, ZC + 80], 8, 5).color(hardware));
}

// C-clamp on a short length of lighting pipe.
const PZ = YT + 95;
add('clamp-stud', rod([0, YP, YT + 7], [0, YP, PZ - 50], 12, 6).color(hardware));
add('c-clamp', extrudePolygon([
  [-34, -50], [34, -50], [34, -30], [-14, -30], [-14, 44], [34, 44], [34, 64], [-34, 64],
], 40).rotateX(90).translate(-12, 20, -7).rotateZ(90).translate(0, YP, PZ).color(aluminum));
add('clamp-bolt', rod([0, YP + 60, PZ - 3], [0, YP + 22, PZ - 3], 7, 6).color(hardware));
add('clamp-wing', box(60, 10, 14, true).translate(0, YP + 64, PZ - 3).color(hardware));
add('pipe-stub', rod([-340, YP, PZ], [340, YP, PZ], 24, 10).color(aluminum));

let lowest = Infinity;
for (const [, shape] of parts) lowest = Math.min(lowest, (await shape.boundingBox({ exact: true })).min[2]);
for (const [name, shape] of parts) p.part(name, shape.translate(0, 0, -lowest).scale(scale));

return p.model();
