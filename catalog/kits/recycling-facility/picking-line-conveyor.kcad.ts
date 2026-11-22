// SPDX-License-Identifier: CC0-1.0
// Picking-line conveyor: the flat sort belt where workers pull recyclables
// off a moving stream by hand. What makes it a picking line rather than
// any belt: it runs flat at waist height, stainless drop chutes open beside
// the belt edge so a picker can throw an item straight down into a
// colour-coded sort bin, raised anti-fatigue picker stands sit between the
// chutes, and a red emergency pull-cord runs the full length within reach.
// Mixed waste drops on at the tail from a feed chute and rides toward the
// head drive.
// Generic visualization geometry at about real size (7.6 m long, 2.7 m wide,
// belt top 0.9 m), millimetres, Z up, belt runs toward +Y.

meta({
  name: "picking-line-conveyor",
  license: 'CC0-1.0',
  title: "Picking-line conveyor",
  description: "Hand-sort picking-line conveyor at about real size: flat waist-height belt between stringers, stainless drop chutes beside the belt edge feeding colour-coded sort bins, raised picker stands, emergency pull-cord, tail feed chute and head drive. Material controls: frame paint, belt rubber, chute steel, safety trim; mixed recyclables, paper or empty belt. plant, weathered, stainless and highVisibility presets.",
  tags: ["recycling", "picking line", "sort line", "hand sorting", "belt conveyor", "drop chute", "sort bin", "pull cord", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#3a78a8', { label: 'Frame and stands (paint)' });
const belt = param('belt', '#2b2f31', { label: 'Belt rubber' });
const chute = param('chute', '#b9c1c4', { label: 'Drop chutes and skirts (steel)' });
const safety = param('safety', '#f0b429', { label: 'Safety trim and stand edges' });
const load = param('load', 'mixed', { choices: ['mixed', 'paper', 'empty'], label: 'Material on belt' });

presets({
  plant: { frame: '#3a78a8', belt: '#2b2f31', chute: '#b9c1c4', safety: '#f0b429' },
  weathered: { frame: '#566673', belt: '#3a3836', chute: '#8e9290', safety: '#a8893f' },
  stainless: { frame: '#c6cbcd', belt: '#30363a', chute: '#e0e4e5', safety: '#2f5d9a' },
  highVisibility: { frame: '#3d7a4a', belt: '#1f2224', chute: '#c9ced1', safety: '#f2d21b' },
});

const p = assembly("picking-line-conveyor");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// (y, z) side profile extruded along X, centred on x = 0.
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
// Shaft or roller along X from x0, axis at (y, z).
const alongX = (x0: number, len: number, r: number, y: number, z: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x0, y, z);
// Rectangle outline centred on (0, 0), for lofted funnels.
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const funnel = (wTop: number, wBot: number, zBot: number, zTop: number) => rect(wBot, wBot).loft([rect(wTop, wTop)], {
  planes: [zBot, zTop].map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
  ruled: true,
});

const L = 7000, W = 1200, ZB = 900, FX = 660, RP = 160;

// Belt: flat carrying run, wrapped head and tail pulleys, return run below.
add("belt-top", blk(0, L / 2, ZB - 20, W, L, 20).color(belt));
add("belt-return", blk(0, L / 2, ZB - 2 * RP - 20, W, L, 20).color(belt));
for (const y of [0, L]) {
  add(`pulley-${y}`, alongX(-W / 2, W, RP, y, ZB - RP, 18).color(belt));
  add(`pulley-shaft-${y}`, alongX(-FX - 80, 2 * FX + 160, 40, y, ZB - RP).color(chute));
}

// Stringers, legs and cross braces.
for (const s of [-1, 1]) {
  add(`stringer-${s}`, blk(s * FX, L / 2, ZB - 260, 100, L + 200, 200).color(frame));
  for (const y of [300, 2500, 4500, 6700]) add(`leg-${s}-${y}`, blk(s * FX, y, 0, 100, 100, ZB - 260).color(frame));
}
for (const y of [300, 2500, 4500, 6700]) add(`brace-${y}`, blk(0, y, 220, 2 * FX, 80, 80).color(frame));

// Low steel skirts along both belt edges keep the stream on the belt.
for (const s of [-1, 1]) add(`skirt-${s}`, blk(s * (W / 2 + 15), L / 2, ZB - 20, 30, L - 400, 130).color(chute));

// Drop chutes beside the belt edge, each over a colour-coded sort bin.
const sortColors = ['#2f6db5', '#e2b31f', '#3d8a4f', '#c8202a', '#7a7f84', '#8a5a2b'];
let n = 0;
for (const s of [-1, 1]) {
  for (const y of [1500, 3500, 5500]) {
    const x = s * (FX + 400);
    add(`chute-${n}`, funnel(620, 380, ZB - 520, ZB + 40).translate(x, y, 0).color(chute));
    add(`chute-mouth-${n}`, blk(x, y, ZB + 40, 560, 560, 6).color('#1d2224'));
    add(`chute-lip-${n}`, blk(x - s * 300, y, ZB + 40, 20, 640, 90).color(safety));
    add(`bin-${n}`, blk(x, y, 60, 720, 720, ZB - 600).color(sortColors[n]));
    add(`bin-rim-${n}`, blk(x, y, ZB - 560, 760, 760, 40).color(sortColors[n]));
    for (const wx of [-1, 1]) add(`bin-wheel-${n}-${wx}`, alongX(x + wx * 300 - 20, 40, 60, y - 250, 60, 10).color('#1d2224'));
    add(`bin-label-${n}`, blk(x, y - 362, 400, 360, 6, 180).color('#f4f1e8'));
    n++;
  }
}

// Raised picker stands with anti-fatigue mats, between the chutes on both sides.
for (const s of [-1, 1]) {
  for (const y of [2500, 4500]) {
    const x = s * (FX + 420);
    add(`stand-${s}-${y}`, blk(x, y, 0, 700, 900, 180).color(frame));
    add(`stand-mat-${s}-${y}`, blk(x, y, 180, 640, 840, 25).color('#1d2224'));
    add(`stand-edge-${s}-${y}`, blk(x + s * 340, y, 180, 30, 900, 30).color(safety));
  }
}

// Emergency pull-cord along both sides, on brackets, with switch boxes at the ends.
for (const s of [-1, 1]) {
  add(`pull-cord-${s}`, blk(s * (FX + 120), L / 2, ZB + 180, 14, L - 600, 14).color('#d42a2a'));
  for (const y of [300, 2500, 4500, 6700]) add(`cord-post-${s}-${y}`, blk(s * (FX + 70), y, ZB - 60, 30, 30, 260).color(safety));
  add(`cord-switch-${s}`, blk(s * (FX + 120), 300, ZB + 120, 120, 160, 180).color(safety));
}

// Tail feed chute dropping onto the belt.
add("feed-chute", profileYZ([[-900, ZB + 900], [-300, ZB + 900], [500, ZB + 150], [500, ZB + 60], [-200, ZB + 60], [-900, ZB + 700]], W + 100)
  .subtract(blk(0, -150, ZB + 160, W - 100, 900, 900)).color(chute));
for (const y of [-750, -350]) for (const s of [-1, 1]) add(`feed-leg-${y}-${s}`, blk(s * FX, y, 0, 100, 100, ZB + 700).color(frame));

// Head drive: gearmotor on a bracket off the +X side.
add("drive-bracket", blk(FX + 250, L, ZB - 450, 400, 400, 40).color(frame));
add("gearbox", blk(FX + 230, L, ZB - 410, 260, 300, 260).color(frame));
add("drive-motor", alongX(FX + 360, 420, 120, L, ZB - 280, 14).color('#5a6266'));
add("drive-guard", blk(FX + 90, L, ZB - 420, 60, 420, 360).color(safety));

// The stream: flattened cardboard, bottles and cans scattered on the belt.
if (load.value !== 'empty') {
  const paper = load.value === 'paper';
  const items = paper ? ['#d9d2bf', '#c49a6c', '#e8e4da', '#b58a5a'] : ['#c49a6c', '#5c8fc4', '#e2e6e8', '#3d8a4f', '#d9d2bf', '#c8202a'];
  for (let i = 0; i < 24; i++) {
    const row = Math.floor(i / 3), col = i % 3;
    const x = -380 + col * 380 + ((row * 137) % 160) - 80;
    const y = 400 + row * 780 + ((col * 251) % 300);
    const kind = paper ? 0 : (i * 5) % 3;
    const color = items[(i * 7) % items.length];
    if (kind === 0) add(`item-${i}`, box(300, 240, 20, true).rotateZ((i * 37) % 180).translate(x, y, ZB + 10).color(color));
    else if (kind === 1) add(`item-${i}`, cylinder(260, 45, 8).rotateY(90).rotateZ((i * 53) % 180).translate(x, y, ZB + 45).color(color));
    else add(`item-${i}`, cylinder(120, 35, 8).translate(x, y, ZB).color(color));
  }
}

return p.model();
