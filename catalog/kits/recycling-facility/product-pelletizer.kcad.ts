// SPDX-License-Identifier: CC0-1.0
// Product pelletizer: the strand pelletizing line at the end of a plastics
// recycling plant that turns washed flake back into sellable pellets. What
// makes it a pelletizer rather than a generic machine: a long horizontal
// extruder barrel wrapped in heater bands, a tapered feed hopper over the
// feed throat, a motor and gearbox driving the screw from the back end, a
// die head pushing a fan of strands into a long open water bath, and a
// strand cutter at the far end dropping pellets into a bin.
// Generic visualization geometry at about real size (4.6 m long, 1.1 m
// deep, 1.9 m high), millimetres, Z up, line running along X, operator
// side toward -Y.

meta({
  name: "product-pelletizer",
  license: 'CC0-1.0',
  title: "Product pelletizer",
  description: "Plastic strand pelletizing line at about real size: motor and gearbox driving a horizontal extruder barrel with heater bands, tapered flake hopper, die head with a fan of strands running through an open water bath to a strand cutter that drops pellets into a bin. Material controls: machine frame, barrel and heaters, drive motor and pellets. plant, stainless, legacy and recycledBlack presets.",
  tags: ["recycling", "plastics", "pelletizer", "extruder", "strand pelletizing", "materials recovery", "waste management", "machinery", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const machine = param('machine', '#2f6fa8', { label: 'Machine frame (paint)' });
const barrel = param('barrel', '#b9bfc2', { label: 'Barrel and heater bands' });
const drive = param('drive', '#3f7f4a', { label: 'Drive motor (paint)' });
const pellets = param('pellets', '#e8eef0', { label: 'Pellets and strands' });

presets({
  plant: { machine: '#2f6fa8', barrel: '#b9bfc2', drive: '#3f7f4a', pellets: '#e8eef0' },
  stainless: { machine: '#c6ccce', barrel: '#9aa3a6', drive: '#4a5054', pellets: '#7fb0d8' },
  legacy: { machine: '#7a8a5a', barrel: '#8f8a80', drive: '#5a6070', pellets: '#d8c890' },
  recycledBlack: { machine: '#d4572a', barrel: '#b9bfc2', drive: '#2f3437', pellets: '#2a2c2e' },
});

const p = assembly("product-pelletizer");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// Cylinder lying along X from x0 to x1.
const rodX = (x0: number, x1: number, y: number, z: number, r: number, n = 14) => cylinder(x1 - x0, r, n).rotateY(90).translate(x0, y, z);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();

const BZ = 980; // barrel axis height
const dark = '#2a2e31';

// Extruder base: long welded frame on levelling feet.
add("extruder-base", blk(-500, 0, 120, 2900, 700, 420).color(machine));
add("base-plinth", blk(-500, 0, 40, 3000, 760, 80).color(dark));
for (const x of [-1880, 880]) for (const y of [-300, 300]) add(`foot-${x}-${y}`, cylinder(40, 50, 8).translate(x, y, 0).color(dark));
add("base-door", blk(-900, -352, 200, 900, 6, 280).color(machine));

// Drive: motor along X on the back end, gearbox, coupling guard.
add("motor", rodX(-1950, -1450, 0, 820, 210, 16).color(drive));
add("motor-fan-cover", rodX(-2010, -1950, 0, 820, 190, 16).color(dark));
add("motor-terminal-box", blk(-1700, -200, 980, 180, 120, 120).color(drive));
add("coupling-guard", blk(-1340, 0, 640, 220, 360, 360).color('#f0b429'));
add("gearbox", blk(-1080, 0, 540, 300, 520, 640).color(drive));

// Barrel: feed section, heater bands and fan cowls underneath.
add("barrel", rodX(-930, 700, 0, BZ, 90).color(barrel));
for (let i = 0; i < 6; i++) {
  const x = -620 + i * 220;
  add(`heater-${i}`, rodX(x, x + 150, 0, BZ, 125, 14).color(barrel));
  add(`heater-lead-${i}`, blk(x + 75, -40, BZ + 120, 30, 30, 70).color(dark));
  add(`cooling-fan-${i}`, blk(x + 75, 0, 540, 150, 200, 300).color(machine));
}
add("feed-throat", blk(-800, 0, BZ + 40, 220, 220, 160).color(machine));
add("hopper", rect(260, 260).loft([rect(720, 720), rect(760, 760)], {
  planes: [BZ + 200, BZ + 760, BZ + 820].map((z) => ({ plane: 'XY' as const, origin: [-800, 0, z] as [number, number, number] })),
  ruled: true,
}).subtract(blk(-800, 0, BZ + 760, 700, 700, 80)).color(machine));
add("hopper-flake", blk(-800, 0, BZ + 760, 690, 690, 30).color(pellets));
add("hopper-rim", blk(-800, -390, BZ + 820, 780, 20, 40).color(dark));

// Die head, screen changer and strand die.
add("screen-changer", blk(760, 0, BZ - 220, 160, 300, 440).color(machine));
add("screen-handle", rodX(840, 1000, -190, BZ + 160, 18, 8).color(dark));
add("die-head", rodX(840, 1000, 0, BZ, 150, 16).color(barrel));
add("strand-die", blk(1040, 0, BZ - 60, 80, 420, 80).color(barrel));
add("die-band", rodX(860, 980, 0, BZ, 162, 16).color(dark));

// Water bath: open stainless trough on its own stand, water inside.
const TZ = 640;
add("bath", blk(1950, 0, TZ, 1700, 520, 200).subtract(blk(1950, 0, TZ + 30, 1660, 480, 200)).color(barrel));
add("water", blk(1950, 0, TZ + 30, 1650, 470, 130).color('#5ba3c8'));
for (const x of [1200, 2700]) {
  add(`bath-leg-${x}`, blk(x, -200, 0, 60, 60, TZ).color(machine));
  add(`bath-leg-b-${x}`, blk(x, 200, 0, 60, 60, TZ).color(machine));
}
add("bath-rail", blk(1950, -200, 160, 1500, 50, 50).color(machine));
for (const x of [1350, 1950, 2550]) add(`guide-roller-${x}`, cylinder(440, 22, 8).rotateX(-90).translate(x, -220, TZ + 150).color(dark));

// Strands: from the die down into the bath and up to the cutter.
for (let k = 0; k < 6; k++) {
  const y = -150 + k * 60;
  add(`strand-drop-${k}`, box(420, 10, 10, true).rotateY(48).translate(1200, y, BZ - 230).color(pellets));
  add(`strand-run-${k}`, blk(1950, y, TZ + 150, 1400, 10, 10).color(pellets));
  add(`strand-rise-${k}`, box(300, 10, 10, true).rotateY(-22).translate(2780, y, TZ + 220).color(pellets));
}

// Strand cutter with its drive and pellet chute into a bin.
add("cutter-stand", blk(3150, 0, 0, 420, 520, 620).color(machine));
add("cutter-housing", blk(3120, 0, 620, 360, 460, 360).color(machine));
add("cutter-intake", blk(2930, 0, 820, 60, 380, 80).color(dark));
add("cutter-motor", cylinder(300, 120, 14).rotateX(-90).translate(3150, 230, 820).color(drive));
add("cutter-guard", blk(3150, -258, 680, 280, 8, 240).color('#f0b429'));
add("pellet-chute", box(160, 180, 420, true).rotateY(-35).translate(3400, -40, 560).color(barrel));
add("pellet-bin", blk(3600, -40, 0, 520, 520, 420).subtract(blk(3600, -40, 40, 480, 480, 420)).color('#3a5a7a'));
add("pellet-heap", sphere(250).subtract(blk(0, 0, -260, 520, 520, 260)).translate(3600, -40, 330).color(pellets));

// Control cabinet behind the line with a pendant panel on the operator side.
add("control-cabinet", blk(-200, 520, 0, 800, 360, 1800).color('#c9ced1'));
add("cabinet-door-line", blk(-200, 338, 60, 6, 4, 1680).color(dark));
add("hmi-arm", blk(-300, -380, BZ + 260, 60, 360, 60).color(dark));
add("hmi-panel", box(360, 50, 260, true).rotateX(-15).translate(-300, -580, BZ + 280).color(dark));
add("hmi-screen", box(280, 6, 180, true).rotateX(-15).translate(-300, -608, BZ + 290).color('#5ba3c8'));

return p.model();
