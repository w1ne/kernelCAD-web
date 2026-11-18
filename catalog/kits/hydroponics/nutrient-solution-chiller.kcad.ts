// SPDX-License-Identifier: CC0-1.0
// Nutrient solution chiller: the drop-in style refrigeration unit that keeps
// a hydroponic reservoir below about 20 °C so roots get enough dissolved
// oxygen, shown next to the reservoir it serves.
// What makes it a chiller: a compact cabinet with a louvred condenser intake
// on the front, a round fan guard exhausting warm air from the top, a
// thermostat panel with a temperature readout, and two barbed hose fittings
// on the back (warm solution in, chilled solution out) looping to a pump in
// the reservoir.
// Generic visualization geometry at about real size (cabinet about 420 x 380
// x 500 mm, 1/4 HP class), millimetres, Z up, front toward -Y.

meta({
  name: "nutrient-solution-chiller",
  license: 'CC0-1.0',
  title: "Nutrient solution chiller",
  description: "Reservoir chiller at about real size: compact cabinet on rubber feet with a louvred front condenser intake, side vent slots, top fan guard with fan blades, thermostat panel with temperature readout and keys, and barbed inlet and outlet fittings on the back whose hoses loop to a submersible pump in a lidded reservoir tote. Material controls: cabinet, grilles and trim, hoses, reservoir, plus a with/without reservoir choice. aquaBlue, labWhite, blackOut and weathered presets.",
  tags: ['chiller', 'water chiller', 'reservoir chiller', 'refrigeration', 'cooling', 'nutrient solution', 'hydroponics', 'greenhouse', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 2800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cabinet = param('cabinet', '#2c5d8f', { label: 'Cabinet (powder-coated steel)' });
const grille = param('grille', '#2a2d30', { label: 'Grilles and trim (polymer)' });
const hose = param('hose', '#cfd8d2', { label: 'Hoses (clear vinyl)' });
const tote = param('reservoir', '#2b2e30', { label: 'Reservoir tote (polyethylene)' });
const layout = param('layout', 'with reservoir', { choices: ['chiller only', 'with reservoir'], label: 'Layout' });

presets({
  aquaBlue: { cabinet: '#2c5d8f', grille: '#2a2d30', hose: '#cfd8d2', reservoir: '#2b2e30' },
  labWhite: { cabinet: '#e9ebe7', grille: '#5a6066', hose: '#d7e2dc', reservoir: '#3a6fa0' },
  blackOut: { cabinet: '#26292c', grille: '#121416', hose: '#1c1c1c', reservoir: '#1f2224' },
  weathered: { cabinet: '#4f6a80', grille: '#3e403c', hose: '#c9c4a6', reservoir: '#45484a' },
});

const p = assembly("nutrient-solution-chiller");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).translate(x, y, z);
// cylinder(...).rotateX(90) runs from its origin toward -Y.
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).rotateX(90).translate(x, y, z);
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};
const run = (name: string, pts: [number, number, number][], r: number, color: string) => {
  for (let k = 0; k < pts.length - 1; k++) add(`${name}-${k}`, rod(pts[k], pts[k + 1], r).color(color));
};

const W = 420; // cabinet width (X)
const D = 380; // cabinet depth (Y)
const H = 480; // cabinet height above the feet
const Z0 = 24; // feet height
const FY = -D / 2; // front face

// Feet and cabinet with a rounded-looking top edge (chamfered lid).
for (const [i, [x, y]] of [[-170, -150], [170, -150], [-170, 150], [170, 150]].entries()) {
  add(`foot-${i}`, cylZ(x, y, 0, Z0, 22, 10).color('#1b1b1b'));
}
add("cabinet", blk(0, 0, Z0, W, D, H - 30).color(cabinet));
const lid = path().moveTo(-W / 2, 0).lineTo(W / 2, 0).lineTo(W / 2 - 22, 30).lineTo(-W / 2 + 22, 30).close()
  .extrude(D - 20).rotateX(90).translate(0, D / 2 - 10, Z0 + H - 30);
add("lid", lid.color(cabinet));
add("base-trim", blk(0, 0, Z0, W + 8, D + 8, 26).color(grille));

// Front: louvred condenser intake (slats tilted down) in a bezel.
add("intake-bezel", blk(0, FY - 4, Z0 + 50, W - 60, 10, 250).color(grille));
for (let k = 0; k < 9; k++) {
  add(`louvre-${k}`, box(W - 84, 6, 26, true).rotateX(-35).translate(0, FY - 12, Z0 + 72 + k * 25).color('#3a3f44'));
}
// Thermostat panel above the intake.
add("panel", blk(0, FY - 4, Z0 + 320, W - 60, 10, 110).color(grille));
add("display", blk(-70, FY - 10, Z0 + 345, 150, 6, 60).color('#14281d'));
for (let k = 0; k < 3; k++) add(`digit-${k}`, blk(-115 + k * 42, FY - 14, Z0 + 355, 28, 3, 40).color('#6fe08a'));
add("unit-c", blk(-12, FY - 14, Z0 + 385, 10, 3, 10).color('#6fe08a'));
for (const [i, x] of [60, 100, 140].entries()) {
  add(`key-${i}`, cylY(x, FY - 9, Z0 + 375, 8, 13, 10).color(i === 0 ? '#c0392b' : '#d9dcde'));
}
add("power-led", cylY(140, FY - 9, Z0 + 340, 6, 5, 6).color('#6fe08a'));
add("badge", blk(0, FY - 10, Z0 + 440, 120, 4, 18).color('#d9dcde'));

