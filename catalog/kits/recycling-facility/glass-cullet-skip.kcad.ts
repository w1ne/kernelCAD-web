// SPDX-License-Identifier: CC0-1.0
// Glass cullet skip: the open steel skip that collects crushed bottle glass
// (cullet) sorted by colour before it goes back to a glass works. What makes
// it a skip rather than a bin: the classic tapered skip body with raked ends,
// a rolled top rim, vertical ribs pressed into the sides, chain lifting lugs
// on the end corners and trunnion pins for a skip loader, a heaped load of
// sharp cullet shards rising above the rim, and a "glass only" colour plate
// on the side.
// Generic visualization geometry at about real size (8-yard skip, 3.6 m
// across the top, 1.2 m deep), millimetres, Z up, sign side on -Y.

meta({
  name: "glass-cullet-skip",
  license: 'CC0-1.0',
  title: "Glass cullet skip",
  description: "Open steel skip of colour-sorted glass cullet at about real size: tapered body with raked ends, rolled top rim, pressed side ribs, chain lifting lugs and trunnion pins, a heaped load of broken glass shards and a glass-only colour plate. Load choice (heaped, empty). Material controls: skip paint, lugs and rim steel, cullet glass, sign plate. greenGlass, amberGlass, flintGlass and weathered presets.",
  tags: ['skip', 'glass skip', 'cullet', 'broken glass', 'bottle bank', 'glass recycling', 'containers', 'recycling', 'materials recovery', 'waste management', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const skipPaint = param('skipPaint', '#2c5c8f', { label: 'Skip body (painted steel)' });
const steel = param('steel', '#4a4e50', { label: 'Rim, lugs and pins (steel)' });
const cullet = param('cullet', '#3f8f52', { label: 'Glass cullet' });
const signage = param('signage', '#f2f1ea', { label: 'Glass-only plate' });
const load = param('load', 'heaped', { choices: ['heaped', 'empty'], label: 'Load' });

presets({
  greenGlass: { skipPaint: '#2c5c8f', steel: '#4a4e50', cullet: '#3f8f52', signage: '#f2f1ea' },
  amberGlass: { skipPaint: '#9a5a22', steel: '#4a4e50', cullet: '#a8621f', signage: '#f2f1ea' },
  flintGlass: { skipPaint: '#d9a514', steel: '#4a4e50', cullet: '#cfe0e3', signage: '#f2f1ea' },
  weathered: { skipPaint: '#6b6a4a', steel: '#5a4636', cullet: '#5b8a62', signage: '#c9c3ae' },
});

const p = assembly("glass-cullet-skip");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// Extrude an (x, z) side profile along Y, centred on y = 0.
const profileXZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);

const BOT = 1200;
const TOPL = 1800;
const H = 1200;
const W = 1700;
const Z0 = 60;

// Two steel runners the skip sits on.
for (const y of [-550, 550]) add(`runner-${y}`, blk(0, y, 0, 2 * BOT - 100, 140, Z0).color(steel));

// Tapered body with raked ends, hollowed out to 6 mm-plate walls (drawn thicker).
add("body", profileXZ([[-BOT, Z0], [BOT, Z0], [TOPL, Z0 + H], [-TOPL, Z0 + H]], W)
  .subtract(profileXZ([[-BOT + 70, Z0 + 80], [BOT - 70, Z0 + 80], [TOPL - 50, Z0 + H + 60], [-TOPL + 50, Z0 + H + 60]], W - 80)).color(skipPaint));
// Rolled top rim, a band proud of the body all round.
add("rim", profileXZ([[-TOPL - 30, Z0 + H - 90], [TOPL + 30, Z0 + H - 90], [TOPL + 40, Z0 + H + 10], [-TOPL - 40, Z0 + H + 10]], W + 60)
  .subtract(blk(0, 0, Z0 + H - 200, 2 * TOPL - 120, W - 80, 400)).color(steel));
// Pressed vertical ribs on both sides.
for (const y of [-W / 2 - 15, W / 2 + 15]) {
  for (const x of [-900, -300, 300, 900]) add(`rib-${y < 0 ? 'f' : 'b'}-${x}`, blk(x, y, Z0 + 20, 90, 30, H - 120).color(skipPaint));
  add(`floor-rail-${y < 0 ? 'f' : 'b'}`, blk(0, y, Z0, 2 * BOT, 40, 90).color(steel));
}

// Chain lugs at the four top corners and trunnion pins at mid-length.
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  const t = `${sx < 0 ? 'l' : 'r'}${sy < 0 ? 'f' : 'b'}`;
  add(`lug-${t}`, blk(sx * (TOPL - 160), sy * (W / 2 + 40), Z0 + H - 260, 160, 50, 220).color(steel));
  add(`lug-ring-${t}`, torus(55, 14, 12).rotateX(90).translate(sx * (TOPL - 160), sy * (W / 2 + 75), Z0 + H - 210).color(steel));
}
for (const sy of [-1, 1]) {
  const t = sy < 0 ? 'f' : 'b';
  add(`pin-boss-${t}`, blk(0, sy * (W / 2 + 25), Z0 + 420, 260, 50, 260).color(steel));
  add(`pin-${t}`, cylinder(160, 55, 14).rotateX(sy < 0 ? 90 : -90).translate(0, sy * (W / 2 + 40), Z0 + 550).color(steel));
  add(`pin-cap-${t}`, cylinder(30, 80, 14).rotateX(sy < 0 ? 90 : -90).translate(0, sy * (W / 2 + 190), Z0 + 550).color(steel));
}

// "Glass only" plate on the camera side, with a bottle pictogram.
const SY = -W / 2 - 34;
add("sign-plate", blk(-620, SY, Z0 + 520, 560, 6, 360).color(signage));
add("sign-band", blk(-620, SY - 4, Z0 + 790, 560, 4, 90).color(cullet));
add("sign-bottle", blk(-760, SY - 6, Z0 + 560, 90, 4, 140).color(skipPaint));
add("sign-bottle-neck", blk(-760, SY - 6, Z0 + 700, 34, 4, 70).color(skipPaint));
for (const [z, w] of [[Z0 + 690, 240], [Z0 + 640, 200], [Z0 + 590, 220]]) add(`sign-line-${z}`, blk(-540, SY - 6, z, w, 4, 22).color(steel));

// Heaped cullet: a mound profile rising above the rim, then shards on top.
if (load.value === 'heaped') {
  add("cullet-heap", profileXZ([[-TOPL + 40, Z0 + H - 40], [TOPL - 40, Z0 + H - 40], [TOPL - 300, Z0 + H + 120], [900, Z0 + H + 300], [200, Z0 + H + 420], [-500, Z0 + H + 380], [-1200, Z0 + H + 240], [-TOPL + 260, Z0 + H + 100]], W - 80).color(cullet));
  add("cullet-crest", sphere(600).scale([1.6, 1.15, 0.45]).translate(-150, 60, Z0 + H + 260).color(cullet));
  // Shards: thin plates tipped at odd angles across the heap.
  const shards = [
    [-1300, -500, 200, 35, 20], [-900, -650, 290, -40, 60], [-500, -560, 370, 25, -30], [-100, -680, 400, -20, 15],
    [300, -600, 380, 45, 70], [700, -640, 300, -30, -50], [1100, -560, 200, 30, 25], [1450, -480, 110, -45, 80],
    [-700, -200, 470, 15, 40], [100, -250, 520, 40, -60], [600, -200, 440, -35, 20], [-1100, -250, 350, -25, -40],
    [-200, 150, 520, 30, 50], [500, 250, 430, -40, -20], [-800, 300, 380, 20, 70], [1000, 200, 300, 35, -35],
  ];
  shards.forEach(([x, y, dz, ax, az], i) => {
    const big = i % 3 === 0;
    add(`shard-${i}`, box(big ? 160 : 110, 14, big ? 120 : 80, true).rotateX(ax).rotateZ(az).translate(x, y, Z0 + H + dz).color(i % 3 === 1 ? '#e8f2ec' : cullet));
  });
  // Bottle necks and bases that survived the crusher.
  for (const [x, y, dz, ang, i] of [[-400, -720, 330, 60, 0], [800, -660, 260, -50, 1], [-1000, -600, 240, 75, 2]]) {
    add(`neck-${i}`, cylinder(140, 22, 10).rotateY(ang).translate(x, y, Z0 + H + dz).color(cullet));
  }
  for (const [x, y, dz, i] of [[200, -700, 360, 0], [-1450, -420, 140, 1]]) add(`bottle-base-${i}`, cylinder(30, 70, 14).rotateX(70).translate(x, y, Z0 + H + dz).color(cullet));
}

return p.model();
