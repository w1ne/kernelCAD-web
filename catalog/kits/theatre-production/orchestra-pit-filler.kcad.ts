// SPDX-License-Identifier: CC0-1.0
// Orchestra pit filler: one removable pit-filler platform, the section a
// crew lifts in to cover the orchestra pit and extend the stage forward.
// What makes it a pit filler rather than a table: a black hardboard walking
// surface over a ply deck in a welded steel frame, a white downstage edge
// marking line and a rubber nosing on the audience edge, flush lifting-ring
// pockets so it can be craned in, location spigots on the upstage edge that
// key into the stage lip, and four telescopic square legs with pin-lock
// collars and X-braces between them standing on adjustable foot plates.
// Generic visualization geometry at about real size (2.0 x 1.0 m, 0.9 m
// tall), millimetres, Z up, audience edge toward -Y, feet on z = 0.

meta({
  name: "orchestra-pit-filler",
  license: 'CC0-1.0',
  title: "Orchestra pit filler",
  description: "Removable orchestra pit-filler platform at about real size: black hardboard surface over a ply deck in a welded steel frame, white downstage edge marking and rubber nosing, four flush lifting-ring pockets, location spigots on the upstage edge, and four telescopic square legs with pin-lock collars, X-braces and adjustable foot plates. Material controls: deck surface, ply edge, steel frame, edge marking. houseShow, operaHouse and touring presets; shallow or deep pit.",
  tags: ['orchestra pit', 'pit filler', 'pit cover', 'stage extension', 'staging', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const pit = param('pit', 'shallow', { choices: ['shallow', 'deep'], label: 'Pit depth' });

const surface = param('surface', '#1e2023', { label: 'Deck surface' });
const ply = param('ply', '#c49a63', { label: 'Ply deck edge' });
const steel = param('steel', '#4a535b', { label: 'Steel frame and legs' });
const marking = param('marking', '#f1efe6', { label: 'Edge marking' });

presets({
  houseShow: { surface: '#1e2023', ply: '#c49a63', steel: '#4a535b', marking: '#f1efe6' },
  operaHouse: { surface: '#3a2a20', ply: '#a8784a', steel: '#2b2f33', marking: '#d8b45a' },
  touring: { surface: '#26282b', ply: '#b8874f', steel: '#d4a31f', marking: '#e6b31e' },
});

const RUBBER = '#18191b';

const p = assembly("orchestra-pit-filler");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);

const L = 2000;
const W = 1000;
const ZT = pit.value === 'deep' ? 1400 : 900; // walking surface
const FH = 100;
const ZF = ZT - 6 - 22 - FH; // frame underside

// Deck: hardboard over ply in a steel perimeter frame.
add("surface", blk(0, 0, ZT - 6, L - 20, W - 20, 6).color(surface));
add("ply-deck", blk(0, 0, ZT - 28, L - 20, W - 20, 22).color(ply));
for (const [s, y] of [["front", -W / 2 + 25], ["back", W / 2 - 25]] as [string, number][])
  add(`frame-${s}`, blk(0, y, ZF, L, 50, FH).color(steel));
for (const [s, x] of [["left", -L / 2 + 25], ["right", L / 2 - 25]] as [string, number][])
  add(`frame-${s}`, blk(x, 0, ZF, 50, W - 100, FH).color(steel));
for (const [i, x] of [-L / 6, L / 6].entries())
  add(`frame-joist-${i}`, blk(x, 0, ZF + 20, 40, W - 100, FH - 20).color(steel));

// Audience edge: rubber nosing and a white marking line.
add("nosing", blk(0, -W / 2 - 8, ZF + 30, L, 16, ZT - ZF - 30).color(RUBBER));
add("edge-line", blk(0, -W / 2 + 40, ZT, L - 40, 50, 2).color(marking));

// Flush lifting-ring pockets.
for (const [i, [x, y]] of [[-L / 2 + 180, -W / 2 + 180], [L / 2 - 180, -W / 2 + 180], [-L / 2 + 180, W / 2 - 180], [L / 2 - 180, W / 2 - 180]].entries()) {
  add(`lift-pocket-${i}`, cylinder(2, 55, 16).translate(x, y, ZT).color(steel));
  add(`lift-ring-${i}`, torus(34, 6, 16).translate(x, y, ZT + 4).color(marking));
}

// Location spigots on the upstage edge.
for (const [i, x] of [-L / 3, L / 3].entries()) {
  add(`spigot-plate-${i}`, blk(x, W / 2 + 40, ZT - 40, 120, 80, 12).color(steel));
  add(`spigot-${i}`, cylinder(70, 16, 12).translate(x, W / 2 + 50, ZT - 110).color(steel));
}

// Telescopic legs with pin-lock collars, X-braces and foot plates.
const LX = L / 2 - 120;
const LY = W / 2 - 120;
const OUTER = ZF - 260;
for (const [id, x, y] of [["lf", -LX, -LY], ["rf", LX, -LY], ["lb", -LX, LY], ["rb", LX, LY]] as [string, number, number][]) {
  add(`leg-outer-${id}`, blk(x, y, 260, 70, 70, OUTER).color(steel));
  add(`leg-inner-${id}`, blk(x, y, 60, 54, 54, 220).color(steel));
  add(`leg-collar-${id}`, blk(x, y, 250, 86, 86, 50).color(steel));
  add(`leg-pin-${id}`, cylinder(110, 8, 8).rotateY(90).translate(x - 55, y, 275).color(marking));
  add(`foot-screw-${id}`, cylinder(50, 14, 10).translate(x, y, 14).color(steel));
  add(`foot-plate-${id}`, cylinder(14, 60, 16).translate(x, y, 0).color(RUBBER));
}
const ZLO = 320;
const ZHI = ZF - 40;
const span = 2 * LX;
const len = Math.hypot(span, ZHI - ZLO);
const ang = (Math.atan2(ZHI - ZLO, span) * 180) / Math.PI;
for (const [s, y] of [["front", -LY - 40], ["back", LY + 40]] as [string, number][])
  for (const sx of [-1, 1])
    add(`brace-${s}-${sx < 0 ? 'a' : 'b'}`, box(len, 8, 40, true).rotateY(sx * ang).translate(0, y, (ZLO + ZHI) / 2).color(steel));
const sLen = Math.hypot(2 * LY, ZHI - ZLO);
const sAng = (Math.atan2(ZHI - ZLO, 2 * LY) * 180) / Math.PI;
for (const [s, x] of [["left", -LX - 40], ["right", LX + 40]] as [string, number][])
  add(`brace-${s}`, box(8, sLen, 40, true).rotateX(s === 'left' ? sAng : -sAng).translate(x, 0, (ZLO + ZHI) / 2).color(steel));

return p.model();
