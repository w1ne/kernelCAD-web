// SPDX-License-Identifier: CC0-1.0
// Compost bagging machine: the open-mouth bagger at the end of a compost
// yard that turns screened compost into retail sacks. A loader fills a
// tall surge hopper on a steel stand; a weigh hopper on load cells under it
// drops one sack's worth through a tapered spout into a bag clamped on the
// spout. The filled bag stands on a short belt that carries it under a
// sewing head to close the top, and the closed sacks are stacked on a
// pallet. What makes it a bagger rather than a hopper: the clamped open
// sack under the spout, the bag conveyor with the column-mounted closing
// head, the control cabinet and the pallet of finished sacks. Generic
// visualization geometry at about real size (4.6 m long, 2.0 m wide, 3.6 m
// high), millimetres, Z up, bags travel toward +X.

meta({
  name: "compost-bagging-machine",
  license: 'CC0-1.0',
  title: "Compost bagging machine",
  description: "Open-mouth compost bagger at about real size: tall surge hopper heaped with compost on a four-leg stand with a service ladder, weigh hopper on load cells, tapered fill spout with a clamped open sack, bag belt conveyor running under a column-mounted sewing head, control cabinet, and a pallet stacked with filled printed sacks. Material controls: machine paint, stainless spout and weigh hopper, sack plastic, compost. garden, weathered, highVisibility and peat presets.",
  tags: ["recycling", "composting", "bagging machine", "open mouth bagger", "packaging", "compost", "materials recovery", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const machine = param('machine', '#2d4f7c', { label: 'Machine frame paint' });
const stainless = param('stainless', '#c3c9cc', { label: 'Spout and weigh hopper (stainless steel)' });
const sacks = param('sacks', '#4f8a3a', { label: 'Sack plastic' });
const compost = param('compost', '#4a3424', { label: 'Compost' });

presets({
  garden: { machine: '#2d4f7c', stainless: '#c3c9cc', sacks: '#4f8a3a', compost: '#4a3424' },
  weathered: { machine: '#56636b', stainless: '#a5abab', sacks: '#5f7a4c', compost: '#55402f' },
  highVisibility: { machine: '#e0a21c', stainless: '#c9cfd1', sacks: '#2f6fb0', compost: '#3f2c1f' },
  peat: { machine: '#7c2f2a', stainless: '#c3c9cc', sacks: '#d8c45a', compost: '#2f2219' },
});

const p = assembly("compost-bagging-machine");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const taper = (w0: number, d0: number, a: [number, number, number], w1: number, d1: number, b: [number, number, number]) => rect(w0, d0).loft([rect(w1, d1)], {
  planes: [{ plane: 'XY' as const, origin: a }, { plane: 'XY' as const, origin: b }],
  ruled: true,
});
// A filled sack: a slab that tapers to a pillowy top.
const sack = (w: number, d: number, h: number) => taper(w, d, [0, 0, 0], w - 40, d - 40, [0, 0, h * 0.75]).union(taper(w - 40, d - 40, [0, 0, h * 0.75], w - 220, d - 140, [0, 0, h]));
const dark = '#2a2e31';
const label = '#efe9d6';

// Stand: four legs, ring beam, surge hopper (inverted pyramid + box bin).
const HX = -900, HZ = 2200, HW = 1500;
for (const sx of [-1, 1]) {
  for (const sy of [-1, 1]) {
    add(`leg-${sx}-${sy}`, blk(HX + sx * (HW / 2 - 60), sy * (HW / 2 - 60), 0, 120, 120, HZ).color(machine));
    add(`leg-foot-${sx}-${sy}`, blk(HX + sx * (HW / 2 - 60), sy * (HW / 2 - 60), 0, 260, 260, 25).color(machine));
  }
  add(`ring-x-${sx}`, blk(HX, sx * (HW / 2 - 60), HZ - 160, HW, 120, 160).color(machine));
  add(`ring-y-${sx}`, blk(HX + sx * (HW / 2 - 60), 0, HZ - 160, 120, HW, 160).color(machine));
  add(`knee-rail-${sx}`, blk(HX + sx * (HW / 2 - 60), 0, 500, 80, HW - 120, 80).color(machine));
}
add("hopper-cone", taper(380, 380, [HX, 0, HZ - 650], HW, HW, [HX, 0, HZ]).color(machine));
add("hopper-bin", blk(HX, 0, HZ, HW, HW, 900).subtract(blk(HX, 0, HZ + 60, HW - 80, HW - 80, 900)).color(machine));
add("hopper-rim", blk(HX, 0, HZ + 900, HW + 80, HW + 80, 50).subtract(blk(HX, 0, HZ + 890, HW - 80, HW - 80, 80)).color(machine));
add("compost-heap", taper(HW - 90, HW - 90, [HX, 0, HZ + 600], 300, 300, [HX - 100, 50, HZ + 1150]).color(compost));
// Service ladder on the -X face.
for (const sy of [-1, 1]) add(`ladder-rail-${sy}`, blk(HX - HW / 2 - 140, sy * 220, 0, 50, 50, HZ + 1000).color(machine));
for (let k = 0; k < 10; k++) add(`ladder-rung-${k}`, blk(HX - HW / 2 - 140, 0, 300 + k * 300, 40, 440, 30).color(machine));

// Feed gate, weigh hopper on load cells, fill spout and clamped open sack.
add("slide-gate", blk(HX, 0, HZ - 760, 520, 600, 110).color(dark));
add("gate-cylinder", cylinder(420, 45, 10).rotateY(90).translate(HX + 260, 0, HZ - 705).color(stainless));
add("weigh-hopper", taper(260, 260, [HX, 0, 1150], 620, 620, [HX, 0, HZ - 780]).color(stainless));
for (const sy of [-1, 1]) {
  add(`load-cell-${sy}`, blk(HX, sy * 380, 1700, 140, 140, 90).color(dark));
  add(`load-cell-arm-${sy}`, blk(HX, sy * 270, 1730, 80, 140, 40).color(machine));
}
add("fill-spout", taper(300, 220, [HX, 0, 950], 240, 240, [HX, 0, 1150]).color(stainless));
add("bag-clamp", blk(HX, 0, 1000, 420, 320, 70).color(machine));
add("open-sack", taper(560, 300, [HX, 0, 300], 440, 280, [HX, 0, 1040]).color(sacks));
add("open-sack-label", blk(HX, -150, 520, 380, 12, 260).color(label));

// Bag conveyor from under the spout toward +X, with a sewing head column.
const CZ = 300, CX0 = HX - 500, CX1 = 1300, CW = 700;
add("bag-belt", blk((CX0 + CX1) / 2, 0, CZ - 40, CX1 - CX0, CW, 40).color(dark));
add("conveyor-frame", blk((CX0 + CX1) / 2, 0, CZ - 200, CX1 - CX0 + 60, CW + 60, 160).color(machine));
for (const x of [CX0, CX1]) add(`end-roller-${x}`, cylinder(CW + 40, 90, 12).rotateX(90).translate(x, CW / 2 + 20, CZ - 110).color(stainless));
for (const x of [CX0 + 150, (CX0 + CX1) / 2, CX1 - 150]) {
  for (const sy of [-1, 1]) add(`conv-leg-${x}-${sy}`, blk(x, sy * (CW / 2 - 20), 0, 80, 80, CZ - 200).color(machine));
}
for (const sy of [-1, 1]) add(`bag-guide-${sy}`, blk((CX0 + CX1) / 2 + 300, sy * 340, CZ + 200, CX1 - CX0 - 800, 30, 40).color(stainless));
// Closing head: a column with an arm reaching over the belt.
add("sewing-column", blk(400, 650, 0, 160, 160, 1500).color(machine));
add("sewing-arm", blk(400, 330, 1350, 160, 640, 140).color(machine));
add("sewing-head", blk(400, 0, 950, 300, 260, 400).color(stainless));
add("sewing-motor", cylinder(260, 90, 12).rotateY(90).translate(550, 0, 1180).color(dark));
add("sack-on-belt-a", sack(560, 300, 780).translate(-100, 0, CZ).color(sacks));
add("sack-on-belt-a-label", blk(-100, -151, CZ + 220, 380, 12, 260).color(label));
add("sack-on-belt-b", sack(560, 300, 700).translate(900, 0, CZ).color(sacks));
add("sack-on-belt-b-label", blk(900, -151, CZ + 200, 380, 12, 240).color(label));

// Control cabinet with a panel and beacon.
add("control-cabinet", blk(-2350, -700, 0, 600, 350, 1700).color(machine));
add("control-panel", blk(-2350, -878, 900, 440, 12, 500).color(dark));
for (let k = 0; k < 3; k++) add(`button-${k}`, blk(-2500 + k * 150, -890, 700, 60, 20, 60).color(k === 0 ? '#c83a2c' : '#3fa34d'));
add("beacon", cylinder(160, 70, 12).translate(-2350, -700, 1700).color('#f0a020'));

// Pallet of finished sacks, three layers.
const PX = 2200;
add("pallet-deck", blk(PX, 0, 110, 1200, 1000, 30).color('#b88b55'));
for (const sy of [-1, 0, 1]) add(`pallet-runner-${sy}`, blk(PX, sy * 420, 0, 1200, 100, 110).color('#a27a49'));
for (let layer = 0; layer < 3; layer++) {
  for (let k = 0; k < 4; k++) {
    const turn = (layer + k) % 2 === 0;
    const x = PX - 280 + (k % 2) * 560;
    const y = -250 + Math.floor(k / 2) * 500;
    add(`stacked-sack-${layer}-${k}`, (turn ? sack(560, 460, 200) : sack(560, 460, 200).rotateZ(4)).translate(x, y, 140 + layer * 200).color(sacks));
  }
}
add("stack-label", blk(PX - 280, -481, 440, 380, 12, 120).color(label));

return p.model();
