// Original kernelCAD low-poly coffee table: slab top on square legs with an
// optional lower shelf; a round variant uses a faceted disc on four legs.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0.

meta({
  name: 'coffee-table',
  license: 'CC0-1.0',
  title: 'Coffee table',
  description: 'Low living-room coffee table, rectangular or round, with an optional lower shelf. Knobs: shape, shelf, top and leg colours.',
  tags: ['coffee table', 'table', 'low table', 'living room', 'lounge'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'living-room', 'office'],
  triangleBudget: 200,
});

const shape = param('shape', 'rectangle', { choices: ['rectangle', 'round'], label: 'Shape' });
const shelf = param('shelf', 'yes', { choices: ['yes', 'no'], label: 'Lower shelf' });
const top = param('top', '#b98a5a', { label: 'Top' });
const legs = param('legs', '#8a633f', { label: 'Legs' });

presets({
  walnut: { top: '#6b4630', legs: '#4f3322' },
  white: { top: '#ecebe6', legs: '#c9c6bd' },
  dark: { top: '#2e2b29', legs: '#1b1a19' },
});

const round = shape.value === 'round';
const W = round ? 800 : 1100;
const D = round ? 800 : 600;
const H = 420;
const t = 30;
const lw = 45;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const table = assembly('coffee-table');
if (round) {
  table.part('top', cylinder(t, W / 2, 12).translate(0, 0, H - t).color(top));
} else {
  table.part('top', blk(-W / 2, -D / 2, H - t, W / 2, D / 2, H).color(top));
}
// Leg positions: inset corners for the rectangle, a square inside the circle for round.
const lx = round ? W * 0.3 : W / 2 - 60;
const ly = round ? W * 0.3 : D / 2 - 60;
[[-lx, -ly], [lx, -ly], [-lx, ly], [lx, ly]].forEach(([x, y], i) => {
  table.part(`leg-${i + 1}`, blk(x - lw / 2, y - lw / 2, 0, x + lw / 2, y + lw / 2, H - t + 1).color(legs));
});
if (shelf.value === 'yes') {
  table.part('shelf', blk(-lx - lw / 2 + 1, -ly + lw / 2, 110, lx + lw / 2 - 1, ly - lw / 2, 128).color(top));
}

return table.model();
