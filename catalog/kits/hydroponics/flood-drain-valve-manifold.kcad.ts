// SPDX-License-Identifier: CC0-1.0
// Flood-and-drain valve manifold: the wall board that floods and drains
// three ebb-and-flow table zones from one pump, in turn, on a timer.
// What makes it a flood-and-drain manifold: a supply riser from the pump
// climbing to a top fill header through a main isolation valve and
// pressure gauge, a true-union ball valve and a solenoid valve on each zone
// drop, a lower drain collector header with a ball valve on each zone return
// and a check valve before the return line to the sump, all clipped to a
// backboard on two posts beside the controller box that sequences them.
// Each zone has a coloured tag. Generic visualization geometry at about
// real size (board 1.4 m x 1 m), millimetres, Z up, front -Y.

meta({
  name: "flood-drain-valve-manifold",
  license: 'CC0-1.0',
  title: "Flood-and-drain valve manifold",
  description: "Three-zone ebb-and-flow valve board at about real size: supply riser with main isolation valve and pressure gauge, top fill header with a true-union ball valve and solenoid valve on each zone drop, lower drain collector header with a ball valve on each zone return, check valve and return line to the sump, pipe clips, coloured zone tags and a sequencing controller box on a backboard between two posts. Material controls: backboard, pipework, valve handles and solenoid coils. greyPvc, whitePvc, abs and weathered presets.",
  tags: ['flood and drain', 'ebb and flow', 'valve manifold', 'irrigation manifold', 'solenoid valve', 'ball valve', 'zone valve', 'header', 'hydroponics', 'greenhouse', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 6000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const board = param('backboard', '#e6e4dc', { label: 'Backboard and posts (HDPE / steel)' });
const pipe = param('pipework', '#8f979c', { label: 'Pipework (PVC)' });
const handle = param('valveHandles', '#c0392b', { label: 'Fill valve handles' });
const coil = param('solenoidCoils', '#24282b', { label: 'Solenoid coils' });

presets({
  greyPvc: { backboard: '#e6e4dc', pipework: '#8f979c', valveHandles: '#c0392b', solenoidCoils: '#24282b' },
  whitePvc: { backboard: '#3f6f5a', pipework: '#eeeeea', valveHandles: '#2f6fb0', solenoidCoils: '#2a2c2e' },
  abs: { backboard: '#d8d2c0', pipework: '#2b2d2f', valveHandles: '#e3a21c', solenoidCoils: '#4a5056' },
  weathered: { backboard: '#a8a596', pipework: '#7b8186', valveHandles: '#8f3a2c', solenoidCoils: '#3a3a36' },
});

const p = assembly("flood-drain-valve-manifold");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateX(90).translate(x, y, z);

// Backboard on two posts with feet.
const BY = 40;
for (const x of [-720, 720]) {
  add(`post-${x}`, blk(x, BY + 40, 0, 60, 60, 1600).color('#7f878b'));
  add(`foot-${x}`, blk(x, BY + 40, 0, 200, 400, 12).color('#7f878b'));
}
add("backboard", blk(0, BY, 400, 1400, 20, 1120).color(board));

const PY = -40, R = 25; // pipe centreline in front of the board, radius
const FZ = 1240, DZ = 560; // fill and drain header heights
const zones = [-300, 100, 500];
const tags = ['#d9542b', '#e3b52c', '#3d8f4a'];
const clip = (name: string, x: number, z: number, vertical: boolean) =>
  add(name, (vertical ? blk(x, BY - 20, z - 30, 70, 30, 60) : blk(x, BY - 20, z - 35, 60, 30, 70)).color('#3b3f42'));

// Supply riser from the pump on the left, main isolation valve and gauge.
const SX = -560;
add("supply-riser", cylZ(SX, PY, 0, FZ, R).color(pipe));
add("supply-union", cylZ(SX, PY, 300, 50, R + 10, 6).color(pipe));
add("main-valve-body", cylZ(SX, PY, 820, 110, R + 14, 12).color(pipe));
add("main-valve-handle", blk(SX + 50, PY - 20, 880, 120, 26, 16).color('#2f6fb0'));
add("supply-elbow", sphere(R + 4).translate(SX, PY, FZ).color(pipe));
add("gauge-tee", cylZ(SX, PY, FZ, 70, 10, 8).color('#c9a24a'));
add("gauge", cylY(SX, PY + 10, FZ + 120, 30, 55, 16).color('#e9e6dc'));
add("gauge-face", cylY(SX, PY - 20, FZ + 120, 2, 47, 16).color('#f7f6f0'));
add("gauge-needle", box(34, 2, 5, true).translate(14, 0, 0).rotateY(-35).translate(SX, PY - 23, FZ + 120).color('#c0392b'));
clip("clip-riser", SX, 600, true);

// Fill header with a cap at the right, zone drops with valve stacks.
add("fill-header", cylX(SX, PY, FZ, zones[2] + 140 - SX, R).color(pipe));
add("fill-cap", cylX(zones[2] + 140, PY, FZ, 20, R + 6).color(pipe));
zones.forEach((x, i) => {
  add(`fill-tee-${i}`, cylZ(x, PY, FZ - 50, 100, R + 6).color(pipe));
  add(`fill-drop-${i}`, cylZ(x, PY, 0, FZ - 50, R - 3).color(pipe));
  // True-union ball valve: hex union nuts either side of the ball body.
  add(`fill-union-top-${i}`, cylZ(x, PY, 1110, 36, R + 12, 6).color(pipe));
  add(`fill-ball-${i}`, sphere(R + 18).translate(x, PY, 1080).color(pipe));
  add(`fill-union-low-${i}`, cylZ(x, PY, 1014, 36, R + 12, 6).color(pipe));
  add(`fill-stem-${i}`, cylY(x, PY - 30, 1080, 30, 8, 8).color(pipe));
  add(`fill-handle-${i}`, blk(x + 50, PY - 70, 1072, 130, 22, 16).color(handle));
  // Solenoid valve: body with a coil and a cable to the controller.
  add(`sol-body-${i}`, blk(x, PY, 880, 90, 70, 80).color('#b98a3e'));
  add(`sol-coil-${i}`, blk(x, PY - 10, 960, 64, 64, 80).color(coil));
  add(`sol-cap-${i}`, cylZ(x, PY - 10, 1040, 10, 16, 8).color(coil));
  add(`sol-cable-out-${i}`, cylY(x, 10, 1000, 52, 5, 6).color('#1f2326'));
  add(`sol-cable-${i}`, cylZ(x, 10, 1000, 340, 5, 6).color('#1f2326'));
  add(`fill-tag-${i}`, blk(x, PY - R - 6, 760, 80, 4, 50).color(tags[i]));
  clip(`clip-fill-${i}`, x, 700, true);

  // Drain return from the zone up into the collector, with its own valve.
  const rx = x + 120;
  add(`drain-rise-${i}`, cylZ(rx, PY, 0, DZ, R - 3).color(pipe));
  add(`drain-union-${i}`, cylZ(rx, PY, 330, 30, R + 10, 6).color(pipe));
  add(`drain-ball-${i}`, sphere(R + 14).translate(rx, PY, 400).color(pipe));
  add(`drain-handle-${i}`, blk(rx + 45, PY - 60, 392, 110, 20, 14).color('#2f6fb0'));
  add(`drain-stem-${i}`, cylY(rx, PY - 25, 400, 30, 7, 8).color(pipe));
  add(`drain-tag-${i}`, blk(rx, PY - R - 6, 220, 70, 4, 44).color(tags[i]));
  clip(`clip-drain-${i}`, rx, 480, true);
});

// Drain collector header, check valve and return line down to the sump.
const RX = 660;
add("drain-header", cylX(zones[0] + 80, PY, DZ, RX - zones[0] - 80, R + 3).color(pipe));
add("drain-cap", cylX(zones[0] + 60, PY, DZ, 20, R + 8).color(pipe));
for (const [i, x] of zones.entries()) add(`drain-tee-${i}`, cylX(x + 80, PY, DZ, 80, R + 8).color(pipe));
add("check-valve", cylX(RX - 140, PY, DZ, 110, R + 16, 12).color(pipe));
add("check-arrow", blk(RX - 85, PY - R - 17, DZ - 6, 60, 2, 12).color('#22262a'));
add("return-elbow", sphere(R + 6).translate(RX, PY, DZ).color(pipe));
add("return-line", cylZ(RX, PY, 0, DZ, R + 3).color(pipe));
clip("clip-header-a", -100, FZ, false);
clip("clip-header-b", 300, FZ, false);
clip("clip-drain-header", 300, DZ, false);

// Controller box that sequences the zones, above the fill header; the coil
// cables run up behind the header into its gland plate.
const CZ = 1330;
add("controller", blk(100, BY - 70, CZ, 1000, 80, 170).color('#d8dcd8'));
add("controller-lid", blk(100, BY - 111, CZ + 10, 960, 4, 150).color('#c3c9c6'));
add("controller-screen", blk(-200, BY - 114, CZ + 70, 220, 2, 70).color('#2e5f8a'));
tags.forEach((c, i) => add(`controller-led-${i}`, cylY(zones[i], BY - 113, CZ + 85, 4, 14, 8).color(c)));
add("controller-switch", blk(250, BY - 116, CZ + 60, 50, 6, 50).color('#c0392b'));

return p.model();
