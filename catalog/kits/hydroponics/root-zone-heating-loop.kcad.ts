// SPDX-License-Identifier: CC0-1.0
// Root-zone heating loop: hot-water bench heating that warms the rooting
// medium of propagation trays from below, so cuttings and seedlings root
// faster than the air temperature alone would allow.
// What makes it a root-zone loop: an open bench tray with a sand heat bed
// and serpentine PEX loops laid in it (straight runs joined by U-bends),
// seedling trays standing on part of the bed, and at the bench end a
// mixing station: red supply and blue return manifold bars that every
// loop tails into, a circulator pump with its motor, a three-way mixing
// valve with actuator, and dial thermometers on both bars.
// Generic visualization geometry at about real size (2 m by 1 m bench,
// bed at 0.7 m), millimetres, Z up, front -Y.

meta({
  name: "root-zone-heating-loop",
  license: 'CC0-1.0',
  title: "Root-zone heating loop",
  description: "Hot-water root-zone bench heating at about real size: open bench tray with sand heat bed and serpentine PEX loops with U-bends, seedling trays on the bed, and a mixing station with red supply and blue return manifold bars, circulator pump, three-way mixing valve with actuator and dial thermometers. Material controls: bench frame, heat bed, PEX pipe and circulator, plus loop count (2, 3 or 4) and seedling trays (on or off). standard, blackPex, weathered and highVisibility presets.",
  tags: ['root zone heating', 'bench heating', 'propagation', 'pex loop', 'manifold', 'circulator pump', 'mixing valve', 'greenhouse', 'hydroponics', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 5000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('benchFrame', '#9ea6a9', { label: 'Bench frame and tray (galvanised steel)' });
const bed = param('heatBed', '#cdb98c', { label: 'Heat bed (sand)' });
const pex = param('pexPipe', '#d0532c', { label: 'Heating loops (PEX)' });
const pump = param('circulator', '#c23b2b', { label: 'Circulator pump' });
const loops = param('loops', '3', { choices: ['2', '3', '4'], label: 'Heating loops' });
const trays = param('seedlingTrays', 'on', { choices: ['on', 'off'], label: 'Seedling trays' });

presets({
  standard: { benchFrame: '#9ea6a9', heatBed: '#cdb98c', pexPipe: '#d0532c', circulator: '#c23b2b' },
  blackPex: { benchFrame: '#8d9497', heatBed: '#b9a77e', pexPipe: '#25282a', circulator: '#3d7a3a' },
  weathered: { benchFrame: '#7d817c', heatBed: '#a8946c', pexPipe: '#9c5a3e', circulator: '#7a4a40' },
  highVisibility: { benchFrame: '#e87832', heatBed: '#e8d6a2', pexPipe: '#e0b21f', circulator: '#2a6fb0' },
});

const p = assembly("root-zone-heating-loop");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
// cylinder(...).rotateX(90) runs from its origin toward -Y.
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateX(90).translate(x, y, z);
// Half a torus lying flat: side +1 keeps the +X half, -1 the -X half.
const uBend = (x: number, y: number, z: number, R: number, r: number, side: number) =>
  torus(R, r, 12).subtract(box(2 * R + 4 * r, 2 * R + 4 * r, 4 * r, true).translate(-side * (R + 2 * r), 0, 0)).translate(x, y, z);

const BX = 1000, BY = 500, TZ = 690, PZ = 732, MX = -1090;
const supply = '#c8372d', ret = '#2f6fa8';

// Bench: legs, rails, open tray, sand bed.
for (const x of [-BX + 40, BX - 40]) for (const y of [-BY + 40, BY - 40]) add(`leg-${x}-${y}`, blk(x, y, 0, 50, 50, TZ).color(frame));
for (const y of [-BY + 40, BY - 40]) add(`rail-${y}`, blk(0, y, 220, 2 * BX - 80, 40, 40).color(frame));
add("tray", blk(0, 0, TZ, 2 * BX, 2 * BY, 100).subtract(blk(0, 0, TZ + 20, 2 * BX - 40, 2 * BY - 40, 100)).color(frame));
add("heat-bed", blk(0, 0, TZ + 20, 2 * BX - 40, 2 * BY - 40, 12).color(bed));

// Serpentine loops: four runs per loop, bends alternating ends, both
// tails leaving through the -X end wall.
const n = Number(loops.value);
const W = (2 * BY - 80) / n, gap = W / 4, R = gap / 2;
const xEnd = BX - 70, xTurn = -BX + 150, xWall = -BX - 10;
for (let i = 0; i < n; i++) {
  const y0 = -BY + 40 + i * W + gap / 2;
  const ys = [0, 1, 2, 3].map((j) => y0 + j * gap);
  add(`run-${i}-0`, cylX(xWall, ys[0], PZ, xEnd - xWall, 10, 8).color(pex));
  add(`run-${i}-1`, cylX(xTurn, ys[1], PZ, xEnd - xTurn, 10, 8).color(pex));
  add(`run-${i}-2`, cylX(xTurn, ys[2], PZ, xEnd - xTurn, 10, 8).color(pex));
  add(`run-${i}-3`, cylX(xWall, ys[3], PZ, xEnd - xWall, 10, 8).color(pex));
  add(`bend-${i}-a`, uBend(xEnd, (ys[0] + ys[1]) / 2, PZ, R, 10, 1).color(pex));
  add(`bend-${i}-b`, uBend(xTurn, (ys[1] + ys[2]) / 2, PZ, R, 10, -1).color(pex));
  add(`bend-${i}-c`, uBend(xEnd, (ys[2] + ys[3]) / 2, PZ, R, 10, 1).color(pex));
  // Tails over the end wall and down to the manifold bars.
  add(`tail-out-${i}`, cylX(MX, ys[0], PZ, xWall - MX, 10, 8).color(pex));
  add(`tail-back-${i}`, cylX(MX, ys[3], PZ, xWall - MX, 10, 8).color(pex));
  add(`tail-down-s-${i}`, cylZ(MX, ys[0], 600, PZ - 600, 10, 8).color(pex));
  add(`tail-down-r-${i}`, cylZ(MX, ys[3], 500, PZ - 500, 10, 8).color(pex));
}

// Mixing station on the -X end of the bench.
add("station-plate", blk(MX + 40, 0, 120, 20, 2 * BY - 120, 560).color(frame));
add("supply-bar", cylY(MX, BY - 40, 600, 2 * BY - 40, 24, 12).color(supply));
add("return-bar", cylY(MX, BY - 40, 500, 2 * BY - 40, 24, 12).color(ret));
for (const [z, c] of [[600, supply], [500, ret]] as [number, string][]) {
  add(`thermo-stem-${z}`, cylX(MX - 50, -BY + 60, z, 30, 6, 6).color('#c49a3c'));
  add(`thermo-dial-${z}`, cylX(MX - 70, -BY + 60, z, 20, 34, 16).color('#2a2c2e'));
  add(`thermo-face-${z}`, cylX(MX - 74, -BY + 60, z, 4, 29, 16).color('#eef0ec'));
  add(`thermo-mark-${z}`, blk(MX - 77, -BY + 60, z, 2, 6, 24).color(c));
}
// Supply drop: circulator pump, then mixing valve, into the floor.
const SY = -BY + 20;
add("supply-drop", cylZ(MX, SY, 60, 540, 22, 12).color(supply));
add("pump-volute", blk(MX, SY, 360, 120, 120, 110).color(pump));
add("pump-motor", cylX(MX - 200, SY, 415, 140, 60, 16).color(pump));
add("pump-cap", cylX(MX - 214, SY, 415, 14, 50, 16).color('#2a2c2e'));
add("pump-box", blk(MX - 130, SY, 470, 90, 90, 60).color('#2a2c2e'));
add("mix-valve", blk(MX, SY, 170, 110, 110, 110).color('#c49a3c'));
add("mix-actuator", blk(MX - 110, SY, 180, 110, 90, 90).color('#e3e4df'));
add("mix-knob", cylX(MX - 175, SY, 225, 10, 30, 12).color('#2a2c2e'));
add("bypass", cylY(MX, SY + 140, 225, 140, 18, 10).color(ret));
add("return-drop", cylZ(MX, SY + 140, 60, 440, 22, 12).color(ret));
for (const y of [SY, SY + 140]) add(`floor-flange-${y}`, cylZ(MX, y, 0, 60, 40, 12).color(frame));

// Seedling trays on the back half of the bed.
if (trays.value === 'on') {
  for (const x of [250, 650]) {
    add(`seed-tray-${x}`, blk(x, 230, PZ + 10, 360, 520, 60).color('#2a2c2e'));
    add(`seedlings-${x}`, blk(x, 230, PZ + 70, 330, 490, 30).color('#5fae3e'));
    for (const dy of [-150, 0, 150]) add(`seedling-tuft-${x}-${dy}`, blk(x, 230 + dy, PZ + 100, 300, 40, 20).color('#8ccf5a'));
  }
}

return p.model();
