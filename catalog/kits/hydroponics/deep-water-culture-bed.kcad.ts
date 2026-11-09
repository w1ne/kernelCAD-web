// SPDX-License-Identifier: CC0-1.0
// Deep-water culture bed: the raft pond where leafy greens float on
// polystyrene boards with their roots hanging in a 300 mm deep, constantly
// aerated nutrient bath.
// What makes it a DWC bed: a timber-framed trough on low trestles, lined with
// black pond liner that laps over the top rail, three white raft boards
// drilled on a grid with net pots, lettuce heads growing out of most holes
// (some freshly harvested and empty, showing the water underneath), an air
// manifold along the front feeding airstone drops, a nutrient inlet at one
// end and a drain standpipe with an overflow elbow at the other.
// Generic visualization geometry at about real size (2.6 m long, 1.3 m wide,
// 0.85 m high), millimetres, Z up, air manifold facing -Y.

meta({
  name: "deep-water-culture-bed",
  license: 'CC0-1.0',
  title: "Deep-water culture bed",
  description: "Deep-water culture raft bed at about real size: timber-framed trough on trestles with a black pond liner lapped over the rail, three drilled polystyrene raft boards with net pots and lettuce heads (some holes harvested and empty), front air manifold with airstone drops, nutrient inlet and drain standpipe. Material controls: trough frame, liner, raft boards and crop foliage, plus a crop stage choice. greenLettuce, redOakLeaf, basil and weathered presets.",
  tags: ['deep water culture', 'dwc', 'raft bed', 'raft system', 'floating raft', 'lettuce', 'leafy greens', 'hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 6000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#a87a4c', { label: 'Trough frame and trestles (timber)' });
const liner = param('liner', '#26292b', { label: 'Pond liner (EPDM)' });
const raft = param('raft', '#ecebe4', { label: 'Raft boards (polystyrene)' });
const foliage = param('foliage', '#7fb24a', { label: 'Crop foliage' });
const stage = param('stage', 'mature', { choices: ['mature', 'seedling'], label: 'Crop stage' });

presets({
  greenLettuce: { frame: '#a87a4c', liner: '#26292b', raft: '#ecebe4', foliage: '#7fb24a' },
  redOakLeaf: { frame: '#a87a4c', liner: '#26292b', raft: '#ecebe4', foliage: '#8a3b46' },
  basil: { frame: '#6f7478', liner: '#1f3a5a', raft: '#f2f2ec', foliage: '#3f8a34' },
  weathered: { frame: '#7d6a55', liner: '#3a3d3e', raft: '#cfccbf', foliage: '#93a65a' },
});

const p = assembly("deep-water-culture-bed");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).translate(x, y, z);

const L = 2600, W = 1300, ZB = 330, TH = 450; // trough length, width, base height, wall height
const ZT = ZB + TH; // rim height
const ZW = ZT - 110; // water / raft underside

// Trestles carrying the trough.
for (const x of [-1000, 0, 1000]) {
  for (const s of [-1, 1]) add(`trestle-leg-${x}-${s > 0 ? 'b' : 'f'}`, blk(x, s * (W / 2 - 80), 0, 90, 90, ZB).color(frame));
  add(`trestle-beam-${x}`, blk(x, 0, ZB - 120, 100, W - 60, 120).color(frame));
  add(`trestle-brace-${x}`, box(40, 1100, 40, true).rotateX(16).translate(x, 0, ZB / 2 + 40).color(frame));
}

// Timber walls lined with pond liner (open trough you can see into).
add("trough-floor", blk(0, 0, ZB, L, W, 30).color(frame));
add("trough-walls", blk(0, 0, ZB, L, W, TH).subtract(blk(0, 0, ZB + 30, L - 90, W - 90, TH)).color(frame));
for (const x of [-L / 2 + 20, -L / 4, 0, L / 4, L / 2 - 20]) add(`wall-cleat-${Math.round(x)}`, blk(x, -W / 2 - 18, ZB, 60, 36, TH).color(frame));
add("top-rail", blk(0, 0, ZT, L + 80, W + 80, 40).subtract(blk(0, 0, ZT - 10, L - 90, W - 90, 60)).color(frame));
add("liner", blk(0, 0, ZB + 30, L - 90, W - 90, TH + 14).subtract(blk(0, 0, ZB + 40, L - 110, W - 110, TH + 20)).color(liner));
add("liner-lap", blk(0, 0, ZT + 40, L + 20, W + 20, 6).subtract(blk(0, 0, ZT + 30, L - 110, W - 110, 30)).color(liner));
add("water", blk(0, 0, ZB + 40, L - 110, W - 110, ZW - ZB - 40).color('#2f5b52'));

// Three raft boards with a planting grid; a few holes left empty after harvest.
const cols = 4, rows = 4, pitchX = 200, pitchY = 270;
const empty = new Set(['0-1-3', '1-2-0', '2-0-2']);
const boardL = (L - 130) / 3;
for (let bIx = 0; bIx < 3; bIx++) {
  const bx = -L / 2 + 65 + boardL * (bIx + 0.5);
  let board = blk(bx, 0, ZW, boardL - 14, W - 130, 50);
  const holes: [number, number, boolean][] = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const hx = bx + (i - (cols - 1) / 2) * pitchX;
      const hy = (j - (rows - 1) / 2) * pitchY;
      const isEmpty = empty.has(`${bIx}-${i}-${j}`);
      holes.push([hx, hy, isEmpty]);
      if (isEmpty) board = board.subtract(cylZ(hx, hy, ZW - 10, 80, 40, 10));
    }
  }
  add(`raft-${bIx}`, board.color(raft));
  holes.forEach(([hx, hy, isEmpty], k) => {
    if (isEmpty) return;
    add(`pot-${bIx}-${k}`, cylZ(hx, hy, ZW + 50, 10, 44, 10).color('#1d2023'));
    if (stage.value === 'mature') {
      add(`head-${bIx}-${k}`, sphere(95).scale([1, 1, 0.62]).translate(hx, hy, ZW + 95).color(foliage));
      if (k % 3 === 0) add(`heart-${bIx}-${k}`, cylZ(hx + 10, hy - 12, ZW + 125, 25, 45, 8).color('#b6d36a'));
    } else {
      add(`seedling-${bIx}-${k}`, sphere(34).scale([1, 1, 0.7]).translate(hx, hy, ZW + 78).color(foliage));
    }
  });
}

