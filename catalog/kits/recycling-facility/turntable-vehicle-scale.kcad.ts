// SPDX-License-Identifier: CC0-1.0
// Turntable vehicle scale: a round weighing turntable that weighs a small
// collection vehicle and then turns it to face the exit, used where a
// recovery site's reception yard is too tight for trucks to turn. What makes
// it a turntable scale rather than a disc: a round steel deck with two raised
// wheel tracks and a central pivot cap, sitting in a concrete ring with a
// hazard-striped rim and a dark running gap, bolted load-cell inspection
// covers around the ring, a drive gearmotor in a side housing, a short entry
// ramp, and a control pedestal with a weight readout, turn buttons and an
// emergency stop. The deck's turn angle is a parameter.
// Generic visualization geometry at about real size (4.2 m deck, 4.8 m
// ring), millimetres, Z up, entry from -Y.

meta({
  name: "turntable-vehicle-scale",
  license: 'CC0-1.0',
  title: "Turntable vehicle scale",
  description: "Weighing turntable at about real size: 4.2 m round steel deck with raised wheel tracks, anti-slip bars and central pivot cap, concrete ring with hazard-striped rim and running gap, load-cell inspection covers, side drive gearmotor housing, entry ramp, and control pedestal with weight readout, turn buttons and emergency stop. Deck turn angle 0, 45 or 90 degrees. Material controls: deck, concrete ring, hazard rim and control pedestal. blueDeck, galvanised and weathered presets.",
  tags: ["turntable", "vehicle turntable", "weighbridge", "vehicle scale", "truck scale", "recycling", "materials recovery", "waste management", "reception", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const deck = param('deck', '#2f5f86', { label: 'Turntable deck (painted steel)' });
const ring = param('ring', '#9a9b94', { label: 'Concrete ring' });
const hazard = param('hazard', '#f0c419', { label: 'Hazard rim (safety yellow)' });
const console_ = param('console', '#e2e3df', { label: 'Control pedestal' });
const turn = param('turn', '0', { choices: ['0', '45', '90'], label: 'Deck turn angle (degrees)' });

presets({
  blueDeck: { deck: '#2f5f86', ring: '#9a9b94', hazard: '#f0c419', console: '#e2e3df' },
  galvanised: { deck: '#a7adaa', ring: '#9a9b94', hazard: '#e8b41c', console: '#2c4f7c' },
  weathered: { deck: '#5b5246', ring: '#86857c', hazard: '#b99a3a', console: '#bdb8a8' },
});

const p = assembly("turntable-vehicle-scale");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// Side outline [[x, z], ...] extruded across Y from y0 to y1.
const prismY = (pts: number[][], y0: number, y1: number) => extrudePolygon(pts, y1 - y0).rotateX(90).translate(0, y1, 0);
// Side outline [[y, z], ...] extruded along X from x0 to x1.
const prismX = (pts: number[][], x0: number, x1: number) => extrudePolygon(pts, x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);

const RD = 2100; // deck radius
const RG = 2160; // ring inner radius
const RO = 2450; // ring outer radius
const Z = 300; // ring and deck top

// Concrete ring with a dark running gap and the pit floor seen through it.
add("pit-floor", cylinder(40, RG, 40).color('#3a3d40'));
add("ring", cylinder(Z, RO, 40).subtract(cylinder(Z + 2, RG, 40).translate(0, 0, -1)).color(ring));
add("hazard-rim", cylinder(8, RO - 20, 40).subtract(cylinder(10, RG + 20, 40).translate(0, 0, -1)).translate(0, 0, Z).color(hazard));
for (let k = 0; k < 20; k++) {
  if (k % 2) continue;
  add(`rim-stripe-${k}`, box(320, 120, 10, true).rotateZ(35).translate((RG + RO) / 2, 0, Z + 5).rotateZ(k * 18).color('#1b1c1d'));
}
// Load-cell inspection covers on the ring.
for (let k = 0; k < 4; k++) {
  const a = 45 + k * 90;
  add(`cell-cover-${k}`, box(260, 200, 12, true).translate((RG + RO) / 2, 0, Z + 14).rotateZ(a).color('#7d8386'));
}

// Turntable deck, rotated as a group by the turn angle.
const ang = Number(turn.value);
const spin = (s: Shape) => s.rotateZ(ang);
add("deck-plate", cylinder(Z - 60, RD, 40).translate(0, 0, 60).color(deck));
add("deck-skirt", cylinder(20, RD + 10, 40).translate(0, 0, Z - 30).color('#1f2a33'));
for (const [i, x] of [[0, -800], [1, 800]] as const) {
  add(`track-${i}`, spin(blk(x, 0, Z, 700, 2 * Math.sqrt(RD * RD - (Math.abs(x) + 350) ** 2) - 40, 25)).color('#3a4650'));
  for (let k = 0; k < 9; k++) add(`track-bar-${i}-${k}`, spin(blk(x, -1200 + k * 300, Z + 25, 640, 40, 10)).color('#1f2a33'));
}
add("pivot-cap", cylinder(30, 260, 24).translate(0, 0, Z).color('#c3c9cb'));
add("pivot-bolt-ring", cylinder(14, 180, 24).translate(0, 0, Z + 30).color('#5d6366'));
// Direction arrows painted between the tracks, turning with the deck.
const arrow = [[-80, 0], [80, 0], [80, 260], [180, 260], [0, 460], [-180, 260], [-80, 260]];
for (const [i, off] of [[0, -1350], [1, 650]] as const) {
  add(`arrow-${i}`, spin(extrudePolygon(arrow.map(([x, y]) => [x, y + off]), 6).translate(0, 0, Z)).color(hazard));
}

// Entry ramp from -Y.
add("ramp", prismX([[-RO - 1400, 0], [-RO + 60, Z], [-RO + 60, 0]], -1500, 1500).color(ring));
const rampAng = (Math.atan2(Z, 1460) * 180) / Math.PI;
for (let k = 0; k < 6; k++) {
  const y = -RO - 1200 + k * 230;
  const z = ((y + RO + 1400) / 1460) * Z;
  add(`ramp-groove-${k}`, box(2800, 30, 8, true).rotateX(rampAng).translate(0, y, z + 1).color('#7c7d77'));
}

// Drive gearmotor housing on the -X side of the ring.
const GX = -RO - 300;
add("drive-plinth", blk(GX, 0, 0, 700, 900, 120).color(ring));
add("drive-housing", prismY([[GX - 300, 120], [GX + 300, 120], [GX + 300, 640], [GX - 200, 640], [GX - 300, 560]], -380, 380).color(deck));
add("drive-motor", cylinder(420, 150, 18).rotateX(90).translate(GX - 60, -380, 380).color('#5d6366'));
add("drive-motor-fan", cylinder(30, 130, 18).rotateX(90).translate(GX - 60, -800, 380).color('#2b2d2f'));
add("drive-vent", blk(GX - 302, 0, 300, 6, 420, 200).color('#2b2d2f'));
add("drive-warning", box(140, 6, 140, true).rotateY(45).translate(GX + 80, -383, 450).color(hazard));

// Control pedestal at the entry, driver side.
const CX = -RO - 500;
const CY = -RO - 400;
add("pedestal-base", blk(CX, CY, 0, 400, 400, 30).color('#7d8386'));
add("pedestal", blk(CX, CY, 30, 220, 220, 1150).color(console_));
// Head tipped back toward the driver; its parts are placed in head coordinates.
const head = (sh: Shape) => sh.rotateX(-25).translate(CX, CY, 1330);
add("console-head", head(box(520, 360, 320, true)).color(console_));
add("readout", head(box(360, 8, 110, true).translate(0, -182, 60)).color('#121416'));
for (let k = 0; k < 4; k++) add(`readout-digit-${k}`, head(box(50, 6, 70, true).translate(-112 + k * 75, -186, 60)).color('#ff3b2e'));
add("btn-left", head(cylinder(20, 40, 14).rotateX(90).translate(-90, -180, -70)).color('#3cdc5a'));
add("btn-right", head(cylinder(20, 40, 14).rotateX(90).translate(30, -180, -70)).color('#3cdc5a'));
add("estop-collar", head(cylinder(20, 70, 16).translate(150, 40, 160)).color(hazard));
add("estop", head(cylinder(50, 55, 16).translate(150, 40, 180)).color('#d23a2a'));

return p.model();
