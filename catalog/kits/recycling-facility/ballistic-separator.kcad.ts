// SPDX-License-Identifier: CC0-1.0
// Ballistic separator: the MRF machine that splits mixed waste into flat
// (paper, film), rolling (bottles, cans) and fine fractions. What makes it
// that machine rather than a screen: an inclined deck of side-by-side
// perforated paddles driven by two crankshafts so neighbouring paddles sit
// at different heights mid-stroke, a feed chute dropping onto the middle of
// the slope, flats walking up and off the high end, bottles and cans
// rolling back down off the low end, and a fines hopper catching what falls
// through the punched holes; side walls, crank discs, a drive motor and a
// walkway rail.
// Generic visualization geometry at about real size (2.6 m wide, 6.5 m
// long, 3.9 m high), millimetres, Z up, rolling-fraction end toward -Y.

meta({
  name: "ballistic-separator",
  license: 'CC0-1.0',
  title: "Ballistic separator",
  description: "Ballistic separator at about real size: inclined deck of perforated paddles stepped by two crankshafts, side walls, feed chute onto the mid slope, flats chute off the high end, rolling-fraction chute off the low end, fines hopper underneath, crank discs, drive motor and walkway rail. Material controls: frame paint, paddle deck, chutes and drive trim. plant, weathered, stainless and highVisibility presets; optional mixed load on the deck.",
  tags: ["recycling", "ballistic separator", "paddle screen", "2D 3D separator", "flats", "rollers", "fines", "sorting", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#5a6f86', { label: 'Frame and side walls (paint)' });
const deck = param('deck', '#b3bbbf', { label: 'Perforated paddle deck' });
const chutes = param('chutes', '#3d4a52', { label: 'Chutes and fines hopper' });
const drive = param('drive', '#f0b429', { label: 'Cranks, guards and rail' });
const load = param('load', 'mixed', { choices: ['mixed', 'empty'], label: 'Load' });

presets({
  plant: { frame: '#5a6f86', deck: '#b3bbbf', chutes: '#3d4a52', drive: '#f0b429' },
  weathered: { frame: '#5d625e', deck: '#8f8a80', chutes: '#45403a', drive: '#a8893f' },
  stainless: { frame: '#c4c9cb', deck: '#dde1e2', chutes: '#7b858a', drive: '#2f5d9a' },
  highVisibility: { frame: '#2a7f4f', deck: '#c4cacc', chutes: '#2f3438', drive: '#f2d21b' },
});

const p = assembly("ballistic-separator");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const TILT = 18, ZC = 1900, L = 5200, W = 2200; // deck slope, centre height, length, width
const onDeck = (s: Shape) => s.rotateX(TILT).translate(0, 0, ZC);

// Paddles: perforated plates along the slope, alternately raised by the cranks.
const N = 8, PW = W / N;
for (let k = 0; k < N; k++) {
  const x = -W / 2 + PW / 2 + k * PW;
  const lift = k % 2 === 0 ? 70 : -70;
  let paddle = blk(x, 0, lift, PW - 30, L, 30);
  for (const y of [-1500, -500, 500, 1500]) paddle = paddle.subtract(blk(x, y, lift - 10, PW * 0.45, 360, 50));
  add(`paddle-${k}`, onDeck(paddle).color(deck));
  add(`paddle-rib-${k}`, onDeck(blk(x, 0, lift - 140, 20, L - 200, 140)).color(deck));
}

// Side walls following the slope, and the support frame.
for (const s of [-1, 1]) {
  add(`side-wall-${s}`, onDeck(blk(s * (W / 2 + 30), 0, -250, 40, L + 200, 800)).color(frame));
  add(`wall-cap-${s}`, onDeck(blk(s * (W / 2 + 30), 0, 550, 90, L + 200, 50)).color(frame));
}
const legs: [number, number][] = [[-2200, 1150], [0, 1650], [2200, 2350]];
for (const [y, h] of legs) for (const s of [-1, 1]) add(`leg-${y}-${s}`, blk(s * (W / 2 + 120), y, 0, 160, 160, h).color(frame));
for (const s of [-1, 1]) add(`base-rail-${s}`, blk(s * (W / 2 + 120), 0, 0, 160, 4800, 140).color(frame));

// Two crankshafts under the deck with eccentric discs on the -X end.
for (const y of [-1300, 1300]) {
  const z = ZC + y * Math.tan((TILT * Math.PI) / 180) - 380;
  add(`crankshaft-${y}`, cylinder(W + 500, 70, 10).rotateY(90).translate(-(W + 500) / 2, y, z).color(drive));
  add(`crank-disc-${y}`, cylinder(60, 300, 16).rotateY(-90).translate(-W / 2 - 160, y, z).color(drive));
  add(`crank-pin-${y}`, cylinder(90, 60, 8).rotateY(-90).translate(-W / 2 - 220, y + 150, z + 150).color(chutes));
  add(`bearing-${y}`, blk(W / 2 + 200, y, z - 160, 180, 260, 320).color(frame));
}
add("drive-motor", cylinder(600, 220, 14).rotateY(90).translate(W / 2 + 300, -300, 600).color(frame));
add("motor-base", blk(W / 2 + 600, -300, 0, 700, 600, 380).color(frame));
add("belt-guard", profileYZ([[-50, 400], [-550, 400], [-1500, 900], [-1500, 1300], [-1100, 1300], [-50, 850]], 120).translate(W / 2 + 320, 0, 0).color(drive));

// Feed chute onto the middle of the slope.
add("feed-chute", profileYZ([[-900, 3500], [700, 3500], [300, 2700], [-500, 2550]], W - 300)
  .subtract(profileYZ([[-830, 3520], [630, 3520], [250, 2680], [-450, 2530]], W - 400)).color(chutes));
for (const s of [-1, 1]) add(`chute-hanger-${s}`, blk(s * (W / 2 - 100), -100, 3100, 60, 60, 700).color(frame));
add("chute-beam", blk(0, -100, 3800, W + 400, 120, 120).color(frame));
for (const s of [-1, 1]) add(`chute-post-${s}`, blk(s * (W / 2 + 200), -100, 0, 120, 120, 3800).color(frame));

// Flats chute off the high end, rolling-fraction chute off the low end.
const yHi = (L / 2) * Math.cos((TILT * Math.PI) / 180), zHi = ZC + (L / 2) * Math.sin((TILT * Math.PI) / 180);
const yLo = -yHi, zLo = ZC - (L / 2) * Math.sin((TILT * Math.PI) / 180);
add("flats-chute", profileYZ([[yHi - 100, zHi - 60], [yHi + 200, zHi - 60], [yHi + 700, 400], [yHi + 400, 400]], W).color(chutes));
add("rollers-chute", profileYZ([[yLo + 100, zLo - 60], [yLo - 200, zLo - 60], [yLo - 800, 350], [yLo - 500, 350]], W).color(chutes));
add("fines-hopper", profileYZ([[-1900, 1150], [1900, 1250], [600, 450], [-600, 450]], W - 100).color(chutes));
add("fines-outlet", blk(0, 0, 150, 700, 700, 300).color(chutes));

// Walkway rail along the -X side.
for (const y of [-2000, 0, 2000]) add(`rail-post-${y}`, blk(-W / 2 - 500, y, 0, 50, 50, 1100).color(drive));
add("rail-top", blk(-W / 2 - 500, 0, 1100, 50, 4300, 50).color(drive));
add("rail-mid", blk(-W / 2 - 500, 0, 600, 40, 4300, 40).color(drive));

// Load: flats walking up, bottles rolling down.
if (load.value === 'mixed') {
  const flats: [number, number, string][] = [[-600, 900, '#e8e3d4'], [300, 1500, '#c9a46a'], [-200, 2000, '#e8e3d4'], [600, 600, '#d6d2c4']];
  flats.forEach(([x, y, c], i) => add(`flat-${i}`, onDeck(blk(0, 0, 100, 500, 380, 15).rotateZ(i * 31).translate(x, y, 0)).color(c)));
  const rollers: [number, number, string][] = [[-500, -1400, '#3a8f4a'], [200, -1900, '#2b7ac8'], [700, -1200, '#c8c8c8'], [-100, -900, '#d23a2a']];
  rollers.forEach(([x, y, c], i) => add(`roller-${i}`, onDeck(cylinder(280, 50, 10).rotateY(90).rotateZ(i * 40).translate(x, y, 160)).color(c)));
}

return p.model();
