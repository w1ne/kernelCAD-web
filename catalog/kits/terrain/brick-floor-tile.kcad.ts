// Original kernelCAD low-poly brick floor tile: a 2 m x 2 m paving of bricks
// on edge in a basketweave or herringbone-like running bond, over a mortar
// bed and dirt base. Every brick is a separate box with a slightly uneven
// top so the floor reads as hand-laid. Edges sit at the 0.2 m tile height.

meta({
  name: 'brick-floor-tile',
  license: 'CC0-1.0',
  title: 'Brick floor tile',
  description: 'Square 2 m brick paving tile in a basketweave or running bond with two-tone bricks over mortar. Knobs: pattern, brick, accent brick, mortar and dirt colours.',
  tags: ['tile', 'floor', 'brick', 'paving', 'patio', 'plaza', 'courtyard', 'street', 'terrain', 'grid'],
  kit: 'terrain',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'town', 'village', 'garden'],
  triangleBudget: 800,
});

const pattern = param('pattern', 'basketweave', { choices: ['basketweave', 'running'], label: 'Pattern' });
const brick = param('brick', '#b0573a', { label: 'Bricks' });
const brick2 = param('brick2', '#97472f', { label: 'Accent bricks' });
const mortar = param('mortar', '#9a8f80', { label: 'Mortar' });
const dirt = param('dirt', '#7a5636', { label: 'Dirt edge' });

presets({
  yellow: { brick: '#d2b06a', brick2: '#b8954f' },
  grey: { brick: '#8a8784', brick2: '#74716e', mortar: '#5a5754' },
  old: { brick: '#8f4a36', brick2: '#6f3a2a', mortar: '#7a7064' },
});

const S = 2000;
const h = S / 2;
const t = 200;
const skirtH = t * 0.7;
const g = 14;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const tile = assembly('brick-floor-tile');
tile.part('dirt', blk(-h, -h, 0, h, h, skirtH).color(dirt));
tile.part('mortar', blk(-h + 1, -h + 1, skirtH - 5, h - 1, h - 1, t - 40).color(mortar));
let k = 0;
const brickAt = (x0: number, y0: number, x1: number, y1: number) => {
  k++;
  const top = t - 6 * (0.5 + 0.5 * Math.sin(k * 7.7));
  tile.part(`brick-${k}`, blk(x0 + (x0 <= -h ? 0 : g / 2), y0 + (y0 <= -h ? 0 : g / 2), t - 42, x1 - (x1 >= h ? 0 : g / 2), y1 - (y1 >= h ? 0 : g / 2), top)
    .color(k % 4 === 1 ? brick2 : brick));
};
if (pattern.value === 'basketweave') {
  // 5 x 5 squares of two bricks each, alternating direction.
  const n = 5;
  const c = S / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x0 = -h + i * c;
      const y0 = -h + j * c;
      if ((i + j) % 2 === 0) {
        brickAt(x0, y0, x0 + c / 2, y0 + c);
        brickAt(x0 + c / 2, y0, x0 + c, y0 + c);
      } else {
        brickAt(x0, y0, x0 + c, y0 + c / 2);
        brickAt(x0, y0 + c / 2, x0 + c, y0 + c);
      }
    }
  }
} else {
  // Running bond: 10 rows of 400 mm bricks, alternate rows offset half a brick.
  const rows = 10;
  const rl = S / rows;
  const bl = 400;
  for (let r = 0; r < rows; r++) {
    const y0 = -h + r * rl;
    const off = r % 2 === 1 ? bl / 2 : 0;
    const xs = [-h];
    for (let x = -h + (off || bl); x < h - 1; x += bl) xs.push(x);
    xs.push(h);
    for (let i = 0; i < xs.length - 1; i++) brickAt(xs[i], y0, xs[i + 1], y0 + rl);
  }
}

return tile.model();