// Side vent slots.
for (const side of [-1, 1]) {
  for (let k = 0; k < 6; k++) add(`vent-${side > 0 ? 'r' : 'l'}-${k}`, blk(side * (W / 2 + 2), -40, Z0 + 120 + k * 40, 6, 220, 14).color(grille));
}

// Top fan guard: rings, spokes, hub and blades.
const FZ = Z0 + H;
add("fan-shroud", cylZ(0, 0, FZ - 4, 14, 150, 28).color(grille));
for (const [i, r] of [140, 105, 70].entries()) add(`guard-ring-${i}`, cylZ(0, 0, FZ + 10, 6, r, 28).color('#5a6066'));
add("guard-ring-fill", cylZ(0, 0, FZ + 9, 2, 134, 28).color('#1b1d1f'));
for (let k = 0; k < 4; k++) add(`guard-spoke-${k}`, box(290, 8, 6, true).rotateZ(k * 45).translate(0, 0, FZ + 19).color('#5a6066'));
for (let k = 0; k < 5; k++) add(`fan-blade-${k}`, box(110, 46, 4, true).rotateX(18).translate(70, 0, 0).rotateZ(k * 72 + 10).translate(0, 0, FZ + 12).color('#3a3f44'));
add("fan-hub", cylZ(0, 0, FZ + 10, 14, 34, 14).color('#5a6066'));

// Back: barbed inlet (warm, red ring) and outlet (chilled, blue ring) fittings.
const BY = D / 2;
const ports: [string, number, string][] = [['inlet', 300, '#c0392b'], ['outlet', 180, '#2f6fa8']];
for (const [tag, z, ring] of ports) {
  add(`${tag}-boss`, cylY(110, BY + 20, Z0 + z, 20, 30, 12).color(grille));
  add(`${tag}-barb`, cylY(110, BY + 75, Z0 + z, 55, 14, 10).color('#c9ccce'));
  add(`${tag}-ring`, cylY(110, BY + 30, Z0 + z, 8, 33, 12).color(ring));
}
add("power-cord-socket", blk(-120, BY + 2, Z0 + 80, 60, 10, 50).color(grille));
run("power-cord", [[-120, BY + 10, Z0 + 100], [-140, BY + 90, Z0 + 60], [-160, BY + 160, 8], [-320, BY + 200, 8]], 5, '#1b1b1b');

if (layout.value === 'with reservoir') {
  // Lidded reservoir tote beside the chiller: tapered walls, lid, pump inside.
  const RX = 640;
  const RW = 560;
  const RD = 420;
  const RH = 360;
  const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
  const body = rect(RW - 50, RD - 50).loft([rect(RW, RD)], {
    planes: [{ plane: 'XY' as const, origin: [0, 0, 0] as [number, number, number] }, { plane: 'XY' as const, origin: [0, 0, RH] as [number, number, number] }],
    ruled: true,
  });
  add("reservoir-body", body.translate(RX, 120, 0).color(tote));
  add("reservoir-lid", blk(RX, 120, RH, RW + 30, RD + 30, 26).color(tote));
  add("reservoir-lid-rim", blk(RX, 120, RH + 26, RW - 40, RD - 40, 12).color(tote));
  add("reservoir-fill-mark", blk(RX, 120 - RD / 2 + 10, 220, 300, 3, 6).color('#d9dcde'));
  add("reservoir-label", blk(RX, 120 - RD / 2 + 8, 120, 160, 3, 60).color('#e0a21c'));
  // Hose grommets in the lid.
  for (const [i, x] of [RX - 150, RX - 60].entries()) add(`grommet-${i}`, cylZ(x, 220, RH + 26, 14, 26, 10).color('#1b1b1b'));
  // Warm solution from the pump up to the chiller inlet; chilled return back down.
  run("hose-in", [[110, BY + 130, Z0 + 300], [110, BY + 220, Z0 + 340], [300, 330, RH + 140], [RX - 150, 220, RH + 90], [RX - 150, 220, RH + 26]], 13, hose);
  run("hose-out", [[110, BY + 130, Z0 + 180], [140, BY + 230, Z0 + 200], [330, 300, RH + 70], [RX - 60, 220, RH + 60], [RX - 60, 220, RH + 26]], 13, hose);
  for (const [i, [z]] of [[Z0 + 300], [Z0 + 180]].entries()) add(`hose-clamp-${i}`, cylY(110, BY + 120, z, 14, 18, 10).color('#c9ccce'));
} else {
  // Short hose tails with capped ends.
  for (const [tag, z] of ports) {
    run(`${tag}-tail`, [[110, BY + 130, Z0 + z], [110, BY + 230, Z0 + z - 40], [110, BY + 260, 14]], 13, hose);
  }
}

return p.model();
