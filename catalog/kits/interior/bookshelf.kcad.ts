// Original kernelCAD low-poly bookshelf: open carcass with fixed shelves and
// optional rows of books as coloured blocks. Opens toward -Y.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0.

meta({
  name: 'bookshelf',
  license: 'CC0-1.0',
  title: 'Bookshelf',
  description: 'Open wooden bookcase with three to six shelves, optionally filled with books in two colours. Knobs: shelf count, books, wood and book colours.',
  tags: ['bookshelf', 'bookcase', 'shelf', 'shelving', 'books', 'storage', 'library'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'living-room', 'office', 'bedroom'],
  triangleBudget: 600,
});

const shelves = param('shelves', '5', { choices: ['3', '4', '5', '6'], label: 'Shelf levels' });
const books = param('books', 'some', { choices: ['none', 'some', 'full'], label: 'Books' });
const wood = param('wood', '#b98a5a', { label: 'Wood' });
const bookA = param('bookA', '#8d3b32', { label: 'Books A' });
const bookB = param('bookB', '#3c5a78', { label: 'Books B' });

presets({
  walnut: { wood: '#5f3f2a', bookA: '#c9a24a', bookB: '#2f5a46' },
  white: { wood: '#efeee9', bookA: '#d06b45', bookB: '#4a6c8c' },
});

const n = Number(shelves.value);
const W = 800;
const D = 300;
const t = 18;
const bay = 360; // clear height per level
const H = 60 + n * (bay + t) + t;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const shelf = assembly('bookshelf');
shelf.part('side-left', blk(-W / 2, -D / 2, 0, -W / 2 + t, D / 2, H).color(wood));
shelf.part('side-right', blk(W / 2 - t, -D / 2, 0, W / 2, D / 2, H).color(wood));
shelf.part('top', blk(-W / 2 + t - 1, -D / 2, H - t, W / 2 - t + 1, D / 2, H).color(wood));
shelf.part('plinth', blk(-W / 2 + t - 1, -D / 2 + 20, 0, W / 2 - t + 1, -D / 2 + 38, 60).color(wood));
shelf.part('back', blk(-W / 2 + t - 1, D / 2 - 6, 0, W / 2 - t + 1, D / 2, H).color(wood));

// Deterministic pseudo-random book sizes so every build is identical.
let seed = 7;
const rnd = () => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};

const fill = books.value === 'full' ? 0.92 : 0.5;
for (let i = 0; i < n; i++) {
  const z = 60 + i * (bay + t);
  shelf.part(`shelf-${i + 1}`, blk(-W / 2 + t - 1, -D / 2, z, W / 2 - t + 1, D / 2 - 5, z + t).color(wood));
  if (books.value === 'none') continue;
  // Books stand in runs of a few spines each; one block per run keeps triangles low.
  let x = -W / 2 + t + 10 + (i % 2 === 0 ? 0 : 120);
  const xEnd = -W / 2 + t + (W - 2 * t) * fill + (i % 2 === 0 ? 0 : 120);
  let k = 0;
  while (k < 5 && x < Math.min(xEnd, W / 2 - t - 30)) {
    const w = 80 + Math.round(rnd() * 80);
    const h = bay * (0.62 + rnd() * 0.3);
    const dd = 190 + Math.round(rnd() * 60);
    const x1 = Math.min(x + w, W / 2 - t - 2);
    shelf.part(`books-${i + 1}-${k + 1}`, blk(x, D / 2 - 8 - dd, z + t - 1, x1, D / 2 - 8, z + t + h).color(k % 2 === 0 ? bookA : bookB));
    x = x1 + 2;
    k++;
  }
}

return shelf.model();
