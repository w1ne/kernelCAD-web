// Original kernelCAD low-poly stone floor tile: a 2 m x 2 m slab of chamfered
// flagstones set in mortar over a dirt base. Each stone is a ruled loft from
// its footprint to a slightly smaller, jittered top so the floor reads as
// hand-laid paving. Edges sit at the 0.2 m tile height of the nature tiles.

meta({
  name: 'stone-floor-tile',
  license: 'CC0-1.0',
  title: 'Stone floor tile',
  description: 'Square 2 m paving tile of chamfered two-tone flagstones in mortar, laid in a grid or running bond. Knobs: stones per row, pattern, stone, accent stone, mortar and dirt colours.',
  tags: ['tile', 'floor', 'paving', 'flagstone', 'stone', 'courtyard', 'dungeon', 'terrain', 'grid'],
  kit: 'terrain',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'town', 'dungeon', 'castle'],
  triangleBudget: 500,
});

const count = param('count', '3', { choices: ['2', '3', '4'], label: 'Stones per row' });
const pattern = param('pattern', 'running', { choices: ['grid', 'running'], label: 'Pattern' });
const stone = param('stone', '#9b968c', { label: 'Stone' });
const stone2 = param('stone2', '#86827a', { label: 'Stone accent' });
const mortar = param('mortar', '#6b665e', { label: 'Mortar' });
const dirt = param('dirt', '#7a5636', { label: 'Dirt edge' });

presets({
  sandstone: { stone: '#d2b483', stone2: '#c09c6a', mortar: '#9a7f58' },
  dungeon: { stone: '#5f6166', stone2: '#4e5054', mortar: '#3a3b3f', dirt: '#3f3a35' },
  marble: { stone: '#e6e3dc', stone2: '#cfcac0', mortar: '#a9a59c' },
});

const S = 2000;
const h = S / 2;
const t = 200;
const skirtH = t * 0.7;
const n = Number(count.value);
const gap = 40;
const cell = S / n;

// Rectangle ring as a closed path.
const rect = (x0: number, y0: number, x1: number, y1: number) =>
  path().moveTo(x0, y0).lineTo(x1, y0).lineTo(x1, y1).lineTo(x0, y1).close();

const tile = assembly('stone-floor-tile');
tile.part('dirt', box(S, S, skirtH, true).translate(0, 0, skirtH / 2).color(dirt));
tile.part('mortar', box(S, S, t - 30 - skirtH + 5, true).translate(0, 0, (skirtH - 5 + t - 30) / 2).color(mortar));

const jit = (k: number) => Math.sin(k * 12.9898) * 0.5 + 0.5;
let k = 0;
for (let row = 0; row < n; row++) {
  const y0 = -h + row * cell;
  const shift = pattern.value === 'running' && row % 2 === 1 ? cell / 2 : 0;
  // Stone x-extents for this row: a running row has two half stones at the ends.
  const xs: [number, number][] = [];
  if (shift === 0) {
    for (let c = 0; c < n; c++) xs.push([-h + c * cell, -h + (c + 1) * cell]);
  } else {
    xs.push([-h, -h + shift]);
    for (let c = 0; c < n - 1; c++) xs.push([-h + shift + c * cell, -h + shift + (c + 1) * cell]);
    xs.push([h - shift, h]);
  }
  for (const [xa, xb] of xs) {
    k++;
    const x0 = xa === -h ? xa : xa + gap / 2;
    const x1 = xb === h ? xb : xb - gap / 2;
    const ya = row === 0 ? y0 : y0 + gap / 2;
    const yb = row === n - 1 ? y0 + cell : y0 + cell - gap / 2;
    const ch = 28 + 14 * jit(k);
    const top = t - 12 * jit(k + 50);
    const slab = rect(x0, ya, x1, yb).loft(rect(x0 + ch, ya + ch, x1 - ch, yb - ch), {
      planes: [
        { plane: 'XY', origin: [0, 0, t - 50] },
        { plane: 'XY', origin: [0, 0, top] },
      ],
      ruled: true,
    });
    tile.part(`stone-${k}`, slab.color(k % 3 === 0 ? stone2 : stone));
  }
}

return tile.model();
