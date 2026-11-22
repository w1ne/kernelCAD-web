// SPDX-License-Identifier: CC0-1.0
// Wooden pallet: the 1200 x 800 mm Euro pallet that every delivery arrives
// on. What makes it a pallet rather than a crate: five chamfered top deck
// boards in the 145/100 mm wide pattern, three cross stringer boards, nine
// blocks with branded stamps on the corner blocks, three bottom boards, the
// open four-way fork entries between the blocks, and visible nail heads.
// Optional stack of taped cartons on the deck. Generic visualization
// geometry at real size (144 mm tall), millimetres, Z up, long side toward
// -Y, base on z = 0.

meta({
  name: "wooden-pallet",
  license: 'CC0-1.0',
  title: "Wooden pallet",
  description: "1200 x 800 mm Euro pallet at real size: five chamfered top deck boards in the 145/100 mm wide pattern, three cross stringer boards, nine blocks with branded stamps on the corner blocks, three bottom boards, open four-way fork entries and nail heads. Optional stack of taped cartons. Material controls: deck boards, blocks, stamps, nail heads. freshPine, weathered and poolBlue presets; load choice.",
  tags: ['pallet', 'euro pallet', 'wooden pallet', 'epal', 'skid', 'logistics', 'retail', 'grocery', 'shop', 'warehouse', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'warehouse', 'scene'],
  triangleBudget: 2500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const boards = param('boards', '#d8b47a', { label: 'Deck boards' });
const blocks = param('blocks', '#c9a46a', { label: 'Blocks' });
const stamp = param('stamp', '#3a2a1e', { label: 'Branded stamps' });
const nails = param('nails', '#7d858a', { label: 'Nail heads' });
const load = param('load', 'empty', { choices: ['empty', 'cartons'], label: 'Load' });

presets({
  freshPine: { boards: '#d8b47a', blocks: '#c9a46a', stamp: '#3a2a1e', nails: '#7d858a' },
  weathered: { boards: '#9a9184', blocks: '#857c70', stamp: '#3d3832', nails: '#5d4a3a' },
  poolBlue: { boards: '#2f5fa8', blocks: '#2a5596', stamp: '#f4f1e8', nails: '#c9ced2' },
});

const p = assembly("wooden-pallet");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// Extrude a (y, z) section along X, centred on x = 0.
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
// A board running along X with chamfered top edges.
const board = (len: number, y: number, w: number, z: number, ch = 5) => profileYZ([
  [y - w / 2, z], [y + w / 2, z], [y + w / 2, z + 22 - ch], [y + w / 2 - ch, z + 22], [y - w / 2 + ch, z + 22], [y - w / 2, z + 22 - ch],
], len);

const BX = [-527.5, 0, 527.5];
const BY = [-327.5, 0, 327.5];
const tag = (v: number, lo: string, hi: string) => (v < 0 ? lo : v > 0 ? hi : 'm');

// Bottom boards along X: 100 / 145 / 100.
[[-350, 100], [0, 145], [350, 100]].forEach(([y, w], i) => add(`bottom-board-${i}`, board(1200, y, w, 0).color(boards)));
// Nine blocks; the centre row is 145 mm deep, the edge rows 100 mm.
for (const x of BX) {
  for (const y of BY) {
    const d = y === 0 ? 145 : 100;
    const yy = y === 0 ? 0 : Math.sign(y) * 350;
    add(`block-${tag(x, 'l', 'r')}${tag(y, 'f', 'b')}`, blk(x, yy, 22, 145, d, 78).color(blocks));
  }
}
// Stringer boards across Y on top of the blocks.
for (const x of BX) add(`stringer-${tag(x, 'l', 'r')}`, blk(x, 0, 100, 145, 800, 22).color(boards));
// Top deck boards along X: 145 / 100 / 145 / 100 / 145.
[[-327.5, 145], [-163.75, 100], [0, 145], [163.75, 100], [327.5, 145]].forEach(([y, w], i) => add(`top-board-${i}`, board(1200, y, w, 122).color(boards)));

// Branded stamps on the outside faces of the corner and middle blocks.
for (const x of BX) {
  add(`stamp-front-${tag(x, 'l', 'r')}`, blk(x, -401, 38, 110, 3, 46).color(stamp));
  add(`stamp-front-mark-${tag(x, 'l', 'r')}`, blk(x - 30, -402, 46, 20, 3, 30).color(blocks));
}
for (const y of [-350, 0, 350]) {
  add(`stamp-end-${tag(y, 'f', 'b')}`, blk(-601, y, 38, 3, y === 0 ? 110 : 70, 46).color(stamp));
}

// Nail heads: three per board crossing over each stringer.
let n = 0;
for (const x of BX) {
  for (const y of [-327.5, -163.75, 0, 163.75, 327.5]) {
    for (const dx of [-45, 45]) add(`nail-${n++}`, cylinder(1.5, 6, 6).translate(x + dx, y, 144).color(nails));
  }
}

// Optional load: a 2 x 2 x 2 stack of taped cartons.
if (load.value === 'cartons') {
  const card = '#b8875a';
  const tape = '#d9c49a';
  let k = 0;
  for (let layer = 0; layer < 2; layer++) {
    for (const x of [-295, 295]) {
      for (const y of [-195, 195]) {
        const z = 144 + layer * 360;
        add(`carton-${k}`, blk(x, y, z, 580, 380, 356).color(k % 3 === 1 ? '#a87a50' : card));
        add(`carton-tape-${k}`, blk(x, y, z + 355, 580, 70, 3).color(tape));
        add(`carton-label-${k++}`, blk(x - 150, y - 191, z + 200, 140, 3, 90).color('#f4f1e8'));
      }
    }
  }
}

return p.model();
