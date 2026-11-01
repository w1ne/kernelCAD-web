// Original kernelCAD low-poly wall shelf: one to three wall-mounted boards on
// angle brackets or floating, optionally dressed with books, a vase and a
// small potted plant. Origin 'wall': the back sits on the y = 0 wall plane,
// shelves project toward -Y, centred on x = 0 with the middle shelf at z = 0.

meta({
  name: 'wall-shelf',
  license: 'CC0-1.0',
  title: 'Wall shelf',
  description: 'Wall-mounted shelf with one to three boards on brackets or floating, optionally dressed with books, a vase and a small plant. Knobs: boards, width, mounting, decor, board, bracket and decor colours.',
  tags: ['wall shelf', 'shelf', 'floating shelf', 'bracket shelf', 'shelving', 'books', 'decor'],
  kit: 'interior',
  category: 'attachment',
  origin: 'wall',
  compat: ['indoor', 'living-room', 'bedroom', 'office', 'kitchen'],
  triangleBudget: 600,
});

const boards = param('boards', '2', { choices: ['1', '2', '3'], label: 'Boards' });
const width = param('width', '900', { choices: ['600', '900', '1200'], label: 'Width (mm)' });
const mount = param('mount', 'brackets', { choices: ['brackets', 'floating'], label: 'Mounting' });
const decor = param('decor', 'yes', { choices: ['yes', 'no'], label: 'Decor' });
const board = param('board', '#b98a5a', { label: 'Boards' });
const bracket = param('bracket', '#2b2927', { label: 'Brackets' });
const itemsA = param('itemsA', '#3c5a78', { label: 'Decor A' });
const itemsB = param('itemsB', '#d9a441', { label: 'Decor B' });
const plant = param('plant', '#4f8a3a', { label: 'Plant' });

presets({
  white: { board: '#f2f1ec', bracket: '#c9ccd0', itemsA: '#c2553f', itemsB: '#5c8f6a' },
  rustic: { board: '#6b4a2f', bracket: '#2b2927', itemsA: '#8d3b32', itemsB: '#e3d6b8' },
});

const n = Number(boards.value);
const W = Number(width.value);
const D = 220;
const t = 25;
const pitch = 320;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
const ngon = (r: number, s: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < s; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / s), r * Math.sin((2 * Math.PI * k) / s));
  return p.close();
};

const sh = assembly('wall-shelf');
for (let i = 0; i < n; i++) {
  const z = (i - (n - 1) / 2) * pitch;
  sh.part(`board-${i + 1}`, blk(-W / 2, -D, z, W / 2, 0, z + t).color(board));
  if (mount.value === 'brackets') {
    for (const fx of [-0.32, 0.32]) {
      const x = W * fx;
      // L bracket: wall leg and arm under the board, with a diagonal brace.
      const prof = extrudePolygon([[0, -160], [12, -160], [12, -12], [D - 30, -12], [D - 30, 0], [0, 0]], 20)
        .translate(0, 0, -10).rotateX(90).rotateZ(-90);
      const brace = extrudePolygon([[10, -130], [22, -130], [D - 70, -10], [D - 82, -10]], 14).translate(0, 0, -7).rotateX(90).rotateZ(-90);
      sh.part(`bracket-${i + 1}-${fx < 0 ? 'l' : 'r'}`, prof.union(brace).translate(x, 0, z + 1).color(bracket));
    }
  }
  if (decor.value !== 'yes') continue;
  const zt = z + t - 1;
  // Books: a leaning run of spines in two colours.
  const bx0 = -W / 2 + 40 + (i % 2) * W * 0.35;
  for (let k = 0; k < 3; k++) {
    const bw = 40 + 10 * ((k + i) % 2);
    const bh = 190 + 25 * ((k * 2 + i) % 3);
    sh.part(`book-${i + 1}-${k + 1}`, blk(bx0 + k * 52, -D + 30, zt, bx0 + k * 52 + bw, -20, zt + bh).color(k % 2 === 0 ? itemsA : itemsB));
  }
  const ox = bx0 + 230 > W / 2 - 80 ? -W / 2 + 120 : bx0 + 230;
  if (i % 2 === 0) {
    // Vase: a faceted bottle.
    sh.part(`vase-${i + 1}`, ngon(40, 6).loft([ngon(60, 6), ngon(22, 6)], {
      planes: [
        { plane: 'XY', origin: [ox + 40, -D / 2, zt] },
        { plane: 'XY', origin: [ox + 40, -D / 2, zt + 90] },
        { plane: 'XY', origin: [ox + 40, -D / 2, zt + 200] },
      ],
      ruled: true,
    }).color(itemsB));
  } else {
    sh.part(`pot-${i + 1}`, ngon(45, 6).loft(ngon(60, 6), { spacing: 100, ruled: true }).translate(ox + 40, -D / 2, zt).color(itemsA));
    for (let k = 0; k < 4; k++) {
      const leaf = extrudePolygon([[0, 0], [30, 70], [0, 150], [-30, 70]], 8).translate(0, 0, -4).rotateX(90).rotateY(25).rotateZ(90 * k + 20);
      sh.part(`leaf-${i + 1}-${k + 1}`, leaf.translate(ox + 40, -D / 2, zt + 85).color(plant));
    }
  }
}

return sh.model();
