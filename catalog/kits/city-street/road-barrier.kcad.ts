// Original kernelCAD low-poly roadworks barrier: a striped board on two
// splayed A-frame legs with feet. Stripes are separate segments, not decals.
// Millimetres, Z up, base on z = 0.

meta({
  name: 'road-barrier',
  license: 'CC0-1.0',
  title: 'Road barrier',
  description: 'Striped roadworks barrier board on two A-frame legs. Knobs: length, stripe count, two stripe colours and leg colour.',
  tags: ['barrier', 'roadworks', 'construction', 'traffic', 'road', 'stripes', 'street'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street'],
  triangleBudget: 300,
});

const lengthMm = param('lengthMm', '1500', { choices: ['1000', '1500', '2000'], label: 'Length (mm)' });
const stripes = param('stripes', '6', { choices: ['4', '6', '8'], label: 'Stripes' });
const colorA = param('stripeA', '#d42a20', { label: 'Stripe A' });
const colorB = param('stripeB', '#f2f2ee', { label: 'Stripe B' });
const legs = param('legs', '#3a3d40', { label: 'Legs' });

presets({
  yellow: { stripeA: '#1e1e1e', stripeB: '#f2c418' },
  orange: { stripeA: '#f26a1b', stripeB: '#f2f2ee', legs: '#f2f2ee' },
});

const L = Number(lengthMm.value);
const n = Number(stripes.value);
const boardH = 250;
const boardT = 30;
const zBoard = 1000 - boardH; // board top at 1 m

const rb = assembly('road-barrier');
// Board: n parallelogram segments with diagonal joints (profile in XZ).
const seg = L / n;
const slant = boardH * 0.6;
for (let i = 0; i < n; i++) {
  const x0 = -L / 2 + i * seg;
  // Clip the end segments square at the board ends.
  const a0 = i === 0 ? x0 : x0 - slant / 2;
  const b0 = i === 0 ? x0 : x0 + slant / 2;
  const a1 = i === n - 1 ? x0 + seg : x0 + seg - slant / 2;
  const b1 = i === n - 1 ? x0 + seg : x0 + seg + slant / 2;
  const pts: [number, number][] = [[a0, 0], [a1, 0], [b1, boardH], [b0, boardH]];
  const piece = extrudePolygon(pts, boardT).rotateX(90).translate(0, boardT / 2, zBoard);
  rb.part(`stripe-${i + 1}`, piece.color(i % 2 === 0 ? colorA : colorB));
}
// A-frame legs: side profile (y, z), placed inboard of the board ends.
const legT = 40;
const frame: [number, number][] = [
  [-380, 0], [-320, 0], [-20, zBoard + boardH - 20], [20, zBoard + boardH - 20],
  [320, 0], [380, 0], [40, zBoard + boardH + 20], [-40, zBoard + boardH + 20],
];
for (const [i, xc] of [[1, -L / 2 + 120], [2, L / 2 - 120]] as [number, number][]) {
  const x0 = xc - legT / 2;
  rb.part(`frame-${i}`, extrudePolygon(frame, legT).rotateX(90).rotateZ(90).translate(x0, 0, 0).color(legs));
  rb.part(`foot-${i}-a`, box(120, 160, 40, true).translate(xc, -350, 20).color(legs));
  rb.part(`foot-${i}-b`, box(120, 160, 40, true).translate(xc, 350, 20).color(legs));
}

return rb.model();
