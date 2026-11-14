// SPDX-License-Identifier: CC0-1.0
// Water level float: the float switches that tell the reservoir controller
// when to top up and when to stop, shown working in a cut-away tank.
// What makes it a level float: a vertical stainless stem hung from a
// bracket clamped over the tank rim, with a terminal head and cable gland on
// top and a ring float riding the water surface between two stop collars;
// plus a side-mounted hinged float switch through the tank wall whose arm
// swings up when the water reaches it (the high-level cut-out). The tank's
// front and left walls are cut down so the water line, the floats and a
// level scale on the back wall can all be seen.
// Generic visualization geometry at about real size (tank 700 x 460 x
// 500 mm), millimetres, Z up, front -Y.

meta({
  name: "water-level-float",
  license: 'CC0-1.0',
  title: "Water level float",
  description: "Reservoir float level switches at about real size in a cut-away tank: vertical stainless stem float switch hung from a rim bracket with terminal head, cable gland and ring float riding the water surface between stop collars, plus a side-mounted hinged high-level float through the tank wall that swings up when the water reaches it, a level scale on the back wall and both cables leaving over the rim. Material controls: tank, water, float switch body and bracket, plus a water level choice (low, normal, high) that moves the floats. blackTank, blueTank, whiteFood and weathered presets.",
  tags: ['float switch', 'level switch', 'water level', 'level sensor', 'reservoir', 'top-up', 'auto fill', 'tank', 'hydroponics', 'greenhouse', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const tank = param('tank', '#2b2f33', { label: 'Tank (HDPE)' });
const water = param('water', '#6fa9c4', { label: 'Water (nutrient solution)' });
const body = param('switchBody', '#e9e6dc', { label: 'Floats and heads (polypropylene)' });
const bracket = param('bracket', '#b9c0c3', { label: 'Stem and bracket (stainless steel)' });
const level = param('level', 'normal', { choices: ['low', 'normal', 'high'], label: 'Water level' });

presets({
  blackTank: { tank: '#2b2f33', water: '#6fa9c4', switchBody: '#e9e6dc', bracket: '#b9c0c3' },
  blueTank: { tank: '#2f6fa8', water: '#8cc2d6', switchBody: '#f2f2ec', bracket: '#c9ced1' },
  whiteFood: { tank: '#ebe9e2', water: '#7fb37a', switchBody: '#e0a21c', bracket: '#9aa3a8' },
  weathered: { tank: '#4a4a44', water: '#7f9c8a', switchBody: '#c8bfa4', bracket: '#8d9290' },
});

const p = assembly("water-level-float");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 6) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};
const arc = (name: string, a: [number, number, number], b: [number, number, number], lift: number, r: number, n: number, col: string) => {
  const pt = (u: number): [number, number, number] => [
    a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u + Math.sin(Math.PI * u) * lift,
  ];
  for (let k = 0; k < n; k++) add(`${name}-${k}`, rod(pt(k / n), pt((k + 1) / n), r).color(col));
};

// Tank: floor, full-height back and right walls with a rolled rim, front
// and left walls cut down to a low lip so the inside reads.
const W = 700, D = 460, HT = 500, T = 15;
const WL = level.value === 'low' ? 170 : level.value === 'high' ? 400 : 290; // water line
add("floor", blk(0, 0, 0, W, D, 20).color(tank));
add("wall-back", blk(0, D / 2 - T / 2, 20, W, T, HT - 20).color(tank));
add("wall-right", blk(W / 2 - T / 2, 0, 20, T, D, HT - 20).color(tank));
add("lip-front", blk(0, -D / 2 + T / 2, 20, W, T, 100).color(tank));
add("lip-left", blk(-W / 2 + T / 2, 0, 20, T, D, 100).color(tank));
add("rim-back", blk(0, D / 2 - 4, HT, W + 10, 26, 14).color(tank));
add("rim-right", blk(W / 2 - 4, 0, HT, 26, D + 10, 14).color(tank));
for (const x of [-200, 0, 200]) add(`rib-${x}`, blk(x, D / 2 + 6, 60, 30, 12, HT - 80).color(tank));
add("water", blk(-T / 2, -T / 2, 20, W - 2 * T, D - 2 * T, WL - 20).color(water));
add("water-shine", blk(-80, -40, WL, 160, 40, 1).color('#d8ecf0'));

// Level scale on the inside of the back wall: ticks every 50 mm, longer
// every 100, low / high marks in colour.
const yS = D / 2 - T - 1;
add("scale-strip", blk(-260, yS, 60, 50, 2, 420).color('#f2f2ec'));
for (let z = 100; z <= 450; z += 50) add(`scale-tick-${z}`, blk(-268 + (z % 100 === 0 ? 0 : 8), yS - 1.5, z, z % 100 === 0 ? 30 : 14, 1, 3).color('#22262a'));
add("mark-low", blk(-240, yS - 1.5, 168, 10, 1, 10).color('#c0392b'));
add("mark-high", blk(-240, yS - 1.5, 398, 10, 1, 10).color('#e3b52c'));

// Vertical stem float switch, hung from a bracket over the back rim.
const SX = -90, SY = D / 2 - 70;
add("bracket-top", blk(SX, D / 2 - 30, HT + 14, 110, 100, 8).color(bracket));
add("bracket-lip", blk(SX, D / 2 + 22, HT - 50, 110, 8, 72).color(bracket));
add("bracket-screw", cylinder(30, 7, 10).rotateX(-90).translate(SX, D / 2 + 26, HT - 20).color('#5a6066'));
add("stem", cylZ(SX, SY, 70, HT + 22 - 70, 6, 10).color(bracket));
add("stem-nut", cylZ(SX, SY, HT + 22, 14, 20, 6).color(bracket));
add("head", cylZ(SX, SY, HT + 36, 50, 30, 16).color(body));
add("head-lid", cylZ(SX, SY, HT + 86, 10, 33, 16).color(body));
add("head-gland", cylX(SX + 28, SY, HT + 60, 22, 9, 10).color('#3b3f42'));
add("stop-collar-low", cylZ(SX, SY, 110, 14, 13, 10).color(bracket));
add("stop-collar-high", cylZ(SX, SY, 430, 14, 13, 10).color(bracket));
add("stem-end", cylZ(SX, SY, 60, 12, 10, 10).color(bracket));
// Ring float rides the surface, about half submerged.
add("float", cylZ(SX, SY, WL - 26, 52, 30, 18).subtract(cylZ(SX, SY, WL - 30, 60, 8, 10)).color(body));
add("float-band", cylZ(SX, SY, WL + 14, 6, 31, 18).color('#e8862b'));
arc("stem-cable", [SX + 50, SY, HT + 60], [SX + 200, D / 2 + 60, 30], 80, 4, 6, '#1e2124');

// Side-mounted hinged float through the right wall: the arm hangs down
// below the water line and swings up once the water reaches the hinge.
const HZ = 350, HX = W / 2 - T;
add("side-boss-out", cylX(HX + T, -60, HZ, 22, 22, 6).color(body));
add("side-boss-in", cylX(HX - 30, -60, HZ, 30, 20, 14).color(body));
const up = WL > HZ;
const arm = (s: Shape) => s.rotateY(up ? -60 : -125).translate(HX - 30, -60, HZ);
add("side-hinge", cylinder(30, 8, 10).rotateX(90).translate(HX - 34, -45, HZ).color('#3b3f42'));
add("side-arm", arm(cylZ(0, 0, 0, 80, 6, 10)).color(body));
add("side-float", arm(cylZ(0, 0, 70, 60, 17, 14)).color(body));
add("side-float-cap", arm(cylZ(0, 0, 128, 6, 18, 14)).color('#e8862b'));
arc("side-cable", [HX + T + 22, -60, HZ], [HX + 120, -100, 30], -20, 4, 4, '#1e2124');

return p.model();
