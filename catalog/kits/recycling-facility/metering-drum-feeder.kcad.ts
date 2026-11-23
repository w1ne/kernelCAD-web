// SPDX-License-Identifier: CC0-1.0
// Metering drum feeder: the live-bottom bunker that turns lumpy loader
// buckets of shredded waste into an even ribbon on the process belt. A
// loader tips into a deep steel bunker with flared top skirts; a slatted
// chain floor creeps the load toward the open discharge end, where a
// spiked drum spinning across the outlet combs the pile down to a fixed
// depth. The leveled material drops onto a cross takeaway conveyor. What
// makes it a metering feeder rather than a skip: the open-ended bunker on
// legs, the spiked levelling drum across the outlet with its gear motor,
// the chain-floor slats at the lip and the cross belt carrying an even
// ridge away. Generic visualization geometry at about real size (5.0 m
// long, 3.6 m wide, 2.9 m high), millimetres, Z up, discharge toward -X.

meta({
  name: "metering-drum-feeder",
  license: 'CC0-1.0',
  title: "Metering drum feeder",
  description: "Live-bottom metering drum feeder at about real size: open-ended steel bunker on six legs with flared loading skirts, chain-floor slats at the discharge lip, spiked levelling drum across the outlet with bearing blocks and a gear motor, cross takeaway belt conveyor with an even ridge of shredded waste, and a heaped load in the bunker. Material controls: bunker paint, drum and roller steel, conveyor belt rubber, shredded material. plant, weathered, highVisibility and woodChip presets.",
  tags: ["recycling", "metering feeder", "live bottom bunker", "walking floor", "RDF", "shredded waste", "materials recovery", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1700,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const bunker = param('bunker', '#2e6e4f', { label: 'Bunker and frame paint' });
const steel = param('steel', '#8f969a', { label: 'Drum, tines and rollers (steel)' });
const belt = param('belt', '#262a2c', { label: 'Conveyor belt (rubber)' });
const material = param('material', '#b9a77f', { label: 'Shredded material' });

presets({
  plant: { bunker: '#2e6e4f', steel: '#8f969a', belt: '#262a2c', material: '#b9a77f' },
  weathered: { bunker: '#4f6155', steel: '#7a7470', belt: '#33302d', material: '#9c8f74' },
  highVisibility: { bunker: '#e0b021', steel: '#9da4a8', belt: '#1f2224', material: '#c0b089' },
  woodChip: { bunker: '#7a3b2a', steel: '#8f969a', belt: '#262a2c', material: '#a8763f' },
});

const p = assembly("metering-drum-feeder");
// Modelled with discharge toward +X, then turned so the open end faces the viewer.
const add = (name: string, shape: Shape) => p.part(name, shape.rotateZ(180).scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const taper = (w0: number, d0: number, a: [number, number, number], w1: number, d1: number, b: [number, number, number]) => rect(w0, d0).loft([rect(w1, d1)], {
  planes: [{ plane: 'XY' as const, origin: a }, { plane: 'XY' as const, origin: b }],
  ruled: true,
});
const dark = '#2a2e31';

// Bunker: floor at ZF, walls to ZT, x from X0 to X1 (open at X1).
const X0 = -2600, X1 = 1000, W = 1600, T = 40, ZF = 1000, ZT = 2000;
add("bunker-body", blk((X0 + X1) / 2, 0, ZF - 60, X1 - X0, W + 2 * T, ZT - ZF + 60).subtract(blk((X0 + X1) / 2 + T, 0, ZF, X1 - X0, W, ZT)).color(bunker));
for (const s of [-1, 1]) {
  add(`skirt-${s < 0 ? 'f' : 'b'}`, profileXZ([[X0, 0], [X1 - 200, 0], [X1 - 450, 420], [X0 - 150, 420]], 30).rotateX(s * -22).translate(0, s * (W / 2 + T / 2), ZT).color(bunker));
  add(`rib-${s < 0 ? 'f' : 'b'}`, blk((X0 + X1) / 2, s * (W / 2 + T + 40), ZT - 160, X1 - X0, 80, 100).color(bunker));
  for (const lx of [X0 + 200, (X0 + X1) / 2, X1 - 200]) {
    add(`leg-${s < 0 ? 'f' : 'b'}-${lx}`, blk(lx, s * (W / 2 + T - 90), 0, 180, 180, ZF - 60).color(bunker));
    add(`leg-foot-${s < 0 ? 'f' : 'b'}-${lx}`, blk(lx, s * (W / 2 + T - 90), 0, 340, 340, 30).color(bunker));
  }
  add(`brace-${s < 0 ? 'f' : 'b'}`, profileXZ([[X0 + 290, 140], [(X0 + X1) / 2 - 90, ZF - 260], [(X0 + X1) / 2 - 90, ZF - 160], [X0 + 290, 240]], 40).translate(0, s * (W / 2 + T - 90), 0).color(bunker));
}
add("skirt-back", blk(0, 0, 0, 30, W + 400, 420).rotateY(-18).translate(X0 - 15, 0, ZT).color(bunker));
// Drag-chain floor: slats showing at the open discharge lip.
for (let i = 0; i < 6; i++) add(`floor-slat-${i}`, blk(X1 - 120 - i * 240, 0, ZF, 70, W - 40, 30).color(steel));
add("chain-sprocket-shaft", cylinder(W + 260, 60, 10).rotateX(90).translate(X1 - 60, W / 2 + 130, ZF - 60).color(dark));

// Spiked levelling drum across the outlet, axis Y.
const DX = X1 - 250, DZ = ZF + 700, R = 260, DW = W - 80;
add("drum-tube", cylinder(DW, R, 16).rotateX(90).translate(DX, DW / 2, DZ).color(steel));
add("drum-shaft", cylinder(W + 420, 50, 10).rotateX(90).translate(DX, W / 2 + 210, DZ).color(dark));
for (let r = 0; r < 6; r++) {
  for (let k = 0; k < 4; k++) {
    const y = -DW / 2 + 180 + k * ((DW - 360) / 3) + (r % 2) * 120;
    add(`tine-${r}-${k}`, blk(0, 0, R - 20, 40, 60, 200).rotateY(r * 60 + 15).translate(DX, y, DZ).color(steel));
  }
}
for (const s of [-1, 1]) {
  add(`bearing-${s < 0 ? 'f' : 'b'}`, blk(DX, s * (W / 2 + T + 80), DZ - 110, 260, 120, 220).color(dark));
  add(`bearing-plate-${s < 0 ? 'f' : 'b'}`, blk(DX, s * (W / 2 + T + 20), ZT - 1100, 420, 40, 900).color(bunker));
}
add("drum-gearbox", blk(DX, -(W / 2 + T + 270), DZ - 220, 360, 260, 400).color(bunker));
add("drum-motor", cylinder(480, 140, 14).rotateY(-90).translate(DX - 180, -(W / 2 + T + 270), DZ - 40).color(dark));

// Cross takeaway conveyor under the outlet, running along Y.
const CX = X1 + 500, CZ = 620, CL = 3600, CW = 900;
add("conveyor-bed", blk(CX, 0, CZ - 220, CW + 80, CL, 200).color(bunker));
add("conveyor-belt", blk(CX, 0, CZ - 20, CW, CL, 30).color(belt));
for (const s of [-1, 1]) {
  add(`end-pulley-${s < 0 ? 'f' : 'b'}`, cylinder(CW + 40, 150, 14).rotateY(90).translate(CX - CW / 2 - 20, s * CL / 2, CZ - 130).color(steel));
  add(`belt-skirt-${s < 0 ? 'f' : 'b'}`, blk(CX + s * (CW / 2 - 20), 0, CZ + 10, 20, CL - 400, 180).color(steel));
  for (const ly of [-CL / 2 + 300, 0, CL / 2 - 300]) add(`conv-leg-${s < 0 ? 'f' : 'b'}-${ly}`, blk(CX + s * (CW / 2 - 20), ly, 0, 100, 100, CZ - 220).color(bunker));
}
add("conveyor-motor", cylinder(420, 130, 14).rotateY(90).translate(CX + CW / 2 + 40, -CL / 2, CZ - 130).color(dark));
add("discharge-hood", taper(560, W, [X1 + 200, 0, ZF - 40], 760, W - 100, [X1 + 420, 0, CZ + 200]).color(bunker));

// Material: heap in the bunker, combed level at the drum, ridge on the belt.
add("bunker-heap", taper(X1 - X0 - 500, W - 60, [(X0 + X1) / 2 - 300, 0, ZF + 30], X1 - X0 - 1900, W - 600, [(X0 + X1) / 2 - 700, 0, ZT + 300]).color(material));
add("levelled-bed", blk(X1 - 300, 0, ZF + 30, 600, W - 60, DZ - R - ZF - 80).color(material));
add("belt-ridge", taper(CW - 120, CL - 500, [CX, 0, CZ + 10], CW - 520, CL - 700, [CX, 0, CZ + 190]).color(material));
const flakeCols = ['#d9d4c4', '#5f86a8', '#b84d3a', '#8a8f5a'];
for (let i = 0; i < 18; i++) {
  const onBelt = i >= 10;
  const x = onBelt ? CX - 260 + (i % 3) * 260 : X0 + 500 + (i % 5) * 520 + ((i * 37) % 90);
  const y = onBelt ? -CL / 2 + 500 + (i - 10) * 330 : -W / 2 + 300 + Math.floor(i / 5) * 700 + ((i * 53) % 120);
  const z = onBelt ? CZ + 150 : ZT + 80 - Math.abs(x - (X0 + X1) / 2 + 700) * 0.12;
  add(`flake-${i}`, box(240, 150, 30, true).rotateX(i * 31).rotateZ(i * 47).translate(x, y, z).color(flakeCols[i % 4]));
}

return p.model();