// Air manifold along the front rail with drops to the airstones.
const AY = -W / 2 - 70, AZ = ZT + 20;
add("air-manifold", cylX(-L / 2 + 100, AY, AZ, L - 200, 22).color('#e0e2dc'));
add("air-inlet", cylZ(-L / 2 + 100, AY, ZB - 40, AZ - ZB + 40, 22).color('#e0e2dc'));
add("air-inlet-cap", blk(-L / 2 + 100, AY, ZB - 70, 80, 80, 40).color('#2f6fa8'));
for (let i = 0; i < 6; i++) {
  const x = -L / 2 + 300 + i * 400;
  add(`air-valve-${i}`, blk(x, AY, AZ - 20, 40, 40, 40).color('#2f6fa8'));
  add(`air-drop-${i}`, box(10, 10, 90, true).rotateX(-40).translate(x, AY + 30, AZ + 30).color('#e0e2dc'));
}

// Nutrient inlet on the -X end, drain standpipe and overflow on the +X end.
add("inlet-pipe", cylX(-L / 2 - 260, -200, ZT - 60, 260, 32).color('#5f6a72'));
add("inlet-riser", cylZ(-L / 2 - 260, -200, 0, ZT - 30, 32).color('#5f6a72'));
add("inlet-valve", cylZ(-L / 2 - 260, -200, ZT - 260, 70, 50).color('#c0392b'));
add("drain-pipe", cylX(L / 2, 300, ZB + 60, 280, 40).color('#5f6a72'));
add("drain-elbow", cylZ(L / 2 + 280, 300, 40, ZB + 60, 40).color('#5f6a72'));
add("drain-sump", blk(L / 2 + 280, 300, 0, 200, 200, 40).color('#4a4f53'));
add("standpipe-cap", cylZ(L / 2 - 200, 300, ZW - 20, 120, 50).color('#e0e2dc'));

return p.model();
