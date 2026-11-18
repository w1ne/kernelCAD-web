// SPDX-License-Identifier: CC0-1.0
// Marley floor roll: a roll of reversible vinyl dance floor on a roll stand,
// part unrolled across the deck the way a crew lays a dance floor.
// What makes it a marley roll rather than a cylinder: the vinyl wound on a
// cardboard core with the layers showing as rings on the ends, a steel
// axle through the core carried by two A-frame end stands, a loose sheet
// peeling off the bottom of the roll and lying flat across the floor with
// its performance face up, floor tape along the seam edge, spike marks and
// a roll of tape left lying on the sheet.
// Generic visualization geometry at about real size (1.6 m wide roll,
// 1.9 m of sheet laid out), millimetres, Z up, sheet laid toward -Y,
// standing on z = 0.

meta({
  name: "marley-floor-roll",
  license: 'CC0-1.0',
  title: "Marley floor roll",
  description: "Reversible vinyl dance floor roll at about real size: vinyl wound on a cardboard core with the layer rings showing on the ends, steel axle with locking collars carried by two A-frame end stands on rubber feet, a loose sheet peeling off the bottom of the roll and laid flat across the deck performance face up, floor tape along the seam, spike marks and a roll of tape on the sheet. Material controls: performance face, reverse face, stand steel, floor tape. black, grey and whiteFloor presets.",
  tags: ['marley', 'dance floor', 'vinyl floor', 'floor roll', 'roll stand', 'floor tape', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const vinyl = param('vinyl', '#2a2b2e', { label: 'Performance face vinyl' });
const reverse = param('reverse', '#8e9296', { label: 'Reverse face vinyl' });
const steel = param('steel', '#c43d2f', { label: 'Stand steel' });
const tape = param('tape', '#e9e6dc', { label: 'Floor tape' });

presets({
  black: { vinyl: '#2a2b2e', reverse: '#8e9296', steel: '#c43d2f', tape: '#e9e6dc' },
  grey: { vinyl: '#8e9296', reverse: '#2a2b2e', steel: '#2f5f8a', tape: '#2a2b2e' },
  whiteFloor: { vinyl: '#ecebe6', reverse: '#1f2022', steel: '#3a3f44', tape: '#ecebe6' },
});

const CORE = '#b48a5a';
const RUBBER = '#18191b';

const p = assembly("marley-floor-roll");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const alongX = (len: number, r: number, n = 20) => cylinder(len, r, n).rotateY(90); // x from 0 to len
// Side profile drawn in (y, z) and extruded t wide along X, centred on x = 0.
const profileYZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const RW = 1600; // roll width
const R = 165; // roll radius
const ZC = 440; // axle height
const SX = RW / 2 + 70; // stand plane

// The wound roll, its end rings and the cardboard core.
add("roll", alongX(RW, R, 24).translate(-RW / 2, 0, ZC).color(reverse));
for (const sx of [-1, 1]) {
  const tag = sx < 0 ? 'l' : 'r';
  const xo = sx < 0 ? -RW / 2 - 2 : RW / 2;
  [[R - 18, vinyl], [R - 48, reverse], [R - 78, vinyl], [R - 104, reverse]].forEach(([r, c], i) =>
    add(`end-ring-${tag}-${i}`, alongX(2 + i * 2, r as number, 20).translate(sx < 0 ? xo - i * 2 : xo, 0, ZC).color(c as string)));
  add(`core-${tag}`, alongX(30, 50, 16).translate(sx < 0 ? -RW / 2 - 30 : RW / 2, 0, ZC).color(CORE));
}

// Axle with locking collars and A-frame end stands.
add("axle", alongX(2 * SX + 120, 22, 12).translate(-SX - 60, 0, ZC).color(reverse));
const aFrame: [number, number][] = [[-340, 20], [340, 20], [340, 70], [55, ZC + 70], [-55, ZC + 70], [-340, 70]];
const hole: [number, number][] = [[-200, 110], [200, 110], [0, ZC - 120]];
for (const sx of [-1, 1]) {
  const tag = sx < 0 ? 'l' : 'r';
  add(`stand-${tag}`, profileYZ(aFrame, 40).subtract(profileYZ(hole, 60)).translate(sx * SX, 0, 0).color(steel));
  add(`collar-${tag}`, alongX(30, 40, 12).translate(sx * (SX + 35) - 15, 0, ZC).color(steel));
  add(`axle-knob-${tag}`, sphere(32).translate(sx * (SX + 60), 0, ZC).color(RUBBER));
  for (const y of [-310, 310]) add(`foot-${tag}-${y < 0 ? 'f' : 'b'}`, blk(sx * SX, y, 0, 70, 80, 20).color(RUBBER));
}
add("tie-rail", blk(0, 290, 70, 2 * SX, 40, 50).color(steel));

// Loose sheet: off the bottom of the roll, down to the deck and laid flat.
const ZB = ZC - R;
const sheet: [number, number][] = [[30, ZB + 1], [-620, 4], [-1900, 4], [-1900, 0], [-622, 0], [30, ZB - 3]];
add("sheet", profileYZ(sheet, RW - 20).color(vinyl));
add("seam-tape", blk(-RW / 2 + 30, -1260, 4, 60, 1280, 2).color(tape));
add("edge-tape", blk(0, -1870, 4, RW - 20, 60, 2).color(tape));
for (const x of [-200, 260]) {
  add(`spike-${x}-a`, blk(x, -1300, 4, 120, 22, 2).color(tape));
  add(`spike-${x}-b`, blk(x, -1300, 4, 22, 120, 2).color(tape));
}
add("tape-roll", torus(48, 20, 16).translate(400, -1000, 24).color(tape));

return p.model();
