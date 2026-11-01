// Original kernelCAD low-poly desktop keyboard: a shallow wedge case with
// key rows as raised strips, accent Esc, Enter and space keys, and optional
// navigation cluster and number pad. Millimetres, Z up, base on z = 0
// centred on x = y = 0. The typing edge (space bar) faces -Y.

meta({
  name: 'keyboard',
  license: 'CC0-1.0',
  title: 'Keyboard',
  description: 'Desktop computer keyboard with a wedge case, raised key rows, accent Esc, Enter and space keys, and an optional arrow cluster and number pad. Knobs: layout, case, keys and accent key colours.',
  tags: ['keyboard', 'computer keyboard', 'keys', 'typing', 'computer', 'pc', 'peripheral', 'desk'],
  kit: 'electronics',
  category: 'item',
  origin: 'base',
  compat: ['indoor', 'office', 'desk', 'bedroom', 'study'],
  triangleBudget: 320,
});

const layout = param('layout', 'tenkeyless', { choices: ['compact', 'tenkeyless', 'full'], label: 'Layout' });
const caseC = param('case', '#1f2023', { label: 'Case' });
const keys = param('keys', '#5d616a', { label: 'Keys' });
const accent = param('accent', '#d0533e', { label: 'Accent keys' });

presets({
  retro: { case: '#d8cfb8', keys: '#ece6d6', accent: '#8a8478' },
  white: { case: '#e9e9e6', keys: '#f7f7f5', accent: '#9fb8d8' },
  gamer: { case: '#141416', keys: '#26272b', accent: '#38e07b' },
});

const u = 19.05; // key pitch
const g = 4; // gap between keys
const hasFn = layout.value !== 'compact';
const hasNav = layout.value !== 'compact';
const hasPad = layout.value === 'full';
const rows = hasFn ? 6.5 : 5;
const kw = 15 * u + (hasNav ? 3.25 * u : 0) + (hasPad ? 4.25 * u : 0);
const m = 13;
const W = kw + 2 * m;
const D = rows * u + 2 * m;
const x0 = -kw / 2;
const y0 = -D / 2 + m;
// Case top slopes up toward the back; keys step with it.
const zf = 17;
const zb = 27;
const topAt = (y: number) => zf + ((y + D / 2) * (zb - zf)) / D;

const k = assembly('keyboard');
k.part('case', extrudePolygon([[-D / 2, 0], [D / 2, 0], [D / 2, zb], [-D / 2 + 6, zf], [-D / 2, zf - 5]], W)
  .rotateX(90).rotateZ(90).translate(-W / 2, 0, 0).color(caseC));

// One raised key strip spanning `n` key units from column `c` on row `r` (row 0 = space row).
const strip = (c: number, r: number, n: number, depth = 1) => {
  const ya = y0 + (r >= 5 ? r + 0.5 : r) * u + g / 2;
  const yb = ya + depth * u - g;
  const z = topAt(yb);
  return box(n * u - g, yb - ya, 9).translate(x0 + c * u + g / 2, ya, z - 3);
};
let i = 0;
const put = (c: number, r: number, n: number, color: typeof keys, depth = 1) => {
  k.part(`key-${i++}`, strip(c, r, n, depth).color(color));
};
// Main block, 15 units wide.
put(0, 0, 3.75, keys); put(3.75, 0, 6.25, accent); put(10, 0, 5, keys);
put(0, 1, 2.25, keys); put(2.25, 1, 10, keys); put(12.25, 1, 2.75, keys);
put(0, 2, 1.75, keys); put(1.75, 2, 11, keys); put(12.75, 2, 2.25, accent);
put(0, 3, 1.5, keys); put(1.5, 3, 13.5, keys);
put(0, 4, 13, keys); put(13, 4, 2, keys);
if (hasFn) {
  put(0, 5, 1, accent); put(2, 5, 4, keys); put(6.5, 5, 4, keys); put(11, 5, 4, keys);
}
if (hasNav) {
  const c = 15.25;
  put(c, 5, 3, keys);
  put(c, 3, 3, keys, 2);
  put(c + 1, 1, 1, keys);
  put(c, 0, 3, keys);
}
if (hasPad) {
  const c = 18.5;
  put(c, 4, 4, keys);
  put(c, 0, 3, keys, 4);
  put(c + 3, 0, 1, accent, 4);
}

return k.model();
