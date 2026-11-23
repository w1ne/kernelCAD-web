// SPDX-License-Identifier: CC0-1.0
// Ebb-and-flow grow table: a flood-and-drain bench. A pump floods the
// shallow tray from the reservoir underneath, the plants drink from below,
// then the water drains back through the same fitting.
// What makes it an ebb-and-flow table: a moulded flood tray with a raised lip
// and a grid of drainage channels in its floor, a flood/drain fitting with an
// overflow standpipe in one corner, a return pipe dropping into a lidded
// reservoir under the bench, and a galvanised steel bench frame on roller
// tubes so the tray slides sideways to open an aisle. Potted plants or plug
// flats stand on the channel grid.
// Generic visualization geometry at about real size (2.4 m by 1.2 m tray,
// 0.85 m working height), millimetres, Z up, front toward -Y.

meta({
  name: "ebb-flow-grow-table",
  license: 'CC0-1.0',
  title: "Ebb-and-flow grow table",
  description: "Flood-and-drain grow bench at about real size: moulded flood tray with raised lip and channelled floor, corner flood/drain fitting with overflow standpipe, return pipe into a lidded reservoir under the bench, galvanised bench frame on roller tubes, and a crop of potted plants or plug flats. Material controls: bench frame, flood tray, pots and crop foliage, plus a crop choice. potted, darkTray, flowering and weathered presets.",
  tags: ['ebb and flow', 'flood and drain', 'flood table', 'rolling bench', 'grow table', 'hydroponics', 'greenhouse', 'nursery', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 5000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#a9b1b4', { label: 'Bench frame (galvanised steel)' });
const tray = param('tray', '#ecebe4', { label: 'Flood tray (ABS)' });
const pots = param('pots', '#2a2c2e', { label: 'Pots and flats (polypropylene)' });
const foliage = param('foliage', '#5f9e3c', { label: 'Crop foliage' });
const crop = param('crop', 'potted', { choices: ['potted', 'plug flats', 'empty'], label: 'Crop on the tray' });

presets({
  potted: { frame: '#a9b1b4', tray: '#ecebe4', pots: '#2a2c2e', foliage: '#5f9e3c' },
  darkTray: { frame: '#a9b1b4', tray: '#2b2e30', pots: '#b5643c', foliage: '#6faa44' },
  flowering: { frame: '#8f9699', tray: '#ecebe4', pots: '#2a2c2e', foliage: '#c0508a' },
  weathered: { frame: '#8c8a80', tray: '#d4cfbf', pots: '#4a4a46', foliage: '#86a35a' },
});

const p = assembly("ebb-flow-grow-table");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).translate(x, y, z);

const L = 2400, W = 1200; // tray length (X) and width (Y)
const ZR = 700; // roller tube centre
const ZT = ZR + 40; // tray underside
const TD = 90; // tray depth

// Bench frame: three leg pairs on foot plates, side rails and cross members.
for (const x of [-1000, 0, 1000]) {
  for (const y of [-450, 450]) {
    add(`leg-${x}-${y}`, blk(x, y, 20, 50, 50, ZR - 60).color(frame));
    add(`foot-${x}-${y}`, blk(x, y, 0, 120, 120, 20).color('#6b7174'));
  }
  add(`cross-${x}`, blk(x, 0, ZR - 80, 50, 950, 40).color(frame));
  add(`brace-${x}`, box(30, 860, 30, true).rotateX(-28).translate(x, 0, 380).color(frame));
}
for (const y of [-450, 450]) add(`side-rail-${y}`, blk(0, y, ZR - 80, 2120, 50, 40).color(frame));
add("lower-rail", blk(0, 450, 180, 2050, 40, 40).color(frame));

// Roller tubes running the length of the bench, with the tray resting on them.
for (const y of [-380, 380]) {
  add(`roller-tube-${y}`, cylX(-L / 2 + 60, y, ZR, L - 120, 30, 14).color('#c9cfd1'));
  for (const x of [-1000, 0, 1000]) add(`roller-saddle-${x}-${y}`, blk(x, y, ZR - 40, 70, 70, 14).color('#6b7174'));
}
add("anti-tip-hook", blk(-1000, -470, ZR - 40, 40, 40, 120).color('#6b7174'));

// Flood tray: open moulded tub with a rolled lip and a channelled floor.
add("tray-shell", blk(0, 0, ZT, L, W, TD).subtract(blk(0, 0, ZT + 14, L - 40, W - 40, TD)).color(tray));
add("tray-lip", blk(0, 0, ZT + TD - 6, L + 40, W + 40, 18).subtract(blk(0, 0, ZT + TD - 20, L - 40, W - 40, 50)).color(tray));
for (let i = 0; i < 9; i++) add(`floor-rib-x-${i}`, blk(0, -W / 2 + 120 + i * 120, ZT + 14, L - 60, 40, 16).color(tray));
add("centre-channel", blk(0, 0, ZT + 14, 60, W - 60, 6).color('#c8c6bc'));
for (let i = 0; i < 4; i++) add(`lip-rib-${i}`, blk(-900 + i * 600, -W / 2 - 14, ZT + 10, 30, 30, TD - 10).color(tray));

// Corner flood/drain fitting with overflow standpipe, return pipe and pump feed.
const FX = -L / 2 + 160, FY = -W / 2 + 150;
add("fitting-flange", cylZ(FX, FY, ZT + 14, 8, 70, 14).color('#3d4245'));
add("overflow-standpipe", cylZ(FX, FY, ZT + 14, 75, 22, 12).color('#e0e2dc'));
add("standpipe-screen", cylZ(FX, FY, ZT + 22, 30, 42, 12).color('#3d4245'));
add("fill-drain-fitting", cylZ(FX + 150, FY, ZT + 14, 10, 50, 12).color('#3d4245'));
add("return-pipe", cylZ(FX, FY, 470, ZT - 470, 25).color('#e0e2dc'));
add("feed-pipe", cylZ(FX + 150, FY, 470, ZT - 470, 20).color('#2f6fa8'));
add("drain-elbow", cylX(FX - 25, FY, 470, 175, 25).color('#e0e2dc'));

// Reservoir under the bench: lidded tank with a submersible pump lead and float.
add("reservoir", blk(-700, -60, 30, 800, 700, 420).color('#30373b'));
add("reservoir-lid", blk(-700, -60, 450, 830, 730, 22).color('#3e464a'));
add("reservoir-rib", blk(-700, -415, 120, 760, 14, 40).color('#3e464a'));
add("reservoir-level-tube", blk(-1000, -418, 80, 24, 12, 330).color('#7fb7c8'));
add("pump-timer", blk(-400, -455, 520, 140, 50, 180).color('#d8d8d0'));
add("timer-dial", cylinder(12, 45, 14).rotateX(90).translate(-400, -480, 640).color('#2f6fa8'));
add("pump-lead", blk(-400, -455, 470, 14, 14, 50).color('#1d2023'));

// Crop on the channel grid.
if (crop.value === 'potted') {
  const cols = 10, rows = 5, px = 220, py = 210;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = (i - (cols - 1) / 2) * px, y = (j - (rows - 1) / 2) * py;
      if (Math.abs(x - FX) < 200 && Math.abs(y - FY) < 160) continue;
      const k = i * rows + j;
      add(`pot-${i}-${j}`, blk(x, y, ZT + 30, 130, 130, 120).color(pots));
      const r = 80 + ((i * 7 + j * 3) % 4) * 8;
      add(`plant-${i}-${j}`, sphere(r).scale([1, 1, 0.8]).translate(x, y, ZT + 150 + r * 0.5).color(foliage));
      if (k % 4 === 0) add(`bloom-${i}-${j}`, cylZ(x + 15, y - 20, ZT + 150 + r * 1.1, 20, 35, 8).color('#e8d85a'));
    }
  }
} else if (crop.value === 'plug flats') {
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      const x = -810 + i * 540, y = -300 + j * 330;
      if (i === 0 && j === 0) continue;
      add(`flat-${i}-${j}`, blk(x, y, ZT + 30, 520, 280, 50).color(pots));
      add(`seedlings-${i}-${j}`, blk(x, y, ZT + 80, 480, 240, 40).color(foliage));
      for (let s = 0; s < 3; s++) add(`seedling-tuft-${i}-${j}-${s}`, blk(x - 160 + s * 160, y, ZT + 120, 120, 200, 25).color('#86c25a'));
    }
  }
}

return p.model();
