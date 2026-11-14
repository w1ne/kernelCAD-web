// SPDX-License-Identifier: CC0-1.0
// Trommel residue bin: the self-dumping forklift hopper parked under a
// trommel's oversize discharge to catch the residue that will not pass
// the screen (film, wood, textiles, stones). What makes it a self-dumping
// hopper rather than a skip: a steel body whose side profile has a
// vertical back, a rounded belly and a long sloped front, sitting on a
// rocker base with curved cradles so it tips forward when the latch lever
// is pulled, square fork pockets under the base, side lifting lugs, a
// release cord, and a lumpy mixed residue heap filling it.
// Generic visualization geometry at about real size (1.4 m wide, 1.6 m
// deep, 1.25 m high), millimetres, Z up, sloped front toward -Y.

meta({
  name: "trommel-residue-bin",
  license: 'CC0-1.0',
  title: "Trommel residue bin",
  description: "Self-dumping forklift hopper for trommel oversize at about real size: steel body with vertical back, rounded belly and sloped front on a rocker base with curved cradles, fork pockets, latch lever with release cord, lifting lugs, rolled top rim and a lumpy residue heap of film, wood and stones. Material controls: hopper (painted steel), base frame, residue and latch. plant, weathered, galvanised and highVisibility presets.",
  tags: ["recycling", "trommel", "residue", "self-dumping hopper", "tipping skip", "forklift", "containers", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const hopper = param('hopper', '#e0b020', { label: 'Hopper (painted steel)' });
const frame = param('frame', '#3b3f42', { label: 'Base frame (steel)' });
const residue = param('residue', '#6b5a45', { label: 'Residue heap' });
const latch = param('latch', '#d4402a', { label: 'Latch and lever' });

presets({
  plant: { hopper: '#e0b020', frame: '#3b3f42', residue: '#6b5a45', latch: '#d4402a' },
  weathered: { hopper: '#9a8240', frame: '#4a4540', residue: '#5a4a3a', latch: '#8a4a36' },
  galvanised: { hopper: '#a8b0b0', frame: '#6a7276', residue: '#6b5a45', latch: '#f0b429' },
  highVisibility: { hopper: '#2f5d9a', frame: '#24282b', residue: '#7a6a52', latch: '#f0b429' },
});

const p = assembly("trommel-residue-bin");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// (y, z) side profile extruded along X, centred on x = 0.
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const W = 1400, T = 8, ZR = 1250;

// Body profile: vertical back, rounded belly, long sloped front lip.
const outer = [[560, ZR], [560, 520], [520, 380], [420, 290], [260, 240], [80, 240], [-80, 270], [-1000, ZR]];
const inner = [[560 - T, ZR + 40], [560 - T, 520], [512, 386], [414, 299], [258, 249], [82, 249], [-74, 279], [-1000 + 12, ZR + 40]];
add("body", profileYZ(outer, W).subtract(profileYZ(inner, W - 2 * T)).color(hopper));
add("rim-back", blk(0, 575, ZR - 50, W + 20, 30, 50).color(hopper));
for (const s of [-1, 1]) {
  add(`rim-side-${s}`, profileYZ([[575, ZR - 50], [575, ZR], [-1000, ZR], [-1000, ZR - 50]], 20).translate(s * (W / 2 + 10), 0, 0).color(hopper));
  add(`lug-${s}`, blk(s * (W / 2 + 25), 380, ZR - 260, 30, 120, 160).subtract(blk(s * (W / 2 + 25), 380, ZR - 220, 60, 60, 60)).color(frame));
  add(`side-stiffener-${s}`, profileYZ([[300, 260], [380, 270], [-520, 820], [-600, 820]], 20).translate(s * (W / 2 + 10), 0, 0).color(hopper));
}

// Rocker base: curved cradles on each side, cross members and fork pockets.
const cradle = [[520, 160], [520, 400], [440, 300], [300, 250], [100, 250], [-60, 280], [-160, 340], [-160, 160]];
for (const s of [-1, 1]) add(`cradle-${s}`, profileYZ(cradle, 30).translate(s * (W / 2 - 120), 0, 0).color(frame));
for (const y of [-80, 420]) add(`cross-${y}`, blk(0, y, 160, W - 100, 80, 60).color(frame));
for (const s of [-1, 1]) {
  const x = s * 360;
  add(`fork-pocket-${s}`, blk(x, 180, 0, 220, 900, 160).subtract(blk(x, 180, 20, 170, 1000, 120)).color(frame));
}

// Latch: pivot block at the back, lever arm up the back, release cord.
add("latch-block", blk(-W / 2 + 160, 580, 300, 90, 80, 120).color(latch));
add("latch-lever", box(40, 40, 700, true).rotateX(-10).translate(-W / 2 + 160, 640, 700).color(latch));
add("lever-grip", cylinder(160, 26, 8).rotateY(90).translate(-W / 2 + 80, 700, 1030).color('#24282b'));
add("release-cord", box(10, 10, 760, true).rotateX(55).translate(-W / 2 + 160, 380, 820).color('#e8e6dc'));
add("warning-plate", blk(200, 572, 820, 360, 8, 160).color(latch));

// Residue heap: a mound above the rim with lumps of wood, film and stones.
add("heap", sphere(620).subtract(blk(0, 0, -700, 1400, 1400, 700)).translate(0, -60, ZR - 300).color(residue));
const lumps: [number, number, number, number, number, number, number, string][] = [
  [-380, -320, ZR + 120, 520, 90, 70, 30, '#a8704a'],
  [150, -180, ZR + 230, 420, 70, 60, -50, '#8a5a3c'],
  [-120, 140, ZR + 300, 360, 80, 60, 70, '#a8704a'],
];
for (const [x, y, z, l, w, h, rz, c] of lumps) add(`timber-${x}`, box(l, w, h, true).rotateY(15).rotateZ(rz).translate(x, y, z).color(c));
for (const [x, y, z, r] of [[-480, -500, ZR + 40, 110], [80, -460, ZR + 120, 90], [260, 120, ZR + 150, 100], [-300, 120, ZR + 280, 80]] as [number, number, number, number][]) {
  add(`stone-${x}`, sphere(r).translate(x, y, z).color('#8f8a80'));
}
for (const [x, y, z, rx] of [[-50, -360, ZR + 220, 30], [-560, -100, ZR + 160, -25]] as [number, number, number, number][]) {
  add(`film-${x}`, box(380, 300, 12, true).rotateX(rx).rotateZ(20).translate(x, y, z).color('#d9dcd6'));
}

return p.model();
