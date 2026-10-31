// Original kernelCAD low-poly road tile: a 4 m x 4 m two-lane asphalt piece
// with painted markings. Markings are flush slabs tiled with the asphalt (no
// decals), so the tile stays flat and cheap. Road runs along Y.
// Millimetres, Z up, base on z = 0, top at 20 mm.

meta({
  name: 'road-tile',
  title: 'Road tile',
  description: '4 m two-lane asphalt road tile with edge lines and a dashed, solid or stop-line end marking. Knobs: style, asphalt, line and centre-line colours.',
  tags: ['road', 'tile', 'asphalt', 'lane', 'street', 'modular', 'ground'],
  kit: 'city-street',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'street', 'grid-4m'],
  triangleBudget: 300,
});

const style = param('style', 'straight', { choices: ['straight', 'end', 'plain'], label: 'Style' });
const asphalt = param('asphalt', '#45484c', { label: 'Asphalt' });
const line = param('line', '#ecebe4', { label: 'Edge lines' });
const centre = param('centre', '#f4f0dc', { label: 'Centre line' });

presets({
  american: { centre: '#f0c419' },
  worn: { asphalt: '#5a5c5f', line: '#c9c8c0', centre: '#c9c8c0' },
});

const S = 4000;
const T = 20;
const rt = assembly('road-tile');
let k = 0;
const slab = (x0: number, x1: number, y0: number, y1: number, c: typeof asphalt) => {
  k += 1;
  rt.part(`slab-${k}`, box(x1 - x0, y1 - y0, T, true).translate((x0 + x1) / 2, (y0 + y1) / 2, T / 2).color(c));
};

const h = S / 2;
const edge = 1700; // inner edge of the edge lines
const lw = 100; // line width
const cw = 60; // half width of the centre line
const plain = style.value === 'plain';
const isEnd = style.value === 'end';
// Stop line across the lanes near +Y for the 'end' style.
const yStop0 = 1400;
const yStop1 = 1700;
const yMax = isEnd ? yStop0 : h;

// Shoulders and edge lines run the full tile length.
slab(-h, -edge - lw, -h, h, asphalt);
slab(edge + lw, h, -h, h, asphalt);
slab(-edge - lw, -edge, -h, h, plain ? asphalt : line);
slab(edge, edge + lw, -h, h, plain ? asphalt : line);
// Lanes up to the stop line.
slab(-edge, -cw, -h, yMax, asphalt);
slab(cw, edge, -h, yMax, asphalt);
// Centre line: dashes (3 m dash / gap rhythm scaled to the tile) or solid at the stop line.
if (plain) {
  slab(-cw, cw, -h, yMax, asphalt);
} else if (isEnd) {
  slab(-cw, cw, -h, -500, asphalt);
  slab(-cw, cw, -500, yMax, centre);
} else {
  const dash = 1000;
  // Pattern along Y: gap 500, dash 1000, gap 1000, dash 1000, gap 500 (tiles seamlessly).
  slab(-cw, cw, -h, -h + 500, asphalt);
  slab(-cw, cw, -h + 500, -h + 500 + dash, centre);
  slab(-cw, cw, -h + 500 + dash, h - 500 - dash, asphalt);
  slab(-cw, cw, h - 500 - dash, h - 500, centre);
  slab(-cw, cw, h - 500, h, asphalt);
}
if (isEnd) {
  slab(-edge, edge, yStop0, yStop1, line);
  slab(-edge, edge, yStop1, h, asphalt);
}

return rt.model();
