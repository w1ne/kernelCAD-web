// Original kernelCAD low-poly shipping pallet (EUR size, 1200 x 800 mm):
// top deck boards on three stringer boards over nine blocks and three
// bottom boards, optionally loaded with stacked cardboard boxes.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, long side along X.

meta({
  name: 'pallet',
  license: 'CC0-1.0',
  title: 'Pallet',
  description: 'Wooden EUR shipping pallet with deck boards and blocks, empty or loaded with stacked cardboard boxes. Knobs: load, wood, block and box colours.',
  tags: ['pallet', 'skid', 'euro pallet', 'shipping', 'cargo', 'boxes', 'warehouse', 'logistics'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'outdoor', 'warehouse', 'industrial', 'harbour', 'street'],
  triangleBudget: 420,
});

const load = param('load', 'none', { choices: ['none', 'boxes', 'tall'], label: 'Load' });
const wood = param('wood', '#d4b07a', { label: 'Boards' });
const blocks = param('blocks', '#b08a56', { label: 'Blocks' });
const boxes = param('boxes', '#c49563', { label: 'Boxes' });

presets({
  painted: { wood: '#3f6fa6', blocks: '#2f5585' },
  old: { wood: '#9a8b72', blocks: '#7a6c56' },
});

const L = 1200;
const W = 800;
const bh = 22; // board thickness
const blkH = 78;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const p = assembly('pallet');
const ys = [-W / 2, -50, W / 2 - 100];
// Bottom runners along X.
ys.forEach((y, i) => p.part(`runner-${i + 1}`, blk(-L / 2, y, 0, L / 2, y + 100, bh).color(wood)));
// Nine blocks.
let k = 0;
for (const x of [-L / 2, -72.5, L / 2 - 145]) {
  for (const y of ys) {
    k++;
    p.part(`block-${k}`, blk(x, y, bh, x + 145, y + 100, bh + blkH).color(blocks));
  }
}
// Stringer boards across Y on top of the blocks.
for (const [i, x] of [-L / 2, -72.5, L / 2 - 145].entries()) {
  p.part(`stringer-${i + 1}`, blk(x, -W / 2, bh + blkH, x + 145, W / 2, 2 * bh + blkH).color(wood));
}
// Five top deck boards along X with gaps.
const deckZ = 2 * bh + blkH;
const boardW = [145, 100, 145, 100, 145];
const gap = (W - boardW.reduce((a, b) => a + b, 0)) / 4;
let y = -W / 2;
boardW.forEach((bw, i) => {
  p.part(`deck-${i + 1}`, blk(-L / 2, y, deckZ, L / 2, y + bw, deckZ + bh).color(wood));
  y += bw + gap;
});

if (load.value !== 'none') {
  const top = deckZ + bh;
  const layers = load.value === 'tall' ? 3 : 2;
  const bx = 580;
  const by = 390;
  const bz = 300;
  let n = 0;
  for (let l = 0; l < layers; l++) {
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        n++;
        // Slight per-box jitter so the stack is not perfectly regular.
        const j = 8 * Math.sin(n * 2.3);
        p.part(`box-${n}`, box(bx - 10, by - 10, bz, true)
          .translate(sx * bx / 2 + j, sy * by / 2 - j, top + bz / 2 + l * bz).color(boxes));
      }
    }
  }
}

return p.model();
