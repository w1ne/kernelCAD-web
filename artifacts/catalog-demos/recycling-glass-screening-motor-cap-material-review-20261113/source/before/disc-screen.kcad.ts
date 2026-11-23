// SPDX-License-Identifier: CC0-1.0
// Disc screen (star screen): the MRF machine that lifts old corrugated
// cardboard off the top of the stream. A deck of parallel shafts, each
// carrying a row of star-shaped discs, slopes up toward the discharge end.
// The spinning stars walk flat, stiff cardboard up and over the top end
// while containers, paper and fines drop through the gaps onto a belt
// underneath. What makes it that machine rather than a conveyor: the
// inclined deck of staggered star discs, the chain-drive guard down one
// side, the cardboard riding on the stars and the unders belt below.
// Generic visualization geometry at about real size (6.7 m long, 2.8 m
// wide, 3.2 m high), millimetres, Z up, deck rising toward +X.

meta({
  name: "disc-screen",
  license: 'CC0-1.0',
  title: "Disc screen",
  description: "OCC disc (star) screen at about real size: inclined deck of ten shafts carrying staggered star discs, side frames on legs, chain-drive guard and gear motors down the far side, infeed chute at the low end, discharge chute dropping cardboard onto a bunker pile, unders belt below the deck carrying containers and fines away. Material controls: machine frame, star discs, cardboard, unders. plant, weathered, fibreLine and highVisibility presets.",
  tags: ["recycling", "disc screen", "star screen", "OCC screen", "cardboard separation", "screening", "materials recovery", "MRF", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 5600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#3c7a4e', { label: 'Machine frame (paint)' });
const discs = param('discs', '#2d3236', { label: 'Star discs (rubber/steel)' });
const cardboard = param('cardboard', '#b58a55', { label: 'Cardboard (OCC)' });
const unders = param('unders', '#4c8fd0', { label: 'Unders (containers, fines)' });

presets({
  plant: { frame: '#3c7a4e', discs: '#2d3236', cardboard: '#b58a55', unders: '#4c8fd0' },
  weathered: { frame: '#5b6458', discs: '#3a3b38', cardboard: '#9c8460', unders: '#7d8a8f' },
  fibreLine: { frame: '#2f6f9e', discs: '#c9d0d4', cardboard: '#c49a62', unders: '#e1ddd0' },
  highVisibility: { frame: '#e3742b', discs: '#23282c', cardboard: '#b58a55', unders: '#3fae6a' },
});

const p = assembly("disc-screen");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const dark = '#23282c';

// Deck geometry: shafts along Y, deck line rising toward +X at ANG degrees.
const ANG = 18, N = 10, PITCH = 420, W = 2000, RS = 190;
const ca = Math.cos((ANG * Math.PI) / 180), sa = Math.sin((ANG * Math.PI) / 180);
const X0 = -1900, Z0 = 1500; // first shaft axis
const at = (s: number, h: number): [number, number] => [X0 + s * ca - h * sa, Z0 + s * sa + h * ca];
const L = (N - 1) * PITCH;

// Six-point star disc in the XZ plane, thickness along Y.
const starPts: [number, number][] = [];
for (let k = 0; k < 12; k++) {
  const r = k % 2 ? RS * 0.62 : RS;
  const a = (k * Math.PI) / 6;
  starPts.push([r * Math.cos(a), r * Math.sin(a)]);
}
const star = (rot: number) => extrudePolygon(starPts, 50).rotateZ(rot).rotateX(90).translate(0, 25, 0);

const DISCS = 6;
for (let i = 0; i < N; i++) {
  const [x, z] = at(i * PITCH, 0);
  add(`shaft-${i}`, cylinder(W + 120, 45, 10).rotateX(90).translate(x, W / 2 + 60, z).color('#a9b1b5'));
  for (let d = 0; d < DISCS; d++) {
    const y = -W / 2 + 160 + d * ((W - 320) / (DISCS - 1)) + (i % 2 ? 140 : 0) - 70;
    add(`star-${i}-${d}`, star(i * 17).translate(x, y, z).color(discs));
  }
}

// Side frames following the deck slope, on legs.
const [xa, za] = at(-350, -330), [xb, zb] = at(L + 350, -330), [xc, zc] = at(L + 350, 60), [xd, zd] = at(-350, 60);
for (const s of [-1, 1]) {
  const y = s * (W / 2 + 90);
  add(`side-frame-${s < 0 ? 'f' : 'b'}`, profileXZ([[xa, za], [xb, zb], [xc, zc], [xd, zd]], 60).translate(0, y, 0).color(frame));
  for (const [i, sx] of [[0, 0], [1, L / 2], [2, L]] as [number, number][]) {
    const [lx, lz] = at(sx, -330);
    add(`leg-${s < 0 ? 'f' : 'b'}-${i}`, blk(lx, y, 0, 160, 160, lz + 40).color(frame));
    add(`foot-${s < 0 ? 'f' : 'b'}-${i}`, blk(lx, y, 0, 280, 280, 25).color(frame));
  }
}
add("brace-low", blk(X0, 0, 500, 120, W + 180, 120).color(frame));
add("brace-high", blk(at(L, 0)[0], 0, 900, 120, W + 180, 120).color(frame));

// Chain-drive guard and gear motors down the +Y side.
add("chain-guard", profileXZ([[xa, za + 60], [xb, zb + 60], [xc, zc + 60], [xd, zd + 60]], 120).translate(0, W / 2 + 210, 0).color('#f2c230'));
for (const sx of [L * 0.2, L * 0.75]) {
  const [mx, mz] = at(sx, -500);
  add(`gearbox-${Math.round(sx)}`, blk(mx, W / 2 + 420, mz - 200, 360, 300, 400).color(dark));
  add(`motor-${Math.round(sx)}`, cylinder(520, 160, 14).rotateY(90).translate(mx - 700, W / 2 + 420, mz).color(frame));
}

// Infeed chute at the low end, discharge chute at the high end.
const [ix, iz] = at(-350, 120);
add("infeed-chute", profileXZ([[ix - 900, iz + 420], [ix - 820, iz + 420], [ix + 80, iz + 20], [ix + 80, iz - 20], [ix - 40, iz - 20]], W + 240).subtract(profileXZ([[ix - 1000, iz + 500], [ix + 200, iz + 500], [ix + 200, iz + 30], [ix - 40, iz + 30]], W + 80)).color(frame));
for (const s of [-1, 1]) add(`infeed-cheek-${s < 0 ? 'f' : 'b'}`, profileXZ([[ix - 900, iz + 420], [ix + 80, iz - 20], [ix + 80, iz + 400], [ix - 900, iz + 800]], 40).translate(0, s * (W / 2 + 120), 0).color(frame));
const [ex, ez] = at(L + 350, 0);
add("discharge-chute", profileXZ([[ex - 60, ez + 40], [ex + 80, ez + 40], [ex + 700, ez - 1500], [ex + 560, ez - 1500]], W + 240).color(frame));
for (const s of [-1, 1]) add(`discharge-cheek-${s < 0 ? 'f' : 'b'}`, profileXZ([[ex - 60, ez + 40], [ex + 700, ez - 1500], [ex + 700, ez - 1000], [ex - 60, ez + 500]], 40).translate(0, s * (W / 2 + 120), 0).color(frame));

// Cardboard sheets riding up the stars, and a pile in the bunker beyond.
const sheets: [number, number, number, number][] = [[600, -400, 900, 8], [1700, 300, 1100, -12], [2600, -250, 800, 20], [3500, 200, 1000, -5]];
sheets.forEach(([s, y, w, a], i) => {
  const [x, z] = at(s, RS + 20);
  add(`occ-${i}`, box(w, w * 0.75, 30, true).rotateZ(a).rotateY(-ANG).translate(x, y, z).color(cardboard));
});
const [fx, fz] = at(L + 250, RS + 140);
add("occ-flap", box(700, 500, 25, true).rotateY(-ANG - 25).translate(fx, 0, fz).color(cardboard));
for (let i = 0; i < 6; i++) add(`occ-pile-${i}`, box(1000, 760, 40, true).rotateZ(i * 23).rotateY(i % 2 ? 12 : -9).translate(ex + 900 + (i % 2) * 200, (i % 3 - 1) * 400, 140 + i * 90).color(i % 2 ? '#a07848' : cardboard));

// Unders belt running out under the deck toward -Y, carrying containers and fines.
const XU = X0 + 1600, YU0 = W / 2, YU1 = -W / 2 - 1800, ZU = 600;
add("unders-belt", blk(XU, (YU0 + YU1) / 2, ZU, 900, YU0 - YU1, 30).color('#2b2f33'));
for (const s of [-1, 1]) add(`unders-rail-${s < 0 ? 'l' : 'r'}`, blk(XU + s * 500, (YU0 + YU1) / 2, ZU - 120, 80, YU0 - YU1, 200).color(frame));
for (const y of [YU0 - 300, YU1 + 200]) for (const s of [-1, 1]) add(`unders-leg-${Math.round(y)}-${s < 0 ? 'l' : 'r'}`, blk(XU + s * 500, y, 0, 80, 80, ZU - 120).color(frame));
add("unders-drum", cylinder(1000, 80, 12).rotateY(90).translate(XU - 500, YU1, ZU - 50).color('#a9b1b5'));
for (let i = 0; i < 9; i++) {
  const y = YU0 - 400 - i * 330;
  const x = XU - 300 + (i % 3) * 300;
  add(`under-${i}`, (i % 3 === 1 ? cylinder(230, 45, 10).rotateY(90).translate(-115, 0, 45) : box(120, 100, 40, true).translate(0, 0, 20)).rotateZ(i * 41).translate(x, y, ZU + 30).color(i % 3 === 2 ? '#d8cfb6' : unders));
}

return p.model();
