// Original kernelCAD low-poly crosswalk tile: a 4 m x 4 m two-lane road piece
// with zebra bars. Bars and asphalt are flush slabs tiled together (no
// decals). Road runs along Y; pedestrians cross along X.
// Millimetres, Z up, base on z = 0, top at 20 mm (matches road-tile).

meta({
  name: 'crosswalk-tile',
  license: 'CC0-1.0',
  title: 'Crosswalk tile',
  description: '4 m road tile with a zebra crosswalk and edge lines that matches road-tile. Knobs: bar count, asphalt, bar and edge-line colours.',
  tags: ['crosswalk', 'zebra', 'crossing', 'pedestrian', 'road', 'tile', 'street'],
  kit: 'city-street',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'street', 'grid-4m'],
  triangleBudget: 400,
});

const bars = param('bars', '6', { choices: ['5', '6', '7'], label: 'Zebra bars' });
const asphalt = param('asphalt', '#45484c', { label: 'Asphalt' });
const bar = param('bar', '#f2f1ea', { label: 'Zebra bars' });
const line = param('line', '#dcdbd2', { label: 'Edge lines' });

presets({
  worn: { asphalt: '#5a5c5f', bar: '#cfcdc4', line: '#c4c2ba' },
  painted: { asphalt: '#8a3a32', bar: '#f2f1ea' },
});

const S = 4000;
const T = 20;
const n = Number(bars.value);
const cw = assembly('crosswalk-tile');
let k = 0;
const slab = (x0: number, x1: number, y0: number, y1: number, c: typeof asphalt) => {
  k += 1;
  cw.part(`slab-${k}`, box(x1 - x0, y1 - y0, T, true).translate((x0 + x1) / 2, (y0 + y1) / 2, T / 2).color(c));
};

const h = S / 2;
const edge = 1700;
const lw = 100;
slab(-h, -edge - lw, -h, h, asphalt);
slab(edge + lw, h, -h, h, asphalt);
slab(-edge - lw, -edge, -h, h, line);
slab(edge, edge + lw, -h, h, line);
// Zebra band: bars along Y, n bars with equal gaps across the carriageway.
const yb = 1250; // half length of the bars
slab(-edge, edge, -h, -yb, asphalt);
slab(-edge, edge, yb, h, asphalt);
const unit = (2 * edge) / (2 * n + 1); // gap, bar, gap, bar, ..., gap
for (let i = 0; i < 2 * n + 1; i++) {
  const x0 = -edge + i * unit;
  slab(x0, x0 + unit, -yb, yb, i % 2 === 1 ? bar : asphalt);
}

return cw.model();
