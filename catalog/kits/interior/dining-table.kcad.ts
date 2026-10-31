// Original kernelCAD low-poly dining table: slab top, apron rails, square legs.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0.

meta({
  name: 'dining-table',
  title: 'Dining table',
  description: 'Four-legged rectangular dining table with an apron, seating four to eight. Knobs: length, leg style, top and leg colours.',
  tags: ['dining table', 'table', 'kitchen table', 'dining room', 'meeting table'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'kitchen', 'dining-room', 'office'],
  triangleBudget: 200,
});

const lengthM = param('lengthM', '1.8', { choices: ['1.4', '1.8', '2.2'], label: 'Length (m)' });
const legStyle = param('legStyle', 'square', { choices: ['square', 'tapered'], label: 'Leg style' });
const top = param('top', '#b98a5a', { label: 'Top' });
const legs = param('legs', '#a07548', { label: 'Legs and apron' });

presets({
  walnut: { top: '#6b4630', legs: '#5a3a27' },
  white: { top: '#f0efea', legs: '#d8d5cc' },
  farmhouse: { top: '#9c7a55', legs: '#e9e4d8' },
});

const L = Number(lengthM.value) * 1000;
const D = 900;
const H = 750;
const t = 35;
const lw = 70;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

// Tapered leg: a ruled loft from a small foot square up to a full square.
const leg = (cx: number, cy: number) => {
  if (legStyle.value === 'square') return blk(cx - lw / 2, cy - lw / 2, 0, cx + lw / 2, cy + lw / 2, H - t + 1);
  const sq = (h: number) => path().moveTo(-h, -h).lineTo(h, -h).lineTo(h, h).lineTo(-h, h).close();
  return sq(lw * 0.3).loft(sq(lw / 2), { spacing: H - t + 1, ruled: true }).translate(cx, cy, 0);
};

const table = assembly('dining-table');
table.part('top', blk(-L / 2, -D / 2, H - t, L / 2, D / 2, H).color(top));
const ix = L / 2 - 80;
const iy = D / 2 - 80;
[[-ix, -iy], [ix, -iy], [-ix, iy], [ix, iy]].forEach(([x, y], i) => table.part(`leg-${i + 1}`, leg(x, y).color(legs)));
table.part('apron-front', blk(-ix, -iy - 10, H - t - 90, ix, -iy + 10, H - t + 1).color(legs));
table.part('apron-back', blk(-ix, iy - 10, H - t - 90, ix, iy + 10, H - t + 1).color(legs));
table.part('apron-left', blk(-ix - 10, -iy, H - t - 90, -ix + 10, iy, H - t + 1).color(legs));
table.part('apron-right', blk(ix - 10, -iy, H - t - 90, ix + 10, iy, H - t + 1).color(legs));

return table.model();
