// SPDX-License-Identifier: CC0-1.0
// Propagation plug tray: the standard "1020" seed-starting set, a ribbed
// carry tray holding a thin plug insert of square tapered cells, each filled
// with substrate and growing one seedling.
// What makes it a plug tray: the grid of open square cells with thin walls
// (72 or 128 of them), the solid outer carry tray with a flared rim and
// moulded carry handles at the ends, substrate showing in every cell, and
// seedlings at a chosen stage: just sown, cotyledons open, or ready to
// transplant with true leaves. A plant label stands in one corner cell.
// Generic visualization geometry at real size (545 x 280 mm, 60 mm deep),
// millimetres, Z up, long side toward -Y.

meta({
  name: "propagation-plug-tray",
  license: 'CC0-1.0',
  title: "Propagation plug tray",
  description: "1020-size seed-starting set at real size: ribbed carry tray with flared rim and end handles, thin plug insert with 72 or 128 square cells filled with substrate, a plant label and seedlings at a chosen stage (sown, cotyledons or transplant-ready). Material controls: carry tray, plug insert, substrate and seedling foliage, plus cell count and growth stage choices. classicBlack, whiteNursery, lettuce and weathered presets.",
  tags: ['plug tray', 'seed tray', 'cell tray', '1020 tray', 'seedling tray', 'propagation', 'seedlings', 'germination', 'hydroponics', 'greenhouse', 'nursery', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 10000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const carry = param('carry', '#222426', { label: 'Carry tray (polystyrene)' });
const insert = param('insert', '#33373a', { label: 'Plug insert (polystyrene)' });
const substrate = param('substrate', '#5a3f2a', { label: 'Substrate (peat / coir)' });
const foliage = param('foliage', '#7cc04f', { label: 'Seedling foliage' });
const cells = param('cells', '72', { choices: ['72', '128'], label: 'Cells per tray' });
const stage = param('stage', 'cotyledons', { choices: ['sown', 'cotyledons', 'transplant'], label: 'Growth stage' });

presets({
  classicBlack: { carry: '#222426', insert: '#33373a', substrate: '#5a3f2a', foliage: '#7cc04f' },
  whiteNursery: { carry: '#e6e6e0', insert: '#f2f2ee', substrate: '#6b4a30', foliage: '#6db544' },
  lettuce: { carry: '#222426', insert: '#33373a', substrate: '#8a6848', foliage: '#a9c94e' },
  weathered: { carry: '#4a4a46', insert: '#5a5a54', substrate: '#7a6650', foliage: '#93a65a' },
});

const p = assembly("propagation-plug-tray");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).translate(x, y, z);

const L = 545, W = 280, H = 62;

// Carry tray: open tub with a flared rim, floor ribs and end carry handles.
add("carry-tray", blk(0, 0, 0, L - 10, W - 10, H).subtract(blk(0, 0, 4, L - 18, W - 18, H)).color(carry));
add("carry-rim", blk(0, 0, H - 4, L + 6, W + 6, 6).subtract(blk(0, 0, H - 10, L - 18, W - 18, 20)).color(carry));
for (let i = 0; i < 6; i++) add(`side-rib-${i}`, blk(-225 + i * 90, -W / 2 + 4, 6, 14, 6, H - 12).color(carry));
for (const s of [-1, 1]) {
  add(`handle-${s > 0 ? 'r' : 'l'}`, blk(s * (L / 2 + 10), 0, H - 22, 26, 140, 22).subtract(blk(s * (L / 2 + 14), 0, H - 30, 12, 100, 40)).color(carry));
}

// Plug insert: thin sheet with a grid of open square cells.
const [nx, ny] = cells.value === '128' ? [16, 8] : [12, 6];
const IL = 520, IW = 258, IZ = 10, IH = H - 4 - IZ;
const px = IL / nx, py = IW / ny, wall = 3;
const centres: [number, number][] = [];
for (let i = 0; i < nx; i++) {
  for (let j = 0; j < ny; j++) centres.push([-IL / 2 + px * (i + 0.5), -IW / 2 + py * (j + 0.5)]);
}
// Cell walls as one grid of thin webs; the substrate shows between them.
add("insert-floor", blk(0, 0, IZ, IL, IW, 3).color(insert));
for (let i = 0; i <= nx; i++) add(`cell-web-x-${i}`, blk(-IL / 2 + i * px, 0, IZ, wall, IW, IH).color(insert));
for (let j = 0; j <= ny; j++) add(`cell-web-y-${j}`, blk(0, -IW / 2 + j * py, IZ, IL, wall, IH).color(insert));
add("insert-lip", blk(0, 0, IZ + IH - 2, IL + 8, IW + 8, 3).subtract(blk(0, 0, IZ + IH - 10, IL - 2, IW - 2, 20)).color(insert));
add("substrate-fill", blk(0, 0, IZ + 8, IL - 4, IW - 4, IH - 14).color(substrate));

// Plant label in the front-left corner cell.
const [lx, ly] = centres[0];
add("plant-label", box(16, 2, 70, true).translate(lx, ly, IZ + IH + 25).color('#f2f0e6'));
add("label-print", box(12, 1, 20, true).translate(lx, ly - 1.5, IZ + IH + 40).color('#2f6fa8'));

// Seedlings, one per cell (the label cell excepted).
const top = IZ + IH - 6;
centres.forEach(([x, y], k) => {
  if (k === 0) return;
  const turn = (k * 47) % 180;
  if (stage.value === 'sown') {
    if (k % 3 === 0) add(`sprout-${k}`, cylZ(x, y, top, 6, 3, 5).color('#d8e6a0'));
    return;
  }
  const tall = stage.value === 'transplant' ? 55 : 28;
  add(`stem-${k}`, cylZ(x, y, top, tall, 1.6, 4).color('#a8c878'));
  const leaf = stage.value === 'transplant' ? Math.min(px, py) * 0.62 : Math.min(px, py) * 0.42;
  add(`cotyledons-${k}`, box(leaf * 2, leaf * 0.55, 2, true).rotateZ(turn).translate(x, y, top + tall).color(foliage));
  if (stage.value === 'transplant') {
    add(`true-leaves-${k}`, box(leaf * 1.5, leaf * 0.7, 3, true).rotateZ(turn + 90).translate(x, y, top + tall + 8).color(foliage));
  }
});

return p.model();
