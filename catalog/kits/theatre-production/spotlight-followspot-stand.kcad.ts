// SPDX-License-Identifier: CC0-1.0
// Followspot on stand: the long hand-steered spotlight an operator aims at a
// performer from the back of the house, on its own floor stand.
// What makes it a followspot rather than any other lantern: a long barrel
// about 1.2 m nose to tail, a lens tube with a big front lens, a colour
// "boomerang" box behind the lens with a row of gel levers on top, a fat
// ventilated lamp house at the back, a sighting scope on top, rear operator
// handles, and a yoke on a heavy stand: a castored tripod for touring or a
// weighted pedestal for a fixed spot booth.
// Generic visualization geometry at real size (beam axis 1.35 m up),
// millimetres, Z up, beam along -Y, ground on z = 0.

meta({
  name: "spotlight-followspot-stand",
  license: 'CC0-1.0',
  title: "Followspot on stand",
  description: "Theatre followspot on its floor stand: 1.2 m barrel with front lens tube, colour-changer boomerang box with six gel levers, ventilated rear lamp house, sighting scope, rear operator handles and tilt locks on a yoke, standing on a castored tripod or a weighted pedestal. Material controls: powder-coated body and stand, plated levers and locks, lens, rubber grips and castors. houseShow and touring presets.",
  tags: ['followspot', 'follow spot', 'spotlight', 'stage light', 'spot booth', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stand = param('stand', 'tripod', { choices: ['tripod', 'pedestal'], label: 'Stand' });

const powderCoat = param('powderCoat', '#2c3136', { label: 'Barrel, lamp house, yoke and stand (powder-coated)' });
const hardware = param('hardware', '#c28f3e', { label: 'Gel levers, tilt locks and clamps (plated steel)' });
const glass = param('glass', '#f3e9bf', { label: 'Front lens and scope glass' });
const rubber = param('rubber', '#1b1d20', { label: 'Handle grips, castors and feet (rubber)' });

presets({
  houseShow: {
    powderCoat: '#22272c',
    hardware: '#c5a052',
    glass: '#ffd15d',
    rubber: '#141618',
  },
  touring: {
    powderCoat: '#315465',
    hardware: '#e2b347',
    glass: '#31b9d2',
    rubber: '#2a2d30',
  },
});

const p = assembly("spotlight-followspot-stand");
const add = (name, shape) => p.part(name, shape.scale(scale));

const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
const profile = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Revolve an [r, y] profile about the beam axis (Y) at height z.
const turnedY = (pts, z) => profile(pts).rotateX(-90).translate(0, 0, z);
const turnedZ = (pts) => profile(pts);
const rod = (p0, p1, r, n = 6) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

const ZA = 1350; // beam axis
const R = 150; // main barrel radius

// Barrel, nose to tail: lens tube, boomerang box, main barrel, lamp house.
add('lens-tube', turnedY([[0, -660], [118, -660], [118, -630], [106, -620], [100, -380], [0, -380]], ZA).color(powderCoat));
add('front-lens', turnedY([[0, -668], [104, -668], [104, -660], [0, -660]], ZA).color(glass));
add('boomerang', box(2 * R + 30, 130, 2 * R + 40, true).translate(0, -315, ZA + 10).color(powderCoat));
for (let i = 0; i < 6; i += 1) {
  const x = -100 + i * 40;
  add(`gel-lever-${i}`, rod([x, -315, ZA + R + 30], [x, -350, ZA + R + 95], 7, 5).color(hardware));
  add(`gel-knob-${i}`, box(18, 18, 18, true).translate(x, -352, ZA + R + 100).color(rubber));
}
add('barrel', turnedY([[0, -250], [R, -250], [R, 250], [0, 250]], ZA).color(powderCoat));
add('iris-ring', turnedY([[R - 6, -200], [R + 10, -200], [R + 10, -170], [R - 6, -170]], ZA).color(powderCoat));
add('iris-lever', rod([-R + 10, -185, ZA - 40], [-R - 70, -185, ZA - 90], 8, 5).color(hardware));
add('lamp-house', turnedY([[0, 250], [R + 30, 250], [R + 30, 520], [R - 10, 570], [0, 570]], ZA).color(powderCoat));
for (const y of [300, 345, 390, 435, 480]) {
  add(`vent-rib-${y}`, turnedY([[R + 26, y - 8], [R + 40, y - 8], [R + 40, y + 8], [R + 26, y + 8]], ZA).color(powderCoat));
}
add('chimney', box(150, 180, 60, true).translate(0, 410, ZA + R + 50).color(powderCoat));
add('power-cord', rod([0, 560, ZA - 60], [80, 720, 30], 10, 5).color(rubber));

// Sighting scope on two posts on the barrel top.
add('scope-post-f', rod([0, -150, ZA + R], [0, -150, ZA + R + 70], 10, 6).color(hardware));
add('scope-post-r', rod([0, 120, ZA + R], [0, 120, ZA + R + 70], 10, 6).color(hardware));
add('scope', turnedY([[0, -210], [32, -210], [32, -180], [22, -170], [22, 170], [30, 180], [30, 200], [0, 200]], ZA + R + 90).color(powderCoat));
add('scope-glass', turnedY([[0, -214], [28, -214], [28, -210], [0, -210]], ZA + R + 90).color(glass));

// Rear operator handles out of the lamp house.
for (const s of [-1, 1]) {
  add(`handle-arm-${s}`, rod([s * (R + 20), 520, ZA], [s * 250, 760, ZA - 60], 12, 6).color(powderCoat));
  add(`handle-grip-${s}`, rod([s * 250, 760, ZA - 60], [s * 250, 770, ZA - 230], 20, 8).color(rubber));
}

// Yoke: a fork from the stand head to tilt pivots either side of the barrel.
const YW = R + 40;
const YB = ZA - R - 90; // yoke base
add('yoke-base', box(2 * YW + 30, 90, 26, true).translate(0, 0, YB).color(powderCoat));
for (const s of [-1, 1]) {
  add(`yoke-arm-${s}`, box(26, 90, ZA - YB + 50, true).translate(s * YW, 0, (ZA + YB + 50) / 2).color(powderCoat));
  add(`tilt-boss-${s}`, rod([s * (R - 5), 0, ZA], [s * (YW - 13), 0, ZA], 34, 8).color(powderCoat));
  add(`tilt-lock-${s}`, rod([s * (YW + 13), 0, ZA], [s * (YW + 50), 0, ZA], 26, 8).color(hardware));
  add(`tilt-handle-${s}`, rod([s * (YW + 44), 0, ZA], [s * (YW + 44), 40, ZA - 90], 9, 5).color(hardware));
}
add('pan-head', turnedZ([[0, YB - 13 - 70], [70, YB - 13 - 70], [70, YB - 13], [0, YB - 13]]).color(powderCoat));
add('pan-lock', rod([60, 0, YB - 48], [130, 0, YB - 48], 10, 6).color(hardware));

// Stand: telescoping column on a castored tripod or a weighted pedestal.
const CT = YB - 83; // column top
if (stand.value === 'tripod') {
  add('column', turnedZ([[0, 420], [45, 420], [45, CT], [0, CT]]).color(powderCoat));
  add('height-clamp', turnedZ([[0, CT - 260], [60, CT - 260], [60, CT - 200], [0, CT - 200]]).color(hardware));
  add('leg-hub', turnedZ([[0, 380], [80, 380], [80, 520], [0, 520]]).color(powderCoat));
  for (let i = 0; i < 3; i += 1) {
    const a = (i * 2 * Math.PI) / 3 + Math.PI / 2;
    const fx = 620 * Math.cos(a);
    const fy = 620 * Math.sin(a);
    add(`leg-${i}`, rod([0.12 * fx, 0.12 * fy, 470], [fx, fy, 110], 24, 6).color(powderCoat));
    add(`brace-${i}`, rod([0.12 * fx, 0.12 * fy, 820], [0.6 * fx, 0.6 * fy, 260], 12, 5).color(powderCoat));
    add(`castor-fork-${i}`, box(50, 50, 50, true).translate(fx, fy, 100).color(powderCoat));
    add(`castor-${i}`, rod([fx - 22, fy, 50], [fx + 22, fy, 50], 50, 10).color(rubber));
  }
} else {
  add('column', turnedZ([[0, 120], [70, 120], [70, CT], [0, CT]]).color(powderCoat));
  add('height-clamp', turnedZ([[0, CT - 260], [84, CT - 260], [84, CT - 200], [0, CT - 200]]).color(hardware));
  add('base-weight', turnedZ([[0, 14], [420, 14], [420, 70], [380, 120], [90, 140], [0, 140]]).color(powderCoat));
  add('base-foot', turnedZ([[0, 0], [400, 0], [400, 14], [0, 14]]).color(rubber));
}

return p.model();
