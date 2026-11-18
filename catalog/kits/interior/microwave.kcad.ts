// Original kernelCAD low-poly countertop microwave: a box cabinet on small
// feet, a door with a dark window and a pull bar, and a control column with
// a display, buttons and a dial. Millimetres, Z up, standing on z = 0
// (the counter top) centred on x = y = 0. Front faces -Y.

meta({
  name: 'microwave',
  license: 'CC0-1.0',
  title: 'Microwave oven',
  description: 'Countertop microwave oven with a windowed door, pull handle, display, buttons and dial. Knobs: size, body, door window, controls and display colours.',
  tags: ['microwave', 'microwave oven', 'oven', 'kitchen', 'appliance', 'countertop'],
  kit: 'interior',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'kitchen', 'office', 'dorm'],
  triangleBudget: 250,
});

const size = param('size', 'medium', { choices: ['compact', 'medium', 'large'], label: 'Size' });
const body = param('body', '#e9e8e4', { label: 'Body' });
const glass = param('glass', '#2b3338', { label: 'Door window' });
const controls = param('controls', '#3b3d42', { label: 'Controls' });
const display = param('display', '#5fd38a', { label: 'Display' });

presets({
  steel: { body: '#b9bcbf', controls: '#2b2d30' },
  black: { body: '#232323', controls: '#3b3d42', display: '#ff8a3d' },
  retro: { body: '#c2553f', controls: '#efe6d2', glass: '#3a3530' },
});

const s = size.value === 'compact' ? 0.85 : size.value === 'large' ? 1.15 : 1;
const W = 480 * s;
const D = 360 * s;
const H = 280 * s;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
const ngon = (r: number, n: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n));
  return p.close();
};

const m = assembly('microwave');
const fy = -D / 2;
const cw = 120 * s; // control column width
m.part('cabinet', blk(-W / 2, fy + 8, 12, W / 2, D / 2, H).color(body));
for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
  m.part(`foot-${sx}-${sy}`, blk(sx * (W / 2 - 40) - 15, sy * (D / 2 - 40) - 15, 0, sx * (W / 2 - 40) + 15, sy * (D / 2 - 40) + 15, 13).color(controls));
}
const dx1 = W / 2 - cw;
m.part('door', blk(-W / 2 + 8, fy - 4, 20, dx1 - 6, fy + 9, H - 8).color(body));
m.part('window', blk(-W / 2 + 45 * s, fy - 8, 60 * s, dx1 - 70 * s, fy - 3, H - 55 * s).color(glass));
m.part('handle', blk(dx1 - 45 * s, fy - 30, 50 * s, dx1 - 25 * s, fy - 3, H - 40 * s).color(controls));
m.part('panel', blk(dx1, fy - 2, 20, W / 2 - 8, fy + 9, H - 8).color(controls));
m.part('display', blk(dx1 + 15 * s, fy - 6, H - 60 * s, W / 2 - 22 * s, fy - 1, H - 30 * s).color(display));
for (let r = 0; r < 2; r++) {
  for (let c = 0; c < 2; c++) {
    const x = dx1 + 30 * s + c * 45 * s;
    const z = H - 100 * s - r * 40 * s;
    m.part(`button-${r}-${c}`, blk(x - 15 * s, fy - 8, z - 12 * s, x + 15 * s, fy - 1, z + 12 * s).color(body));
  }
}
m.part('dial', ngon(28 * s, 8).extrude(18).rotateX(90).translate(dx1 + cw / 2 - 4, fy - 1, 65 * s).color(body));

return m.model();
