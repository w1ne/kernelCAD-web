// SPDX-License-Identifier: CC0-1.0
// Tipping-floor bin: the self-dumping forklift hopper used to shuttle
// picked-out material (bulky metal, film bundles, sweepings) off the tipping
// floor. What makes it that bin rather than a box: a hopper with a vertical
// back and a long sloped dump face, sitting on curved rocker plates over a
// base with fork pockets, so a forklift driver can pull the release cord and
// let the full hopper roll forward on its rockers and empty itself; a latch
// and lever at the back, a rubber bumper and a load of mixed scrap.
// Generic visualization geometry at about real size (1.6 m wide, 1.3 m
// high, 1 m3), millimetres, Z up, dump face toward -Y.

meta({
  name: "tipping-floor-bin",
  license: 'CC0-1.0',
  title: "Tipping-floor bin",
  description: "Self-dumping forklift hopper at about real size: vertical back and long sloped dump face, curved rocker plates on a base with fork pockets and skids, rear latch with a release lever and pull cord, rubber bumper, optional load of mixed scrap. Material controls: hopper paint, base and rockers, latch hardware and load. plant, weathered, stainless and highVisibility presets.",
  tags: ["recycling", "self-dumping hopper", "tipping floor", "forklift hopper", "dump hopper", "scrap", "materials recovery", "waste management", "containers", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const hopper = param('hopper', '#2a5598', { label: 'Hopper (paint)' });
const base = param('base', '#2f3438', { label: 'Base, rockers and fork pockets' });
const latch = param('latch', '#f0c419', { label: 'Latch, lever and bumper' });
const scrap = param('scrap', '#9aa3a8', { label: 'Load (mixed scrap)' });
const load = param('load', 'loaded', { choices: ['loaded', 'empty'], label: 'Load' });

presets({
  plant: { hopper: '#2a5598', base: '#2f3438', latch: '#f0c419', scrap: '#9aa3a8' },
  weathered: { hopper: '#5a6a72', base: '#4a3f36', latch: '#a88a3a', scrap: '#8a7a68' },
  stainless: { hopper: '#c4c9cb', base: '#6b7378', latch: '#2f5d9a', scrap: '#d6dadb' },
  highVisibility: { hopper: '#e0821f', base: '#2f3438', latch: '#f0c419', scrap: '#9aa3a8' },
});

const p = assembly("tipping-floor-bin");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};

const W = 1600, ZB = 330, ZT = 1300; // hopper width, floor and rim heights

// Base: skids along Y, fork pockets along X, cross plates.
for (const x of [-700, 700]) add(`skid-${x}`, blk(x, 0, 0, 120, 1300, 90).color(base));
for (const y of [-300, 300]) add(`fork-pocket-${y > 0 ? 'b' : 'f'}`, blk(0, y, 90, W, 220, 100).subtract(blk(0, y, 105, W + 20, 180, 70)).color(base));

// Curved rocker plates the hopper rolls forward on, and their stops.
const rocker: [number, number][] = [];
const RC = 1000;
for (let k = 0; k <= 8; k++) {
  const a = (-35 + (70 * k) / 8) * Math.PI / 180;
  rocker.push([RC * Math.sin(a), 190 + RC * (1 - Math.cos(a))]);
}
rocker.push([RC * Math.sin(35 * Math.PI / 180), ZB + 10], [-RC * Math.sin(35 * Math.PI / 180), ZB + 10]);
for (const x of [-560, 560]) {
  add(`rocker-${x}`, profileYZ(rocker, 40).translate(x, 0, 0).color(base));
  add(`rocker-track-${x}`, blk(x, 0, 170, 90, 1200, 20).color(base));
  add(`rocker-stop-${x}`, blk(x, -610, 190, 90, 50, 80).color(latch));
}

// Hopper: vertical back, long sloped dump face, flat floor.
const outer = [[620, ZB], [-200, ZB], [-760, ZT], [620, ZT]];
const inner = [[570, ZB + 40], [-180, ZB + 40], [-700, ZT + 40], [570, ZT + 40]];
add("hopper", profileYZ(outer, W).subtract(profileYZ(inner, W - 80)).color(hopper));
add("rim-front", blk(0, -760, ZT - 30, W + 40, 60, 60).color(hopper));
add("rim-back", blk(0, 620, ZT - 30, W + 40, 60, 60).color(hopper));
for (const s of [-1, 1]) add(`rim-side-${s}`, blk(s * (W / 2 + 10), -70, ZT - 30, 40, 1440, 60).color(hopper));
for (const x of [-400, 400]) add(`face-rib-${x}`, profileYZ([[-205, ZB + 20], [-235, ZB], [-790, ZT - 40], [-760, ZT - 30]], 60).translate(x, 0, 0).color(hopper));
add("bumper", blk(0, -790, ZT - 260, W - 300, 50, 120).color('#1f2224'));

// Rear latch, release lever and pull cord.
add("latch-plate", blk(0, 650, ZB - 20, 240, 40, 300).color(latch));
add("latch-hook", blk(0, 640, 190, 120, 80, 120).color(latch));
add("release-lever", rod([0, 680, ZB + 120], [0, 760, ZT + 250], 22).color(latch));
add("lever-knob", sphere(45).translate(0, 760, ZT + 260).color(latch));
add("pull-cord", rod([0, 760, ZT + 220], [-500, 900, 900], 8, 6).color('#d9d9d4'));
add("cord-ring", torus(50, 10, 10).rotateX(90).translate(-520, 905, 850).color(latch));
add("capacity-plate", blk(-W / 2 - 3, 0, 800, 6, 300, 180).color('#f2f2ee'));

// Load of mixed scrap heaped above the rim.
if (load.value === 'loaded') {
  add("scrap-heap", profileYZ([[560, ZT - 80], [-640, ZT - 80], [-420, ZT + 30], [200, ZT + 90], [520, ZT + 40]], W - 120).color(scrap));
  add("scrap-sheet", blk(-250, 100, ZT + 80, 700, 500, 30).rotateZ(18).color('#7d8a92'));
  add("scrap-pipe", cylinder(900, 55, 10).rotateY(90).rotateZ(-25).translate(-300, -150, ZT + 110).color('#b87333'));
  add("scrap-drum", cylinder(380, 160, 12).translate(450, 250, ZT + 20).color('#3a6b3a'));
  add("scrap-bundle", blk(-150, 300, ZT + 60, 420, 260, 160).rotateZ(25).color('#c9b48a'));
  add("scrap-wheel", cylinder(80, 220, 14).rotateY(70).translate(-550, 350, ZT + 60).color('#2b2f33'));
  add("scrap-block", blk(300, -300, ZT + 60, 300, 260, 180).rotateZ(-12).color('#c4c9cb'));
}

return p.model();
