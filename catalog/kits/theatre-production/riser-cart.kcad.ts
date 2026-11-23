// SPDX-License-Identifier: CC0-1.0
// Riser cart: a steel platform dolly carrying four 8 x 4 ft stage decks
// stood on edge, strapped in, on four swivel casters with a push handle.
// What makes it a riser cart rather than a stack of slabs: decks on edge
// with carpeted faces and aluminium frames, a low tube base with rubber
// cradle strips, upright end frames with padded rails, ratchet straps round
// the load, swivel casters with forks and plates, and a looped push handle.
// Generic visualization geometry at about real size (2.6 m long, 1.45 m
// tall), millimetres, Z up, deck face toward -Y, standing on z = 0.

meta({
  name: "riser-cart",
  license: 'CC0-1.0',
  title: "Riser cart",
  description: "Stage deck dolly at about real size: four 8 x 4 ft platform decks stood on edge with carpeted faces and aluminium frames, low steel tube base with rubber cradle strips, upright end frames with padded rails, two ratchet straps with buckles, four swivel casters with forks and top plates, and a looped push handle. Material controls: cart frame, deck carpet, deck frames, straps. houseShow, touring and choirRiser presets.",
  tags: ['riser cart', 'platform dolly', 'deck cart', 'stage deck', 'stage platform', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 2000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const frame = param('frame', '#2d3236', { label: 'Cart frame' });
const carpet = param('carpet', '#3a3d41', { label: 'Deck carpet' });
const deckFrame = param('deckFrame', '#b9c1c5', { label: 'Deck frames' });
const strap = param('strap', '#f0b323', { label: 'Ratchet straps' });

presets({
  houseShow: { frame: '#2d3236', carpet: '#3a3d41', deckFrame: '#b9c1c5', strap: '#f0b323' },
  touring: { frame: '#d8a21f', carpet: '#1c1e20', deckFrame: '#7d868b', strap: '#2a5fae' },
  choirRiser: { frame: '#5c656b', carpet: '#7a2430', deckFrame: '#d9dcda', strap: '#e8e4d8' },
});

const RUBBER = '#18191b';

const p = assembly("riser-cart");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const alongX = (len: number, r: number, n = 12) => cylinder(len, r, n).rotateY(90); // x from 0 to len
const alongY = (len: number, r: number, n = 12) => cylinder(len, r, n).rotateX(90); // y from 0 to -len

const L = 2600;
const W = 620;
const ZB = 160; // base tube underside
const ZD = 225; // deck bottom edge
const DL = 2440;
const DH = 1220;
const DT = 100;

// Base: perimeter and cross tubes, rubber cradle strips.
for (const [s, y] of [["front", -W / 2 + 25], ["back", W / 2 - 25]] as [string, number][])
  add(`base-rail-${s}`, blk(0, y, ZB, L, 50, 50).color(frame));
for (const [s, x] of [["left", -L / 2 + 25], ["mid-left", -500], ["mid-right", 500], ["right", L / 2 - 25]] as [string, number][])
  add(`base-cross-${s}`, blk(x, 0, ZB, 50, W - 100, 50).color(frame));
for (const [s, y] of [["front", -200], ["mid", 0], ["back", 200]] as [string, number][])
  add(`cradle-strip-${s}`, blk(0, y, ZB + 50, DL, 90, 15).color(RUBBER));

// Swivel casters: top plate, kingpin, fork, wheel flattened at the floor.
for (const x of [-L / 2 + 160, L / 2 - 160])
  for (const y of [-W / 2 + 90, W / 2 - 90]) {
    const id = `${x < 0 ? 'l' : 'r'}${y < 0 ? 'f' : 'b'}`;
    add(`caster-plate-${id}`, blk(x, y, ZB - 12, 130, 110, 12).color(frame));
    add(`caster-kingpin-${id}`, cylinder(20, 22, 12).translate(x, y, ZB - 32).color(deckFrame));
    for (const sy of [-1, 1]) add(`caster-fork-${id}-${sy < 0 ? 'a' : 'b'}`, blk(x + 20, y + sy * 27, 58, 70, 8, ZB - 90).color(frame));
    add(`caster-wheel-${id}`, alongY(40, 60, 16).translate(x + 20, y + 20, 58).subtract(box(200, 200, 20, true).translate(x + 20, y, -10)).color(RUBBER));
    add(`caster-hub-${id}`, alongY(48, 18, 10).translate(x + 20, y + 24, 58).color(deckFrame));
  }

// End frames: uprights, top and mid rails with pads.
const ZT = 1320;
for (const [s, x] of [["left", -L / 2 + 25], ["right", L / 2 - 25]] as [string, number][]) {
  for (const y of [-W / 2 + 25, W / 2 - 25]) add(`upright-${s}-${y < 0 ? 'f' : 'b'}`, blk(x, y, ZB + 50, 40, 40, ZT - ZB - 50).color(frame));
  add(`end-top-${s}`, blk(x, 0, ZT, 40, W, 40).color(frame));
  add(`end-mid-${s}`, blk(x, 0, 780, 40, W - 40, 40).color(frame));
  add(`end-pad-${s}`, blk(x - Math.sign(x) * 26, 0, 740, 12, W - 120, 120).color(RUBBER));
}

// Push handle off the left end: two arms and a rubber grip.
const HZ = 1080;
const HX = -L / 2 - 240;
for (const [s, y] of [["front", -W / 2 + 25], ["back", W / 2 - 25]] as [string, number][]) {
  add(`handle-arm-${s}`, alongX(260, 16).translate(HX, y, HZ).color(frame));
  add(`handle-elbow-${s}`, sphere(16).translate(HX, y, HZ).color(frame));
}
add("handle-grip", alongY(W - 50, 22).translate(HX, W / 2 - 25, HZ).color(RUBBER));

// Four decks on edge: aluminium frame, carpet on the -Y face.
for (let i = 0; i < 4; i++) {
  const y = -195 + i * 130;
  add(`deck-${i + 1}`, blk(0, y, ZD, DL, DT, DH).color(deckFrame));
  add(`deck-carpet-${i + 1}`, blk(0, y - DT / 2 - 3, ZD + 20, DL - 40, 6, DH - 40).color(carpet));
}

// Ratchet straps round the load with buckles on the front.
const yF = -195 - DT / 2 - 8;
const yB = 195 + DT / 2 + 2;
for (const [s, x] of [["left", -720], ["right", 720]] as [string, number][]) {
  add(`strap-top-${s}`, blk(x, (yF + yB) / 2 + 1, ZD + DH, 50, yB - yF + 6, 4).color(strap));
  add(`strap-front-${s}`, blk(x, yF, ZB + 50, 50, 4, ZD + DH - ZB - 50).color(strap));
  add(`strap-back-${s}`, blk(x, yB + 4, ZB + 50, 50, 4, ZD + DH - ZB - 50).color(strap));
  add(`buckle-${s}`, blk(x, yF - 14, 760, 80, 26, 130).color(deckFrame));
  add(`buckle-lever-${s}`, blk(x, yF - 32, 800, 60, 12, 70).color(RUBBER));
}

return p.model();
