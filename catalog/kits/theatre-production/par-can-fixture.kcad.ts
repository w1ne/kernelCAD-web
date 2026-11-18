// SPDX-License-Identifier: CC0-1.0
// PAR can fixture: the classic PAR64 "can" used for punchy concert and theatre
// washes, either hung from a lighting pipe or stood on the floor on its yoke.
// What makes it a PAR can: a long plain spun-metal tube with rolled beads, a
// flat back cap holding the sealed-beam lamp and its cord, a front ring with a
// gel frame held by a spring clip, and a single strap yoke with big hand-wheel
// tilt locks. Hung, a C-clamp grips a pipe and the can tilts down at the stage;
// on the floor, the yoke becomes the foot and the can tilts up.
// Generic visualization geometry at real size (PAR64, 230 mm diameter can about
// 480 mm long), millimetres, Z up, beam along -Y, lowest point on z = 0.

meta({
  name: "par-can-fixture",
  license: 'CC0-1.0',
  title: "PAR can fixture",
  description: "PAR64 can light: long spun-metal tube with rolled beads, flat back cap with lamp socket and cord, front ring with spring-clipped gel frame, strap yoke with hand-wheel tilt locks; hung from a pipe on a C-clamp and tilted down, or stood on the floor on its yoke and tilted up. Material controls: can body, yoke and caps, cast-aluminium clamp and gel frame, plated hand wheels, lamp face. houseShow and touring presets.",
  tags: ['PAR can', 'PAR64', 'parcan', 'wash light', 'concert lighting', 'stage light', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const mounting = param('mounting', 'hung', { choices: ['hung', 'floor'], label: 'Mounting' });

const hardware = param('hardware', '#c28f3e', { label: 'Hand-wheel tilt locks and bolts (plated steel)' });
const powderCoat = param('powderCoat', '#2a2e33', { label: 'Can body, back cap and yoke (powder-coated)' });
const aluminum = param('aluminum', '#bac3c6', { label: 'Front ring, gel frame and C-clamp (aluminium)' });
const glass = param('glass', '#f3e9bf', { label: 'Lamp face and gel' });

presets({
  houseShow: {
    hardware: '#c5a052',
    powderCoat: '#1d2125',
    aluminum: '#c7cecf',
    glass: '#ffd15d',
  },
  touring: {
    hardware: '#2b2f33',
    powderCoat: '#cfd6d8',
    aluminum: '#8b969b',
    glass: '#d8327a',
  },
});

const p = assembly("par-can-fixture");
const floor = mounting.value === 'floor';
const R = 118; // can radius
const YW = R + 26; // yoke half-width
const YT = R + 150; // yoke top above the tilt axis
// Tilt about the yoke pivot; positive tips the nose down as built, so after the
// floor flip the same sign tips it up.
const tilt = floor ? 25 : 30;
// Hung: as built, pipe on top. Floor: flip the whole fixture about the beam
// axis so the yoke strap is the foot, then lift it onto the ground.
const mount = (shape) => (floor ? shape.rotateY(180).translate(0, 0, YT + 19) : shape);
// Parts are collected, then the whole fixture is lifted so its lowest point
// rests on z = 0.
const parts = [];
const addCan = (name, shape) => parts.push([name, mount(shape.rotateX(tilt))]);
const add = (name, shape) => parts.push([name, mount(shape)]);

const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
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

// Can: pivot (tilt axis) at the origin, gel frame at y = -300, lamp socket at y = +236.
addCan('can-body', turnedY([[0, -270], [R, -270], [R, 170], [0, 170]]).color(powderCoat));
for (const y of [-200, -40, 110]) {
  addCan(`bead-${y}`, turnedY([[R - 4, y - 7], [R + 6, y - 7], [R + 6, y + 7], [R - 4, y + 7]]).color(powderCoat));
}
addCan('back-cap', turnedY([[0, 170], [R + 8, 170], [R + 8, 186], [R - 30, 206], [0, 206]]).color(powderCoat));
addCan('lamp-socket', turnedY([[0, 206], [42, 206], [42, 236], [0, 236]]).color(aluminum));
addCan('cord', rod([0, 236, floor ? 20 : -20], [0, 300, floor ? 180 : -180], 9, 5).color(powderCoat));
addCan('front-ring', turnedY([[R - 22, -296], [R + 14, -296], [R + 14, -262], [R - 22, -262]]).color(aluminum));
addCan('lamp-face', turnedY([[0, -262], [R - 4, -262], [R - 4, -250], [0, -250]]).color(glass));
// Gel frame: square plate with a round window, held in the ring by a spring clip.
for (const [k, [w, h, x, z]] of [[264, 40, 0, 112], [264, 40, 0, -112], [40, 184, 112, 0], [40, 184, -112, 0]].entries()) {
  addCan(`gel-frame-${k}`, box(w, 5, h, true).translate(x, -300, z).color(aluminum));
}
addCan('gel', extrudePolygon(circle(96, 20), 2).rotateX(90).translate(0, -298, 0).color(glass));
addCan('spring-clip', rod([0, -262, R + 14], [0, -306, R + 40], 4, 4).color(hardware));
addCan('tilt-boss-l', rod([-R + 4, 0, 0], [-YW + 7, 0, 0], 30, 8).color(powderCoat));
addCan('tilt-boss-r', rod([R - 4, 0, 0], [YW - 7, 0, 0], 30, 8).color(powderCoat));

// Strap yoke with hand-wheel tilt locks; the wheels turn with the yoke bolt.
add('yoke-top', box(2 * YW + 14, 50, 14, true).translate(0, 0, YT).color(powderCoat));
for (const s of [-1, 1]) {
  add(`yoke-arm-${s}`, box(14, 50, YT + 30, true).translate(s * YW, 0, (YT - 30) / 2 + 7).color(powderCoat));
  add(`hand-wheel-${s}`, rod([s * (YW + 7), 0, 0], [s * (YW + 26), 0, 0], 38, 10).color(hardware));
  add(`wheel-hub-${s}`, rod([s * (YW + 26), 0, 0], [s * (YW + 40), 0, 0], 14, 6).color(hardware));
}

if (!floor) {
  // C-clamp on a short length of lighting pipe.
  const PZ = YT + 95;
  add('clamp-stud', rod([0, 0, YT + 7], [0, 0, PZ - 50], 12, 6).color(hardware));
  add('c-clamp', extrudePolygon([
    [-34, -50], [34, -50], [34, -30], [-14, -30], [-14, 44], [34, 44], [34, 64], [-34, 64],
  ], 40).rotateX(90).translate(-12, 20, -7).rotateZ(90).translate(0, 0, PZ).color(aluminum));
  add('clamp-bolt', rod([0, 60, PZ - 3], [0, 22, PZ - 3], 7, 6).color(hardware));
  add('clamp-wing', box(60, 10, 14, true).translate(0, 64, PZ - 3).color(hardware));
  add('pipe-stub', rod([-300, 0, PZ], [300, 0, PZ], 24, 10).color(aluminum));
} else {
  // Rubber feet under the yoke strap.
  for (const s of [-1, 1]) add(`foot-${s}`, box(60, 70, 12, true).translate(s * (YW - 30), 0, YT + 13).color(powderCoat));
}

let lowest = Infinity;
for (const [, shape] of parts) lowest = Math.min(lowest, (await shape.boundingBox({ exact: true })).min[2]);
for (const [name, shape] of parts) p.part(name, shape.translate(0, 0, -lowest).scale(scale));

return p.model();
