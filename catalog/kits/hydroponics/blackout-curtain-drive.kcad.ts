// SPDX-License-Identifier: CC0-1.0
// Blackout curtain drive: the rack-and-pinion system that pulls a
// greenhouse blackout screen across a bay to control day length (for
// short-day crops) or to keep heat in at night.
// What makes it a screen drive: a gearmotor with a finned motor and a
// limit-switch box sitting on a long drive shaft along the truss line,
// the shaft running through bearing blocks on the columns and turning a
// pinion in each gearbox, toothed racks sliding through those gearboxes
// and pushing the aluminium leading-edge profile of the screen, and the
// screen itself running out over support wires from a folded package at
// the gutter end. Its top face is black and its underside is reflective
// white. Generic visualization geometry at about real size (1.8 m bay,
// screen at 1.7 m), millimetres, Z up, front -Y.

meta({
  name: "blackout-curtain-drive",
  license: 'CC0-1.0',
  title: "Blackout curtain drive",
  description: "Greenhouse blackout screen rack-and-pinion drive at about real size: two columns with a cross beam, a gearmotor with finned motor and limit-switch box on the drive shaft, bearing blocks, pinion gearboxes, toothed racks pushing the aluminium leading-edge profile, support wires and a black-over-white blackout screen running out from its folded package. Material controls: structure, gearmotor, screen top and screen underside, plus screen position (open, half, closed). blackout, energyScreen, shadeScreen and weathered presets.",
  tags: ['blackout screen', 'shade screen', 'energy curtain', 'screen drive', 'rack and pinion', 'gearmotor', 'photoperiod', 'greenhouse', 'hydroponics', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 5000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const structure = param('structure', '#b9c0c3', { label: 'Columns, shaft and racks (galvanised steel)' });
const motor = param('gearmotor', '#2f6fa8', { label: 'Gearmotor (painted)' });
const screenTop = param('screenTop', '#202225', { label: 'Screen top face' });
const screenUnder = param('screenUnder', '#eceae2', { label: 'Screen underside' });
const position = param('screenPosition', 'half', { choices: ['open', 'half', 'closed'], label: 'Screen position' });

presets({
  blackout: { structure: '#b9c0c3', gearmotor: '#2f6fa8', screenTop: '#202225', screenUnder: '#eceae2' },
  energyScreen: { structure: '#c6cbcd', gearmotor: '#e07a1f', screenTop: '#d9dcd8', screenUnder: '#bfc5c8' },
  shadeScreen: { structure: '#b0b6b8', gearmotor: '#3c7a3a', screenTop: '#4f5a52', screenUnder: '#9da69f' },
  weathered: { structure: '#8b908e', gearmotor: '#56708a', screenTop: '#34363a', screenUnder: '#c9c4b4' },
});

const p = assembly("blackout-curtain-drive");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateX(90).translate(x, y, z);

const CX = 900, TZ = 2200, SZ = 1700, Y0 = -900, Y1 = 900;
// Columns with base plates, a lattice truss beam across the top.
for (const x of [-CX, CX]) {
  add(`base-${x}`, blk(x, 0, 0, 240, 240, 12).color(structure));
  add(`column-${x}`, blk(x, 0, 12, 100, 100, TZ - 12).color(structure));
  add(`gutter-${x}`, blk(x, 0, TZ, 160, Y1 - Y0, 70).color(structure));
}
add("truss-top", blk(0, Y1 - 60, TZ - 50, 2 * CX, 50, 50).color(structure));
add("truss-bottom", blk(0, Y1 - 60, SZ + 280, 2 * CX, 50, 50).color(structure));
for (let k = 0; k < 6; k++) {
  const x0 = -CX + 50 + k * 300, x1 = x0 + 300, up = k % 2 === 0;
  const a = up ? SZ + 305 : TZ - 25, b = up ? TZ - 25 : SZ + 305;
  const len = Math.hypot(300, b - a), ang = (Math.atan2(b - a, 300) * 180) / Math.PI;
  add(`truss-web-${k}`, box(len, 20, 20, true).rotateY(-ang).translate((x0 + x1) / 2, Y1 - 60, (a + b) / 2).color(structure));
}

// Drive shaft along the truss line, through bearing blocks on the columns.
const DY = Y1 - 160, DZ = SZ + 160;
add("drive-shaft", cylX(-CX - 80, DY, DZ, 2 * CX + 160, 16, 10).color(structure));
for (const x of [-CX + 70, CX - 70]) {
  add(`bearing-${x}`, blk(x, DY, DZ - 50, 60, 90, 100).color('#3b3f42'));
  add(`bearing-arm-${x}`, blk(x + Math.sign(x) * 40, DY, DZ - 20, 60, 40, 40).color(structure));
}

// Gearmotor at mid-span: gearbox on the shaft, finned motor, limit switches.
add("gearbox", blk(0, DY, DZ - 110, 180, 170, 220).color(motor));
add("gearbox-flange", cylY(0, DY - 85, DZ, 20, 80, 16).color(motor));
add("motor", cylY(0, DY - 105, DZ - 40, 300, 75, 16).color(motor));
for (let k = 0; k < 6; k++) add(`motor-fin-${k}`, cylY(0, DY - 130 - k * 45, DZ - 40, 12, 82, 16).color(motor));
add("motor-fan-cover", cylY(0, DY - 405, DZ - 40, 40, 78, 16).color('#3b3f42'));
add("terminal-box", blk(0, DY - 250, DZ + 30, 110, 120, 70).color(motor));
add("limit-box", blk(140, DY, DZ - 60, 100, 130, 150).color('#e3e4df'));
add("limit-dial", cylX(190, DY - 20, DZ + 20, 4, 30, 16).color('#c0392b'));
add("motor-cable", cylZ(-60, DY - 250, DZ + 100, TZ - DZ - 100, 7, 6).color('#1f2326'));

// Racks along Y through pinion gearboxes on the shaft, teeth on top.
const LE = position.value === 'open' ? Y1 - 300 : position.value === 'closed' ? Y0 + 80 : -100; // leading edge
const RL = 1300;
for (const x of [-500, 500]) {
  add(`pinion-box-${x}`, blk(x, DY, DZ - 70, 110, 140, 140).color('#3b3f42'));
  add(`rack-${x}`, blk(x, LE + RL / 2, DZ - 30, 30, RL, 30).color(structure));
  for (let k = 0; k < 18; k++) add(`tooth-${x}-${k}`, blk(x, LE + 40 + k * 70, DZ - 2, 26, 20, 14).color(structure));
  add(`rack-clamp-${x}`, blk(x, LE, DZ - 70, 60, 50, 110).color(structure));
  add(`push-rod-${x}`, blk(x, LE, SZ, 20, 20, DZ - 70 - SZ).color(structure));
}
// Leading-edge profile pulled across, screen run out behind it.
add("leading-edge", cylX(-CX + 60, LE, SZ, 2 * CX - 120, 22, 10).color('#d0d4d6'));
const pack = Y1 - 160;
if (LE < pack - 40) {
  add("screen-top", blk(0, (LE + pack) / 2, SZ + 4, 2 * CX - 140, pack - LE, 4).color(screenTop));
  add("screen-under", blk(0, (LE + pack) / 2, SZ, 2 * CX - 140, pack - LE, 4).color(screenUnder));
  // Slight sag between support wires shown as hanging pleats.
  for (let y = LE + 220; y < pack - 60; y += 260) add(`screen-pleat-${y}`, cylX(-CX + 70, y, SZ - 10, 2 * CX - 140, 14, 6).color(screenUnder));
}
// Folded package at the gutter end, hanging below the support wires.
for (let k = 0; k < 5; k++) add(`package-fold-${k}`, blk(0, pack - 20 + k * 30, SZ - 140 + (k % 2) * 20, 2 * CX - 140, 24, 150).color(k % 2 === 0 ? screenTop : screenUnder));
// Support wires along Y under the screen.
for (const x of [-700, -350, 0, 350, 700]) add(`wire-${x}`, cylY(x, Y1, SZ - 6, Y1 - Y0, 3, 4).color(structure));

return p.model();
