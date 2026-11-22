// A modular 4 m x 4 m two-lane asphalt tile with edge stripes and a dashed
// centre line, solid stop line, or no markings. Paint is flush with the road
// surface; shoulders, lanes, and markings remain rectilinear slabs. Road runs
// along Y.
// Millimetres, Z up, base on z = 0, top at 20 mm.

meta({
  name: 'road-tile',
  license: 'CC0-1.0',
  title: 'Road tile',
  description: '4 m two-lane asphalt road tile with edge stripes and dashed, stop-line or plain variants. Knobs: marking style, asphalt, edge-paint and centre-paint colours.',
  tags: ['road', 'tile', 'asphalt', 'lane', 'street', 'modular', 'ground'],
  kit: 'city-street',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'street', 'grid-4m'],
  triangleBudget: 300,
});

const style = param('style', 'straight', { choices: ['straight', 'end', 'plain'], label: 'Style' });
const asphalt = param('asphalt', '#45484c', { label: 'Asphalt' });
const edgePaint = param('edgePaint', '#ecebe4', { label: 'Edge-line paint' });
const centrePaint = param('centrePaint', '#f4f0dc', { label: 'Centre-line paint' });

presets({
  yellowCentre: { centrePaint: '#f0c419' },
  worn: { asphalt: '#5a5c5f', edgePaint: '#c9c8c0', centrePaint: '#c9c8c0' },
});

const S = 4000;
const T = 20;
const rt = assembly('road-tile');
let k = 0;
const slabShape = (x0: number, x1: number, y0: number, y1: number) =>
  box(x1 - x0, y1 - y0, T, true).translate((x0 + x1) / 2, (y0 + y1) / 2, T / 2);
const asphaltSlab = (x0: number, x1: number, y0: number, y1: number) => {
  k += 1;
  rt.part(`asphalt-${k}`, slabShape(x0, x1, y0, y1).color(asphalt));
};
const edgeStripe = (x0: number, x1: number, y0: number, y1: number) => {
  k += 1;
  rt.part(`edge-paint-${k}`, slabShape(x0, x1, y0, y1).color(edgePaint));
};
const centreStripe = (x0: number, x1: number, y0: number, y1: number) => {
  k += 1;
  rt.part(`centre-paint-${k}`, slabShape(x0, x1, y0, y1).color(centrePaint));
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
asphaltSlab(-h, -edge - lw, -h, h);
asphaltSlab(edge + lw, h, -h, h);
if (plain) {
  asphaltSlab(-edge - lw, -edge, -h, h);
  asphaltSlab(edge, edge + lw, -h, h);
} else {
  edgeStripe(-edge - lw, -edge, -h, h);
  edgeStripe(edge, edge + lw, -h, h);
}
// Lanes up to the stop line.
asphaltSlab(-edge, -cw, -h, yMax);
asphaltSlab(cw, edge, -h, yMax);
// Centre line: dashes (3 m dash / gap rhythm scaled to the tile) or solid at the stop line.
if (plain) {
  asphaltSlab(-cw, cw, -h, yMax);
} else if (isEnd) {
  asphaltSlab(-cw, cw, -h, -500);
  centreStripe(-cw, cw, -500, yMax);
} else {
  const dash = 1000;
  // Pattern along Y: gap 500, dash 1000, gap 1000, dash 1000, gap 500 (tiles seamlessly).
  asphaltSlab(-cw, cw, -h, -h + 500);
  centreStripe(-cw, cw, -h + 500, -h + 500 + dash);
  asphaltSlab(-cw, cw, -h + 500 + dash, h - 500 - dash);
  centreStripe(-cw, cw, h - 500 - dash, h - 500);
  asphaltSlab(-cw, cw, h - 500, h);
}
if (isEnd) {
  edgeStripe(-edge, edge, yStop0, yStop1);
  asphaltSlab(-edge, edge, yStop1, h);
}

return rt.model();
