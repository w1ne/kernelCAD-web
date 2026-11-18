// SPDX-License-Identifier: CC0-1.0
// Cardboard bale cage: the welded mesh cage that flattened cardboard is
// thrown into at the back of a shop or on a recycling yard, then forked to
// the baler.
// What makes it a cardboard cage rather than a skip: a galvanised wire mesh
// box on a fork-pocket base, square corner posts, a front gate that drops
// down on hinges so the top half opens for loading, and a stack of
// flattened boxes inside, some sheets sticking out of the pile. A
// "cardboard only" plate hangs on the gate.
// Generic visualization geometry at about real size (1360 x 820 mm, about
// 1250 mm high), millimetres, Z up, gate on -Y.

meta({
  name: "cardboard-bale-cage",
  license: 'CC0-1.0',
  title: "Cardboard bale cage",
  description: "Welded mesh cardboard collection cage at about real size: galvanised wire mesh walls on square corner posts, a fork-pocket base, a front gate dropped down on its hinges for loading and a stack of flattened cardboard sheets inside, with a cardboard-only sign on the gate. Fill level choice (full, half, empty). Material controls: frame, wire mesh, cardboard, signage. yard, galvanised and weathered presets.",
  tags: ['cardboard cage', 'cardboard collection', 'mesh cage', 'baler feed', 'recycling', 'materials recovery', 'waste management', 'containers', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#2f6d4f', { label: 'Base, posts and gate frame (painted steel)' });
const mesh = param('mesh', '#b7bec1', { label: 'Wire mesh (galvanised steel)' });
const cardboard = param('cardboard', '#b98d57', { label: 'Flattened cardboard' });
const signage = param('signage', '#f2c230', { label: 'Sign plate' });
const fill = param('fill', 'full', { choices: ['full', 'half', 'empty'], label: 'Fill level' });

presets({
  yard: { frame: '#2f6d4f', mesh: '#b7bec1', cardboard: '#b98d57', signage: '#f2c230' },
  galvanised: { frame: '#9aa3a6', mesh: '#c4cacc', cardboard: '#c29a63', signage: '#2f7fc1' },
  weathered: { frame: '#5b5f55', mesh: '#8f938c', cardboard: '#9c7b52', signage: '#c9a640' },
});

const p = assembly("cardboard-bale-cage");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);

const W = 1360;
const D = 820;
const BZ = 150;
const TOP = 1250;
const HINGE = 650;
const WIRE = 6;
const STEP = 110;

// Base: a pressed steel tray with two fork pockets through it front to back.
add("base", blk(0, 0, 0, W, D, BZ)
  .subtract(blk(-330, 0, -1, 280, D + 20, 100))
  .subtract(blk(330, 0, -1, 280, D + 20, 100))
  .color(frame));

// Corner posts and the top rail ring.
for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
  add(`post-${sx < 0 ? 'l' : 'r'}${sy < 0 ? 'f' : 'b'}`, blk(sx * (W / 2 - 25), sy * (D / 2 - 25), BZ, 50, 50, TOP - BZ).color(frame));
}
add("top-rail-back", blk(0, D / 2 - 20, TOP - 40, W - 100, 40, 40).color(frame));
add("top-rail-front", blk(0, -D / 2 + 20, TOP - 40, W - 100, 40, 40).color(frame));
add("top-rail-left", blk(-W / 2 + 20, 0, TOP - 40, 40, D - 100, 40).color(frame));
add("top-rail-right", blk(W / 2 - 20, 0, TOP - 40, 40, D - 100, 40).color(frame));
add("hinge-rail", blk(0, -D / 2 + 20, HINGE - 40, W - 100, 40, 40).color(frame));

// Welded mesh: thin square wires on a 110 mm grid.
const meshY = (name: string, y: number, z0: number, z1: number) => {
  const nx = Math.floor((W - 100) / STEP);
  for (let i = 1; i <= nx; i++) add(`${name}-v${i}`, blk(-W / 2 + 50 + (i * (W - 100)) / (nx + 1), y, z0, WIRE, WIRE, z1 - z0).color(mesh));
  for (let z = z0 + STEP; z < z1 - 40; z += STEP) add(`${name}-h${z}`, blk(0, y, z, W - 100, WIRE, WIRE).color(mesh));
};
const meshX = (name: string, x: number, z0: number, z1: number) => {
  const ny = Math.floor((D - 100) / STEP);
  for (let i = 1; i <= ny; i++) add(`${name}-v${i}`, blk(x, -D / 2 + 50 + (i * (D - 100)) / (ny + 1), z0, WIRE, WIRE, z1 - z0).color(mesh));
  for (let z = z0 + STEP; z < z1 - 40; z += STEP) add(`${name}-h${z}`, blk(x, 0, z, WIRE, D - 100, WIRE).color(mesh));
};
meshY("mesh-back", D / 2 - 20, BZ, TOP - 40);
meshX("mesh-left", -W / 2 + 20, BZ, TOP - 40);
meshX("mesh-right", W / 2 - 20, BZ, TOP - 40);

// Front gate: dropped down on its hinges, hanging outside the lower front,
// so the top half of the front is open for throwing sheets in.
const GY = -D / 2 - 18;
const GH = HINGE - BZ - 60;
const gz0 = HINGE - GH;
add("gate-frame-top", blk(0, GY, HINGE - 30, W - 120, 30, 30).color(frame));
add("gate-frame-bottom", blk(0, GY, gz0, W - 120, 30, 30).color(frame));
add("gate-frame-left", blk(-W / 2 + 75, GY, gz0, 30, 30, GH).color(frame));
add("gate-frame-right", blk(W / 2 - 75, GY, gz0, 30, 30, GH).color(frame));
for (let i = 1; i <= 10; i++) add(`gate-wire-v${i}`, blk(-W / 2 + 75 + (i * (W - 150)) / 11, GY, gz0, WIRE, WIRE, GH).color(mesh));
for (let z = gz0 + STEP; z < HINGE - 40; z += STEP) add(`gate-wire-h${z}`, blk(0, GY, z, W - 150, WIRE, WIRE).color(mesh));
for (const sx of [-1, 1]) {
  add(`gate-hinge-${sx < 0 ? 'l' : 'r'}`, cylinder(90, 16, 10).rotateY(90).translate(sx * (W / 2 - 160) - 45, GY + 6, HINGE - 10).color(frame));
}
add("gate-latch", cylinder(160, 10, 8).rotateY(90).translate(W / 2 - 140, GY - 14, gz0 + 60).color(mesh));

// Sign plate on the gate: a flattened box pictogram and an arrow into the cage.
const SY = GY - 20;
add("sign-plate", blk(-200, SY, gz0 + 120, 440, 6, 260).color(signage));
add("sign-box", blk(-290, SY - 5, gz0 + 170, 150, 4, 110).color(frame));
add("sign-box-flap-l", blk(-328, SY - 5, gz0 + 285, 70, 4, 22).color(frame));
add("sign-box-flap-r", blk(-252, SY - 5, gz0 + 285, 70, 4, 22).color(frame));
add("sign-arrow-shaft", blk(-70, SY - 5, gz0 + 215, 120, 4, 30).color(frame));
add("sign-arrow-head", extrudePolygon([[0, -45], [60, 0], [0, 45]], 4).rotateX(90).translate(-10, SY - 3, gz0 + 230).color(frame));

// Flattened cardboard: sheets stacked with a little twist each, a few
// standing proud of the pile.
const topZ = fill.value === 'full' ? TOP - 120 : fill.value === 'half' ? 720 : BZ;
const LAYER = 70;
let k = 0;
for (let z = BZ; z + LAYER <= topZ; z += LAYER) {
  const twist = ((k * 37) % 7) - 3;
  const dx = ((k * 53) % 5) * 12 - 24;
  const dy = ((k * 29) % 5) * 10 - 20;
  add(`sheet-${k}`, box(W - 160 - (k % 2) * 60, D - 150 - (k % 3) * 30, LAYER - 4, true).rotateZ(twist).translate(dx, dy, z + LAYER / 2).color(cardboard));
  k++;
}
if (fill.value !== 'empty') {
  add("sheet-proud-1", box(700, 8, 520, true).rotateX(12).rotateZ(6).translate(-180, 220, topZ + 140).color(cardboard));
  add("sheet-proud-2", box(560, 8, 420, true).rotateX(-14).rotateZ(-10).translate(260, 120, topZ + 110).color(cardboard));
  add("sheet-proud-3", box(8, 480, 380, true).rotateY(-12).translate(-480, -60, topZ + 90).color(cardboard));
  add("box-folded", blk(150, -150, topZ, 460, 320, 90).color(cardboard));
  add("box-tape", blk(150, -150, topZ + 90, 460, 50, 3).color(mesh));
}

return p.model();
