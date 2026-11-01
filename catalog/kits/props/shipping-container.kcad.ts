// Original kernelCAD low-poly ISO shipping container: a corrugated steel box
// (raised ribs on the long walls), corner castings, end frame and double
// cargo doors with locking bars. Millimetres, Z up, base on z = 0 centred on
// x = y = 0, long side along X, doors at -X.

meta({
  name: 'shipping-container',
  license: 'CC0-1.0',
  title: 'Shipping container',
  description: 'Corrugated steel ISO shipping container, 10, 20 or 40 ft, with corner castings and ribbed double doors with locking bars. Knobs: length, rib count, steel, frame and door bar colours.',
  tags: ['shipping container', 'container', 'cargo', 'freight', 'iso container', 'port', 'dock', 'industrial'],
  kit: 'props',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'harbour', 'industrial', 'warehouse', 'street'],
  triangleBudget: 600,
});

const lengthFt = param('lengthFt', '20', { choices: ['10', '20', '40'], label: 'Length (ft)' });
const ribs = param('ribs', '8', { choices: ['6', '8', '10'], label: 'Wall ribs' });
const steel = param('steel', '#b8432f', { label: 'Steel' });
const frame = param('frame', '#7f2d20', { label: 'Corner frame' });
const bars = param('bars', '#d0d2d4', { label: 'Door bars' });

presets({
  blue: { steel: '#2f5f9c', frame: '#22446f' },
  green: { steel: '#3f7a4a', frame: '#2b5533' },
  white: { steel: '#e4e4e0', frame: '#a8aaa8', bars: '#555759' },
});

const L = lengthFt.value === '10' ? 2991 : lengthFt.value === '40' ? 12192 : 6058;
const W = 2438;
const H = 2591;
const nr = Number(ribs.value);
const c = 150; // corner post size

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const ct = assembly('shipping-container');
ct.part('shell', blk(-L / 2 + 20, -W / 2 + 25, 20, L / 2 - 20, W / 2 - 25, H - 20).color(steel));
// Corner posts and top/bottom rails make the frame.
for (const [i, [sx, sy]] of [[-1, -1], [1, -1], [1, 1], [-1, 1]].entries()) {
  const x0 = sx < 0 ? -L / 2 : L / 2 - c;
  const y0 = sy < 0 ? -W / 2 : W / 2 - c;
  ct.part(`post-${i + 1}`, blk(x0, y0, 0, x0 + c, y0 + c, H).color(frame));
}
for (const [j, z0] of [[1, 0], [2, H - c]] as [number, number][]) {
  for (const sy of [-1, 1]) ct.part(`rail-${j}-${sy < 0 ? 'a' : 'b'}`, blk(-L / 2 + c - 1, sy < 0 ? -W / 2 : W / 2 - c, z0, L / 2 - c + 1, sy < 0 ? -W / 2 + c : W / 2, z0 + c).color(frame));
  for (const sx of [-1, 1]) ct.part(`end-rail-${j}-${sx < 0 ? 'a' : 'b'}`, blk(sx < 0 ? -L / 2 : L / 2 - c, -W / 2 + c - 1, z0, sx < 0 ? -L / 2 + c : L / 2, W / 2 - c + 1, z0 + c).color(frame));
}
// Corrugation: trapezoid ribs proud of both long walls, so the slanted
// flanks catch the light.
const span = L - 2 * c;
const pitch = span / nr;
const rw = pitch * 0.72;
const dd = 40;
const rib = (x: number, sy: number) =>
  extrudePolygon([[-rw / 2, 0], [rw / 2, 0], [rw / 2 - 2.5 * dd, dd], [-rw / 2 + 2.5 * dd, dd]], H - 2 * c + 2)
    .rotateZ(sy < 0 ? 180 : 0)
    .translate(x, sy * (W / 2 - 25 - 15), c - 1);
for (let i = 0; i < nr; i++) {
  const x = -L / 2 + c + pitch * (i + 0.5);
  for (const sy of [-1, 1]) ct.part(`rib-${i + 1}-${sy < 0 ? 'a' : 'b'}`, rib(x, sy).color(steel));
}
// Doors at -X: a centre seam and four vertical locking bars.
ct.part('door-seam', blk(-L / 2 + 4, -12, c - 1, -L / 2 + 30, 12, H - c + 1).color(frame));
for (const [k, y] of [-W * 0.38, -W * 0.12, W * 0.12, W * 0.38].entries()) {
  ct.part(`bar-${k + 1}`, blk(-L / 2 - 5, y - 22, c, -L / 2 + 30, y + 22, H - c).color(bars));
}

return ct.model();
