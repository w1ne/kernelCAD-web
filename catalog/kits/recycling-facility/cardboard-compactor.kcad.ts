// SPDX-License-Identifier: CC0-1.0
// Cardboard compactor: the upright (vertical) baler that stands at the back
// of a store or at a recycling yard and presses loose boxes into a strapped
// bale. What makes it that machine rather than a cabinet: a tall press
// chamber with a loading opening behind a sliding mesh safety gate, flattened
// cardboard visible in that opening, a full-height bale door below with two
// heavy latch wheels, four corner columns carrying a crosshead with twin
// hydraulic cylinders on top, a side power pack with motor and oil tank, a
// control box with start and stop buttons, strapping slots in the door, and
// a finished cardboard bale on a pallet beside it.
// Generic visualization geometry at about real size (1.5 x 1 m chamber,
// 3.3 m to the cylinder caps), millimetres, Z up, loading side on -Y.

meta({
  name: "cardboard-compactor",
  license: 'CC0-1.0',
  title: "Cardboard compactor",
  description: "Upright cardboard baler at about real size: press chamber with a loading opening behind a sliding mesh safety gate and flattened cardboard inside, bale door with strapping slots and two latch wheels, corner columns and crosshead with twin hydraulic cylinders, side power pack, control box, and a strapped cardboard bale on a pallet (gate closed or raised). Material controls: body paint, safety yellow, machined steel and cardboard. retail, weathered, industrial and highVisibility presets.",
  tags: ["recycling", "baler", "vertical baler", "compactor", "cardboard", "occ", "hydraulic press", "bale", "retail back-of-store", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2900,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const body = param('body', '#2f7a4f', { label: 'Machine body (paint)' });
const safety = param('safety', '#f0c419', { label: 'Safety gate and latches (yellow)' });
const steel = param('steel', '#c4c9cb', { label: 'Cylinder rods and fittings (steel)' });
const cardboard = param('cardboard', '#b8895a', { label: 'Cardboard' });
const gate = param('gate', 'closed', { choices: ['closed', 'raised'], label: 'Safety gate' });

presets({
  retail: { body: '#2f7a4f', safety: '#f0c419', steel: '#c4c9cb', cardboard: '#b8895a' },
  weathered: { body: '#4c6650', safety: '#c9a640', steel: '#9ea4a4', cardboard: '#9c7a55' },
  industrial: { body: '#2f5d9a', safety: '#e2672a', steel: '#d0d4d6', cardboard: '#c29464' },
  highVisibility: { body: '#d9d9d4', safety: '#ffd044', steel: '#c4c9cb', cardboard: '#b8895a' },
});

const p = assembly("cardboard-compactor");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const dark = '#2b2f33';

const W = 1500, D = 1000, Z0 = 120, ZC = 2200; // chamber width, depth, floor, top
const OP0 = 1250, OP1 = 2000; // loading opening

// Skid feet and the press chamber with a pocket behind the loading opening.
for (const x of [-W / 2 + 120, W / 2 - 120]) add(`skid-${x > 0 ? 'r' : 'l'}`, blk(x, 0, 0, 200, D + 200, Z0).color(dark));
add("chamber", blk(0, 0, Z0, W, D, ZC - Z0).subtract(blk(0, -D / 2 + 160, OP0, W - 260, 340, OP1 - OP0)).color(body));
add("opening-sill", blk(0, -D / 2 - 10, OP0 - 60, W - 200, 40, 60).color(safety));

// Flattened cardboard waiting in the chamber.
for (let k = 0; k < 4; k++) {
  add(`cardboard-sheet-${k}`, blk(-30 + k * 20, -D / 2 + 180, OP0 + k * 45, W - 320 - k * 40, 300, 40).rotateY(k % 2 ? 1.5 : -1.5).color(k % 2 ? '#a77c50' : cardboard));
}
add("cardboard-box", box(420, 300, 280, true).rotateZ(14).rotateY(-18).translate(260, -D / 2 + 200, OP0 + 330).color(cardboard));
add("cardboard-flap", box(380, 280, 20, true).rotateX(-30).translate(-280, -D / 2 + 170, OP0 + 360).color('#c79a68'));

// Sliding mesh safety gate in guide channels.
for (const x of [-W / 2 + 70, W / 2 - 70]) add(`gate-guide-${x > 0 ? 'r' : 'l'}`, blk(x, -D / 2 - 30, OP0 - 60, 60, 60, ZC - OP0 + 300).color(safety));
const GZ = gate.value === 'raised' ? 600 : 0;
const GW = W - 260, GH = OP1 - OP0 + 40;
for (const z of [0, GH / 2, GH - 40]) add(`gate-rail-${z}`, blk(0, -D / 2 - 40, OP0 - 20 + GZ + z, GW, 30, 40).color(safety));
for (let k = 0; k <= 15; k++) {
  const x = -GW / 2 + 30 + (k * (GW - 60)) / 15;
  add(`gate-wire-${k}`, blk(x, -D / 2 - 40, OP0 - 20 + GZ, 12, 12, GH).color(safety));
}
add("gate-handle", blk(0, -D / 2 - 80, OP0 + 40 + GZ, 400, 30, 30).color(dark));

// Bale door below with strapping slots and two latch wheels.
const DZ1 = OP0 - 120;
add("bale-door", blk(0, -D / 2 - 30, Z0 + 40, W - 120, 50, DZ1 - Z0 - 40).color(body));
add("door-edge-stripe", blk(-W / 2 + 90, -D / 2 - 60, Z0 + 40, 60, 12, DZ1 - Z0 - 40).color(safety));
for (let k = 0; k < 4; k++) add(`strap-slot-${k}`, blk(-W / 2 + 330 + k * 280, -D / 2 - 58, Z0 + 140, 60, 10, DZ1 - Z0 - 220).color(dark));
for (const z of [Z0 + 120, DZ1 - 300]) add(`door-hinge-${z}`, cylinder(180, 35, 10).translate(W / 2 - 40, -D / 2 - 70, z).color(steel));
for (const [z, tag] of [[Z0 + 240, 'low'], [DZ1 - 260, 'high']] as const) {
  add(`latch-wheel-${tag}`, torus(110, 18, 16).rotateX(90).translate(-W / 2 + 280, -D / 2 - 110, z).color(safety));
  add(`latch-hub-${tag}`, cylinder(60, 30, 10).rotateX(90).translate(-W / 2 + 280, -D / 2 - 55, z).color(steel));
  for (const a of [0, 120, 240]) add(`latch-spoke-${tag}-${a}`, blk(0, 0, 0, 16, 16, 110).rotateY(a).translate(-W / 2 + 280, -D / 2 - 110, z).color(safety));
}

// Corner columns, crosshead and twin hydraulic cylinders.
const ZH = ZC + 320;
for (const x of [-W / 2 - 40, W / 2 + 40]) for (const y of [-D / 2 + 60, D / 2 - 60]) {
  add(`column-${x > 0 ? 'r' : 'l'}-${y > 0 ? 'b' : 'f'}`, blk(x, y, Z0, 120, 120, ZH + 220 - Z0).color(body));
}
add("head-box", blk(0, 0, ZC, W - 40, D - 120, 320).color(body));
add("crosshead", blk(0, 0, ZH, W + 240, 380, 220).color(dark));
for (const x of [-350, 350]) {
  add(`cylinder-barrel-${x > 0 ? 'r' : 'l'}`, cylinder(700, 120, 14).translate(x, 0, ZH + 220).color(body));
  add(`cylinder-cap-${x > 0 ? 'r' : 'l'}`, cylinder(70, 145, 14).translate(x, 0, ZH + 920).color(dark));
  add(`cylinder-gland-${x > 0 ? 'r' : 'l'}`, cylinder(60, 145, 14).translate(x, 0, ZH + 220).color(dark));
  add(`hose-${x > 0 ? 'r' : 'l'}`, blk(x * 0.55, 170, ZH + 220, 40, 40, 620).color(dark));
}
add("ram-rod-guide", cylinder(80, 60, 10).translate(0, 0, ZH + 220).color(steel));
add("warning-plate", blk(0, -190 - 6, ZH + 50, 600, 12, 120).color(safety));

// Side power pack on +X: oil tank, motor and pump.
const PX = W / 2 + 330;
add("oil-tank", blk(PX, 120, Z0, 420, 700, 520).color(body));
add("tank-cap", cylinder(40, 50, 10).translate(PX - 80, 300, Z0 + 520).color(dark));
add("motor", cylinder(420, 140, 14).rotateX(90).translate(PX, 0, Z0 + 720).color('#3d4f63'));
add("motor-fan-cover", cylinder(80, 150, 14).rotateX(90).translate(PX, -420, Z0 + 720).color(dark));
add("pump-bell", cylinder(160, 110, 12).rotateX(90).translate(PX, 160, Z0 + 720).color(steel));
add("pressure-line", blk(PX - 120, 260, Z0 + 520, 40, 40, ZH - Z0 - 220).color(dark));
add("pressure-line-top", blk(PX - 330, 260, ZH - 40, 460, 40, 40).color(dark));

// Control box with buttons and a mains isolator on the -X column.
const CX = -W / 2 - 170;
add("control-box", blk(CX, -D / 2 + 260, 1150, 200, 420, 560).color('#d9d9d4'));
add("isolator", cylinder(40, 55, 12).rotateY(-90).translate(CX - 100, -D / 2 + 180, 1600).color('#d62f2a'));
add("isolator-plate", blk(CX - 104, -D / 2 + 180, 1540, 8, 150, 120).color(safety));
add("button-start", cylinder(30, 30, 10).rotateY(-90).translate(CX - 100, -D / 2 + 340, 1380).color('#2f9a4f'));
add("button-stop", cylinder(40, 42, 10).rotateY(-90).translate(CX - 100, -D / 2 + 340, 1250).color('#d62f2a'));
add("ram-gauge", cylinder(25, 55, 12).rotateY(-90).translate(CX - 100, -D / 2 + 340, 1520).color(steel));

// Finished, strapped cardboard bale on a pallet beside the machine (-X).
const BX = -W / 2 - 1150, BY = -350;
for (let k = 0; k < 3; k++) add(`pallet-board-${k}`, blk(BX, BY - 400 + k * 400, 0, 1150, 100, 120).color('#9b7a52'));
add("pallet-deck", blk(BX, BY, 120, 1200, 900, 25).color('#b08a5a'));
add("bale", blk(BX, BY, 145, 1100, 760, 800).color(cardboard));
for (let k = 0; k < 4; k++) add(`bale-layer-${k}`, blk(BX, BY, 260 + k * 170, 1112, 772, 18).color('#9c7448'));
for (let k = 0; k < 4; k++) add(`bale-strap-${k}`, blk(BX - 400 + k * 270, BY, 140, 16, 776, 816).color(dark));

return p.model();
