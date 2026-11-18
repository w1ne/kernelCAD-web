// SPDX-License-Identifier: CC0-1.0
// Modular stage deck: one 8 x 4 ft portable stage platform standing on its
// tube legs, the unit a stage crew clamps together into a performance floor.
// What makes it a stage deck rather than a table: a painted hardboard top
// over a birch ply core in an aluminium extrusion frame, round leg sockets
// at the corners and mid-span, tube legs with clamp collars, diagonal
// cross-bracing on the front and sides, screw-jack levelling feet on round
// floor plates, and the cam-lock deck clamps along the frame edge.
// Generic visualization geometry at about real size (2.44 x 1.22 m, 0.6 m
// tall), millimetres, Z up, front toward -Y, foot plates standing on z = 0.

meta({
  name: "modular-stage-deck",
  license: 'CC0-1.0',
  title: "Modular stage deck",
  description: "Portable 8 x 4 ft stage platform at about real size: painted hardboard top over a birch ply core, aluminium extrusion frame, six tube legs in round sockets with clamp collars, diagonal cross-bracing on the front and sides, screw-jack levelling feet on rubber-padded floor plates, and cam-lock deck clamps with levers along the frame. Material controls: deck surface, ply core, aluminium frame, steel legs. houseShow, touring and danceFloor presets; low, standard and high leg heights.",
  tags: ['stage deck', 'stage platform', 'portable stage', 'riser', 'staging', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const height = param('height', 'standard', { choices: ['low', 'standard', 'high'], label: 'Leg height' });

const surface = param('surface', '#1f2124', { label: 'Deck surface' });
const ply = param('ply', '#c9a06a', { label: 'Ply core edge' });
const frame = param('frame', '#b8c0c4', { label: 'Aluminium frame' });
const legs = param('legs', '#3a4147', { label: 'Steel legs and braces' });

presets({
  houseShow: { surface: '#1f2124', ply: '#c9a06a', frame: '#b8c0c4', legs: '#3a4147' },
  touring: { surface: '#2c2f33', ply: '#b8874f', frame: '#2a2d30', legs: '#d4a31f' },
  danceFloor: { surface: '#6f6a62', ply: '#d9b98a', frame: '#d6dadb', legs: '#59626a' },
});

const RUBBER = '#18191b';

const p = assembly("modular-stage-deck");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);

const L = 2440;
const W = 1220;
const ZF = height.value === 'low' ? 300 : height.value === 'high' ? 900 : 520; // frame underside
const FH = 70; // frame depth

// Top: hardboard skin over the ply core, inside an extrusion frame.
add("deck-surface", blk(0, 0, ZF + FH + 18, L, W, 6).color(surface));
add("ply-core", blk(0, 0, ZF + FH, L, W, 18).color(ply));
for (const [s, y] of [["front", -W / 2 + 15], ["back", W / 2 - 15]] as [string, number][])
  add(`frame-${s}`, blk(0, y, ZF, L, 30, FH).color(frame));
for (const [s, x] of [["left", -L / 2 + 15], ["right", L / 2 - 15]] as [string, number][])
  add(`frame-${s}`, blk(x, 0, ZF, 30, W - 60, FH).color(frame));
add("frame-mid", blk(0, 0, ZF + 10, 40, W - 60, FH - 10).color(frame));

// Legs: socket, tube, clamp collar, screw jack, floor plate.
const LX = L / 2 - 90;
const LY = W / 2 - 90;
const legAt: [string, number, number][] = [
  ["lf", -LX, -LY], ["mf", 0, -LY], ["rf", LX, -LY],
  ["lb", -LX, LY], ["mb", 0, LY], ["rb", LX, LY],
];
for (const [id, x, y] of legAt) {
  add(`socket-${id}`, cylinder(FH, 38, 16).translate(x, y, ZF).color(frame));
  add(`leg-${id}`, cylinder(ZF - 90, 24, 14).translate(x, y, 90).color(legs));
  add(`collar-${id}`, cylinder(40, 31, 14).translate(x, y, ZF - 70).color(frame));
  add(`collar-bolt-${id}`, cylinder(30, 8, 8).rotateX(90).translate(x, y - 28, ZF - 50).color(RUBBER));
  add(`jack-${id}`, cylinder(80, 12, 10).translate(x, y, 14).color(frame));
  add(`jack-nut-${id}`, cylinder(16, 26, 6).translate(x, y, 80).color(legs));
  add(`foot-plate-${id}`, cylinder(8, 55, 16).translate(x, y, 6).color(legs));
  add(`foot-pad-${id}`, cylinder(6, 55, 16).color(RUBBER));
}

// Flat-bar cross braces between leg pairs, front, back and both ends.
const ZLO = 150;
const ZHI = ZF - 90;
const span = LX;
const ang = (Math.atan2(ZHI - ZLO, span) * 180) / Math.PI;
const len = Math.hypot(ZHI - ZLO, span);
for (const [s, y] of [["front", -LY - 30], ["back", LY + 30]] as [string, number][])
  for (const sx of [-1, 1]) {
    const tilt = sx < 0 ? -ang : ang;
    add(`brace-${s}-${sx < 0 ? 'l' : 'r'}`, box(len, 8, 40, true).rotateY(tilt).translate((sx * span) / 2, y, (ZLO + ZHI) / 2).color(legs));
  }
const sideLen = Math.hypot(ZHI - ZLO, 2 * LY);
const sideAng = (Math.atan2(ZHI - ZLO, 2 * LY) * 180) / Math.PI;
for (const [s, x] of [["left", -LX - 30], ["right", LX + 30]] as [string, number][])
  add(`brace-${s}`, box(8, sideLen, 40, true).rotateX(s === 'left' ? sideAng : -sideAng).translate(x, 0, (ZLO + ZHI) / 2).color(legs));

// Cam-lock deck clamps with levers along the front and ends.
const clamps: [string, number, number, number][] = [
  ["front-a", -600, -W / 2 - 8, 0], ["front-b", 600, -W / 2 - 8, 0],
  ["left", -L / 2 - 8, 0, 90], ["right", L / 2 + 8, 0, 90],
];
for (const [id, x, y, rz] of clamps) {
  add(`clamp-${id}`, box(70, 16, 50, true).rotateZ(rz).translate(x, y, ZF + 40).color(legs));
  add(`clamp-lever-${id}`, box(14, 10, 70, true).rotateY(30).rotateZ(rz).translate(x, y + (rz ? 0 : -12), ZF + 40).translate(rz ? Math.sign(x) * 12 : 0, 0, 0).color(RUBBER));
}

return p.model();
