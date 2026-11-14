// SPDX-License-Identifier: CC0-1.0
// Bag opener: the slow single-drum machine at the head of a MRF line that
// slits household refuse sacks without shredding what is inside. What makes
// it that machine rather than a shredder: a wide flared feed hopper, one
// horizontal toothed drum turning against a comb of fixed knives, a
// gearmotor on the drum end behind a belt guard, an inspection hatch, a
// rubber dust curtain over the outlet, and a discharge conveyor carrying
// burst bags and spilled recyclables out the bottom.
// Generic visualization geometry at about real size (2.4 m wide, 3.3 m
// long, 3.2 m high), millimetres, Z up, discharge toward -Y.

meta({
  name: "bag-opener",
  license: 'CC0-1.0',
  title: "Bag opener",
  description: "Single-drum bag opener at about real size: wide flared feed hopper, rubber dust curtain over the discharge, one horizontal toothed drum against a fixed knife comb, gearmotor and belt guard on the drum end, inspection hatch, discharge conveyor carrying burst sacks and spilled recyclables. Material controls: body paint, drum and knives, conveyor rubber and guards. plant, weathered, stainless and highVisibility presets; optional load of bags.",
  tags: ["recycling", "bag opener", "bag splitter", "sack opener", "debagger", "drum", "materials recovery", "waste management", "front end", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const body = param('body', '#2f7a4d', { label: 'Body and hopper (paint)' });
const drum = param('drum', '#a9b2b6', { label: 'Drum, teeth and knives' });
const rubber = param('rubber', '#26292b', { label: 'Conveyor belt and curtain' });
const guard = param('guard', '#f0b429', { label: 'Guards and safety trim' });
const load = param('load', 'bags', { choices: ['bags', 'empty'], label: 'Load' });

presets({
  plant: { body: '#2f7a4d', drum: '#a9b2b6', rubber: '#26292b', guard: '#f0b429' },
  weathered: { body: '#4f5f4f', drum: '#8a857c', rubber: '#353735', guard: '#a8893f' },
  stainless: { body: '#c6cbcd', drum: '#8e979b', rubber: '#26292b', guard: '#2f5d9a' },
  highVisibility: { body: '#d9692a', drum: '#b9c0c3', rubber: '#26292b', guard: '#f2d21b' },
});

const p = assembly("bag-opener");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const W = 1800, ZD = 1500; // housing width, drum axis height

// Base frame and housing round the drum.
for (const s of [-1, 1]) add(`base-rail-${s}`, blk(s * 1000, 300, 0, 160, 2000, 160).color(body));
for (const [x, y] of [[-1000, -500], [1000, -500], [-1000, 1100], [1000, 1100]]) add(`leg-${x}-${y}`, blk(x, y, 160, 160, 160, 900).color(body));
add("housing", blk(0, 300, 1000, W + 200, 1600, 1100).subtract(blk(0, 300, 990, W, 1440, 1200)).color(body));
for (const y of [-300, 300, 900]) for (const s of [-1, 1]) add(`housing-rib-${y}-${s}`, blk(s * (W / 2 + 115), y, 1000, 30, 60, 1100).color(body));
add("inspection-hatch", blk(-W / 2 - 108, 300, 1250, 16, 700, 600).color('#24603c'));
for (const z of [1300, 1750]) add(`hatch-hinge-${z}`, blk(-W / 2 - 118, -60, z, 20, 40, 80).color(guard));
add("hatch-handle", blk(-W / 2 - 122, 600, 1500, 12, 40, 160).color(guard));

// Flared feed hopper above the housing.
add("hopper", profileYZ([[-500, 2100], [1100, 2100], [1700, 3200], [-1100, 3200]], W + 600)
  .subtract(profileYZ([[-440, 2090], [1040, 2090], [1620, 3220], [-1020, 3220]], W + 480)).color(body));
add("hopper-lip", blk(0, -1100, 3150, W + 640, 80, 80).color(guard));
for (let k = 0; k < 7; k++) add(`curtain-${k}`, blk(-W / 2 + 130 + k * 257, -520, 760, 230, 20, 240).color(rubber));

// Toothed drum seen through the open top, knife comb below it.
add("drum", cylinder(W - 40, 420, 18).rotateY(90).translate(-(W - 40) / 2, 300, ZD + 300).color(drum));
for (let i = 0; i < 6; i++) {
  for (let j = 0; j < 4; j++) {
    const a = (j * 90 + i * 37) * Math.PI / 180;
    const x = -W / 2 + 180 + i * 290;
    add(`tooth-${i}-${j}`, blk(0, 0, 400, 60, 80, 160).rotateX((a * 180) / Math.PI).translate(x, 300, ZD + 300).color(drum));
  }
}
add("knife-comb", blk(0, -150, ZD - 120, W, 120, 100).color(drum));
for (let i = 0; i < 9; i++) add(`knife-${i}`, profileYZ([[-200, ZD - 20], [-120, ZD - 20], [-60, ZD + 160]], 30).translate(-W / 2 + 120 + i * 195, 0, 0).color(drum));

// Drive: gearmotor on the +X drum end behind a belt guard.
add("bearing-block", blk(W / 2 + 160, 300, ZD + 150, 220, 300, 300).color(drum));
add("belt-guard", profileYZ([[50, ZD + 550], [550, ZD + 550], [1050, 700], [1050, 250], [550, 250], [50, ZD + 50]], 140).translate(W / 2 + 330, 0, 0).color(guard));
add("gearbox", blk(W / 2 + 420, 800, 300, 340, 380, 380).color(body));
add("drive-motor", cylinder(560, 190, 14).rotateY(90).translate(W / 2 + 250, 800, 490).color('#3d4448'));
add("motor-fan-cover", cylinder(80, 200, 14).rotateY(90).translate(W / 2 + 810, 800, 490).color('#3d4448'));
add("control-box", blk(-W / 2 - 230, 1000, 900, 140, 500, 700).color('#d8dad6'));
add("e-stop", cylinder(60, 50, 10).rotateY(-90).translate(-W / 2 - 300, 1000, 1400).color('#c8202a'));

// Discharge conveyor out the bottom toward -Y.
add("discharge-frame", profileYZ([[1100, 650], [-2200, 650], [-2200, 520], [1100, 520]], W - 100).color(body));
add("discharge-belt", profileYZ([[1100, 680], [-2200, 680], [-2200, 650], [1100, 650]], W - 260).color(rubber));
add("head-drum", cylinder(W - 200, 90, 12).rotateY(90).translate(-(W - 200) / 2, -2200, 600).color(drum));
for (const s of [-1, 1]) add(`skirt-${s}`, blk(s * (W / 2 - 110), -800, 680, 30, 2400, 220).color(guard));
for (const s of [-1, 1]) add(`discharge-leg-${s}`, blk(s * 750, -1950, 0, 90, 90, 520).color(body));

// Load: torn sacks and spilled recyclables on the discharge belt.
if (load.value === 'bags') {
  const bags: [number, number, number, string][] = [[-400, 1600, 3000, '#1d1f22'], [350, 1900, 3010, '#2b5aa8'], [-150, 2350, 3050, '#1d1f22']];
  for (const [x, y, z, c] of bags) add(`bag-${x}-${y}`, sphere(330).translate(x, y - 1700, z - 650).color(c));
  const spill: [number, number, string][] = [[-450, -900, '#2b5aa8'], [200, -1300, '#e8e3d4'], [-100, -1700, '#c9a46a'], [500, -600, '#3a8f4a'], [-500, -1500, '#d23a2a']];
  spill.forEach(([x, y, c], i) => add(`spill-${i}`, blk(0, 0, 680, 220, 160, 90 + (i % 2) * 60).rotateZ(i * 23).translate(x, y, 0).color(c)));
  add("torn-sack", profileYZ([[-200, 680], [300, 680], [150, 830], [-100, 860]], 500).translate(-200, -400, 0).color('#1d1f22'));
}

return p.model();
