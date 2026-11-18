// SPDX-License-Identifier: CC0-1.0
// Glass load-out silo: the drive-through bin that loads sorted glass
// straight into a truck. What makes it a load-out rather than a storage
// silo: a square steel bin with a pyramid hopper bottom held up on a tall
// portal frame a truck can drive through, a telescopic loading spout under
// the outlet, and a bucket elevator standing beside it that lifts cullet
// from a ground-level intake boot and drops it through a head chute into
// the bin roof, with a railed roof walkway.
// Generic visualization geometry at about real size (4 m bin, 10.6 m to the
// elevator head), millimetres, Z up, elevator and spout face the -X/-Y camera.

meta({
  name: "glass-loadout-silo",
  license: 'CC0-1.0',
  title: "Glass load-out silo",
  description: "Drive-through glass load-out bin at about real size: square steel bin with pyramid hopper on a portal frame a truck drives under, telescopic loading spout, bucket elevator with intake boot and head chute into the roof, ribbed bin walls and railed roof walkway. Material controls: bin, portal frame, bucket elevator and safety rail. plant, weathered, glassGreen and highVisibility presets.",
  tags: ["recycling", "glass", "cullet", "load-out", "loadout bin", "truck loading", "bucket elevator", "hopper", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const bin = param('bin', '#5d7f96', { label: 'Bin and hopper (painted steel)' });
const frame = param('frame', '#3d4a52', { label: 'Portal frame' });
const elevator = param('elevator', '#e08a2c', { label: 'Bucket elevator casing' });
const safety = param('safety', '#f0c419', { label: 'Handrail and bump guards' });

presets({
  plant: { bin: '#5d7f96', frame: '#3d4a52', elevator: '#e08a2c', safety: '#f0c419' },
  weathered: { bin: '#6f7a7c', frame: '#4a4d4c', elevator: '#a87b4a', safety: '#bf9f45' },
  glassGreen: { bin: '#4f8a5c', frame: '#2f3b40', elevator: '#c9ced1', safety: '#f0c419' },
  highVisibility: { bin: '#e8e8e2', frame: '#2a6fb5', elevator: '#d4402a', safety: '#f2d21b' },
});

const p = assembly("glass-loadout-silo");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const taper = (w0: number, d0: number, a: [number, number, number], w1: number, d1: number, b: [number, number, number]) => rect(w0, d0).loft([rect(w1, d1)], {
  planes: [{ plane: 'XY' as const, origin: a }, { plane: 'XY' as const, origin: b }],
  ruled: true,
});
const dark = '#2a2e31';

// Portal frame: four columns with bump guards, ring beams under the bin.
const CX = 1700, CY = 1700, ZF = 4600;
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  add(`column-${sx}-${sy}`, blk(sx * CX, sy * CY, 0, 300, 300, ZF + 200).color(frame));
  add(`bump-guard-${sx}-${sy}`, blk(sx * CX, sy * CY, 0, 420, 420, 1200).color(safety));
}
for (const s of [-1, 1]) {
  add(`beam-x-${s}`, blk(0, s * CY, ZF, 2 * CX + 300, 300, 400).color(frame));
  add(`beam-y-${s}`, blk(s * CX, 0, ZF, 300, 2 * CY + 300, 400).color(frame));
  add(`knee-x-${s}`, blk(0, s * CY, ZF - 700, 2 * CX - 300, 160, 160).color(frame));
}

// Bin: pyramid hopper from the outlet up to the bin body, ribbed walls, roof.
const W = 4000, ZB = 6000, ZT = 8600;
add("hopper", taper(600, 600, [0, 0, ZF - 300], W, W, [0, 0, ZB]).color(bin));
add("bin-body", blk(0, 0, ZB, W, W, ZT - ZB).color(bin));
add("bin-roof", blk(0, 0, ZT, W + 120, W + 120, 120).color(bin));
for (const t of [-1200, 0, 1200]) for (const s of [-1, 1]) {
  add(`rib-x-${t}-${s}`, blk(t, s * (W / 2 + 40), ZB, 120, 80, ZT - ZB).color(frame));
  add(`rib-y-${t}-${s}`, blk(s * (W / 2 + 40), t, ZB, 80, 120, ZT - ZB).color(frame));
}
add("waist-band", blk(0, 0, ZB - 120, W + 200, W + 200, 160).color(frame));
add("inspection-hatch", blk(-600, -W / 2 - 40, ZB + 900, 700, 40, 800).color(dark));

// Outlet gate and telescopic loading spout down to truck-bed height.
add("outlet-gate", blk(0, 0, ZF - 600, 700, 700, 300).color(frame));
add("gate-cylinder", cylinder(800, 80, 10).rotateY(-90).translate(-350, 0, ZF - 450).color(safety));
add("spout-upper", cylinder(700, 300, 16).translate(0, 0, ZF - 1300).color(bin));
add("spout-mid", cylinder(700, 260, 16).translate(0, 0, ZF - 1900).color(bin));
add("spout-lower", cylinder(600, 220, 16).translate(0, 0, ZF - 2400).color(bin));
add("spout-skirt", taper(440, 440, [0, 0, ZF - 2400], 360, 360, [0, 0, ZF - 2700]).color(dark));
for (const a of [45, 135, 225, 315]) add(`spout-cable-${a}`, cylinder(1900, 12, 6).translate(380 * Math.cos((a * Math.PI) / 180), 380 * Math.sin((a * Math.PI) / 180), ZF - 2000).color(dark));

// Bucket elevator on -X: intake boot, twin-leg casing, head and chute to the roof.
const EX = -CX - 1500, EH = 10200;
add("intake-hopper", taper(600, 600, [EX - 900, 0, 300], 1500, 1500, [EX - 900, 0, 1100]).color(elevator));
add("boot", blk(EX, 0, 0, 1000, 900, 1300).color(elevator));
for (const y of [-260, 260]) add(`elevator-leg-${y}`, blk(EX, y, 1300, 600, 380, EH - 1300).color(elevator));
for (let z = 2500; z < EH; z += 2000) add(`leg-joint-${z}`, blk(EX, 0, z, 680, 980, 80).color(frame));
add("head-housing", blk(EX + 100, 0, EH, 1200, 1000, 900).color(elevator));
add("head-hood", taper(1200, 1000, [EX + 100, 0, EH + 900], 500, 1000, [EX + 100, 0, EH + 1300]).color(elevator));
add("drive-motor", cylinder(600, 220, 12).rotateX(90).translate(EX + 200, -500, EH + 450).color('#2f5d9a'));
add("gearbox", blk(EX + 200, -650, EH + 200, 500, 300, 500).color(frame));
const L = Math.hypot(-EX - 500, EH - ZT - 300), ang = (Math.atan2(EH - ZT - 300, -EX - 500) * 180) / Math.PI;
add("head-chute", box(L, 450, 450, true).rotateY(ang).translate((EX + 100) / 2, 0, (EH + 200 + ZT + 300) / 2).color(elevator));
for (const z of [3500, 6500]) add(`elevator-tie-${z}`, blk((EX - CX) / 2, -CY, z, -EX - CX - 300, 120, 120).color(frame));

// Roof walkway handrail on posts.
for (const x of [-1900, 0, 1900]) for (const s of [-1, 1]) {
  add(`post-x-${x}-${s}`, blk(x, s * 1960, ZT + 120, 50, 50, 1050).color(safety));
  add(`post-y-${x}-${s}`, blk(s * 1960, x, ZT + 120, 50, 50, 1050).color(safety));
}
for (const s of [-1, 1]) for (const z of [ZT + 650, ZT + 1120]) {
  add(`rail-x-${s}-${z}`, blk(0, s * 1960, z, 3970, 50, 50).color(safety));
  add(`rail-y-${s}-${z}`, blk(s * 1960, 0, z, 50, 3970, 50).color(safety));
}

return p.model();
