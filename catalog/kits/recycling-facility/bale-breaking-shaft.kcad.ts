// SPDX-License-Identifier: CC0-1.0
// Bale breaker: the heavy twin-rotor machine that tears dewired bales of
// paper, card or plastic back into loose material for a pulper or wash
// line. What makes it that machine rather than a shredder or bag opener: a
// slat chain conveyor feeding a whole strapped bale into a deep open-top
// trough, two big horizontal rotors studded with hooked picks turning
// toward each other in the trough, heavy pedestal bearings and chain-drive
// guards on the shaft ends, a gearmotor on each rotor, a wire-cutting
// station on the infeed with a coil of removed bale wire, and a discharge
// screw taking the broken material out the side.
// Generic visualization geometry at about real size (3.2 m wide, 6.6 m
// long, 2.9 m high), millimetres, Z up, infeed toward -Y.

meta({
  name: "bale-breaking-shaft",
  license: 'CC0-1.0',
  title: "Bale breaker",
  description: "Twin-rotor bale breaker at about real size: slat chain infeed conveyor carrying a strapped bale into a deep open-top trough, two horizontal rotors with hooked picks, pedestal bearings, chain-drive guards and gearmotors on the shaft ends, wire-cutting station with a coil of removed wire, side discharge screw. Material controls: trough paint, rotors and picks, conveyor and bale, guards. plant, weathered, stainless and highVisibility presets; paper, cardboard or plastic bale.",
  tags: ["recycling", "bale breaker", "debaler", "bale opener", "rotor", "dewiring", "pulper feed", "materials recovery", "waste management", "baling", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const trough = param('trough', '#2b5598', { label: 'Trough and frame (paint)' });
const rotor = param('rotor', '#9aa3a8', { label: 'Rotors and picks' });
const conveyor = param('conveyor', '#2f3438', { label: 'Chain conveyor and screw' });
const guard = param('guard', '#f0b429', { label: 'Chain guards and safety trim' });
const bale = param('bale', 'cardboard', { choices: ['cardboard', 'paper', 'plastic'], label: 'Bale' });

presets({
  plant: { trough: '#2b5598', rotor: '#9aa3a8', conveyor: '#2f3438', guard: '#f0b429' },
  weathered: { trough: '#56636a', rotor: '#7f7a70', conveyor: '#3a3633', guard: '#a8893f' },
  stainless: { trough: '#c6cbcd', rotor: '#7b858a', conveyor: '#2f3438', guard: '#2f5d9a' },
  highVisibility: { trough: '#d9692a', rotor: '#b9c0c3', conveyor: '#2f3438', guard: '#f2d21b' },
});

const p = assembly("bale-breaking-shaft");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const W = 2000, ZR = 2100; // trough width, rotor axis height
const baleColor = bale.value === 'paper' ? '#e2ddcf' : bale.value === 'plastic' ? '#5c8fc4' : '#b88a55';

// Deep trough on a box frame, sloped bottom down to the discharge screw.
for (const [x, y] of [[-1150, -800], [1150, -800], [-1150, 800], [1150, 800]]) add(`leg-${x}-${y}`, blk(x, y, 0, 180, 180, 900).color(trough));
add("trough", blk(0, 0, 900, W + 300, 1900, 1600).subtract(blk(0, 0, 1000, W, 1600, 1600)).color(trough));
add("infeed-mouth", blk(0, -960, 1000, W, 80, 900).color(conveyor));
for (const y of [-500, 0, 500]) for (const s of [-1, 1]) add(`trough-rib-${y}-${s}`, blk(s * (W / 2 + 175), y, 900, 50, 80, 1600).color(trough));
add("top-flange", blk(0, 0, 2500, W + 400, 2000, 60).subtract(blk(0, 0, 2490, W, 1600, 80)).color(trough));

// Two horizontal rotors with hooked picks.
for (const [k, y] of [[0, -400], [1, 400]] as [number, number][]) {
  add(`rotor-${k}`, cylinder(W - 60, 260, 14).rotateY(90).translate(-(W - 60) / 2, y, ZR).color(rotor));
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 3; j++) {
      const a = j * 120 + i * 40 + k * 60;
      const x = -W / 2 + 180 + i * 330;
      add(`pick-${k}-${i}-${j}`, profileYZ([[-40, 240], [40, 240], [90, 470], [-10, 420]], 50).rotateX(a).translate(x, y, ZR).color(rotor));
    }
  }
  // Pedestal bearings, chain guard and gearmotor on the shaft ends.
  for (const s of [-1, 1]) add(`bearing-${k}-${s}`, blk(s * (W / 2 + 270), y, 900, 240, 300, ZR - 900 + 200).color(rotor));
  add(`shaft-${k}`, cylinder(W + 700, 90, 10).rotateY(90).translate(-(W + 700) / 2, y, ZR).color(rotor));
  add(`drive-stand-${k}`, blk(W / 2 + 720, y, 0, 300, 300, 900).color(trough));
  add(`chain-guard-${k}`, blk(W / 2 + 470, y, 900, 120, 360, 1450).color(guard));
  add(`gearbox-${k}`, blk(W / 2 + 720, y, 900, 380, 440, 420).color(trough));
  add(`gearmotor-${k}`, cylinder(600, 200, 14).translate(W / 2 + 720, y, 1320).color('#3d4448'));
}

// Discharge screw out of the trough bottom on the -X side.
add("screw-tube", cylinder(2800, 260, 14).rotateY(-90).translate(W / 2 - 200, 0, 1100).color(conveyor));
add("screw-outlet", blk(-W / 2 - 1300, 0, 300, 520, 520, 600).color(conveyor));
add("screw-motor", cylinder(500, 180, 12).rotateY(90).translate(W / 2 - 200, 0, 1100).color('#3d4448'));
add("screw-stand", blk(-W / 2 - 1300, 0, 0, 400, 400, 300).color(trough));

// Slat chain infeed conveyor with a strapped bale on it.
add("infeed-frame", blk(0, -2800, 0, W - 200, 3600, 900).subtract(blk(0, -2800, -10, W - 400, 3700, 820)).color(trough));
for (let i = 0; i < 18; i++) add(`slat-${i}`, blk(0, -4500 + i * 200, 900, W - 260, 160, 30).color(conveyor));
for (const s of [-1, 1]) add(`infeed-side-${s}`, blk(s * (W / 2 - 80), -2800, 900, 40, 3600, 300).color(guard));
for (const y of [-4400, -2800, -1200]) for (const s of [-1, 1]) add(`infeed-leg-${y}-${s}`, blk(s * (W / 2 - 160), y, 0, 120, 120, 80).color(trough));
add("bale", blk(0, -2700, 930, 1100, 1500, 1050).color(baleColor));
for (const y of [-3200, -2850, -2550, -2200]) add(`bale-wire-${y}`, blk(0, y, 925, 1116, 12, 1060).color('#5a5f62'));

// Wire-cutting station: gantry over the infeed and a coil of removed wire.
for (const s of [-1, 1]) add(`cutter-post-${s}`, blk(s * (W / 2 + 100), -3800, 0, 140, 140, 2300).color(guard));
add("cutter-beam", blk(0, -3800, 2300, W + 340, 180, 160).color(guard));
add("cutter-head", blk(300, -3800, 1950, 260, 260, 350).color('#3d4448'));
add("wire-coil", torus(380, 40, 14).translate(-W / 2 - 700, -3700, 60).color('#5a5f62'));
add("wire-coil-2", torus(300, 35, 14).translate(-W / 2 - 700, -3700, 140).color('#6b7073'));

return p.model();
