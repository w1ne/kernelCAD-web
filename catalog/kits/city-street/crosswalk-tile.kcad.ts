// A modular 4 m x 4 m two-lane road tile with transverse zebra bars and edge
// lines. The painted markings are flush slabs in the asphalt surface, so the
// crossing reads from above and the tile stays a simple, rectilinear ground
// piece. Road runs along Y; pedestrians cross along X.
// Millimetres, Z up, base on z = 0, top at 20 mm (matches road-tile).

meta({
  name: 'crosswalk-tile',
  license: 'CC0-1.0',
  title: 'Crosswalk tile',
  description: '4 m two-lane road tile with a transverse zebra crossing and edge lines, sized to join road-tile. Knobs: bar count, asphalt, stripe-paint and edge-paint colours.',
  tags: ['crosswalk', 'zebra', 'crossing', 'pedestrian', 'road', 'tile', 'street'],
  kit: 'city-street',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'street', 'grid-4m'],
  triangleBudget: 400,
});

const bars = param('bars', '6', { choices: ['5', '6', '7'], label: 'Zebra bars' });
const asphalt = param('asphalt', '#45484c', { label: 'Asphalt' });
const stripePaint = param('stripePaint', '#f2f1ea', { label: 'Crosswalk paint' });
const edgePaint = param('edgePaint', '#dcdbd2', { label: 'Edge-line paint' });

presets({
  worn: { asphalt: '#5a5c5f', stripePaint: '#cfcdc4', edgePaint: '#c4c2ba' },
  fresh: { asphalt: '#373b40', stripePaint: '#ffffff', edgePaint: '#e8e5dc' },
});

const S = 4000;
const T = 20;
const n = Number(bars.value);
const cw = assembly('crosswalk-tile');
let k = 0;
const slabShape = (x0: number, x1: number, y0: number, y1: number) =>
  box(x1 - x0, y1 - y0, T, true).translate((x0 + x1) / 2, (y0 + y1) / 2, T / 2);
const asphaltSlab = (x0: number, x1: number, y0: number, y1: number) => {
  k += 1;
  cw.part(`asphalt-${k}`, slabShape(x0, x1, y0, y1).color(asphalt));
};
const stripeSlab = (x0: number, x1: number, y0: number, y1: number) => {
  k += 1;
  cw.part(`crosswalk-paint-${k}`, slabShape(x0, x1, y0, y1).color(stripePaint));
};
const edgeSlab = (x0: number, x1: number, y0: number, y1: number) => {
  k += 1;
  cw.part(`edge-paint-${k}`, slabShape(x0, x1, y0, y1).color(edgePaint));
};

const h = S / 2;
const edge = 1700;
const lw = 100;
asphaltSlab(-h, -edge - lw, -h, h);
asphaltSlab(edge + lw, h, -h, h);
edgeSlab(-edge - lw, -edge, -h, h);
edgeSlab(edge, edge + lw, -h, h);
// Zebra band: bars along Y, n bars with equal gaps across the carriageway.
const yb = 1250; // half length of the bars
asphaltSlab(-edge, edge, -h, -yb);
asphaltSlab(-edge, edge, yb, h);
const unit = (2 * edge) / (2 * n + 1); // gap, bar, gap, bar, ..., gap
for (let i = 0; i < 2 * n + 1; i++) {
  const x0 = -edge + i * unit;
  if (i % 2 === 1) stripeSlab(x0, x0 + unit, -yb, yb);
  else asphaltSlab(x0, x0 + unit, -yb, yb);
}

return cw.model();
