// Original kernelCAD low-poly nightstand: cabinet with drawers on short legs.
// Drawer fronts face -Y. Millimetres, Z up, standing on z = 0 centred on x = y = 0.

meta({
  name: 'nightstand',
  license: 'CC0-1.0',
  title: 'Nightstand',
  description: 'Bedside table with one to three drawers on short legs. Knobs: drawer count, body, drawer front and handle colours.',
  tags: ['nightstand', 'bedside table', 'night table', 'drawers', 'bedroom', 'cabinet'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'bedroom', 'living-room'],
  triangleBudget: 200,
});

const drawers = param('drawers', '2', { choices: ['1', '2', '3'], label: 'Drawers' });
const body = param('body', '#b98a5a', { label: 'Body' });
const front = param('front', '#c99c6c', { label: 'Drawer fronts' });
const handle = param('handle', '#2b2b2b', { label: 'Handles' });

presets({
  walnut: { body: '#5a3a27', front: '#6b4630', handle: '#c9a24a' },
  white: { body: '#ecebe6', front: '#f6f5f1', handle: '#9a9a96' },
});

const n = Number(drawers.value);
const W = 450;
const D = 400;
const legH = 120;
const H = 580;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const ns = assembly('nightstand');
const lw = 35;
const li = 15;
[[-W / 2 + li, -D / 2 + li], [W / 2 - li - lw, -D / 2 + li], [-W / 2 + li, D / 2 - li - lw], [W / 2 - li - lw, D / 2 - li - lw]].forEach(([x, y], i) => {
  ns.part(`leg-${i + 1}`, blk(x, y, 0, x + lw, y + lw, legH + 1).color(body));
});
// Open-front carcass (sides, back, bottom rail): the drawer fronts are its only front faces.
ns.part('carcass-left', blk(-W / 2, -D / 2 + 15, legH, -W / 2 + 18, D / 2, H - 19).color(body));
ns.part('carcass-right', blk(W / 2 - 18, -D / 2 + 15, legH, W / 2, D / 2, H - 19).color(body));
ns.part('carcass-back', blk(-W / 2 + 17, D / 2 - 15, legH, W / 2 - 17, D / 2, H - 19).color(body));
ns.part('carcass-bottom', blk(-W / 2 + 17, -D / 2 + 15, legH, W / 2 - 17, D / 2 - 14, legH + 20).color(body));
ns.part('top', blk(-W / 2 - 10, -D / 2, H - 20, W / 2 + 10, D / 2 + 5, H).color(body));
const gap = 8;
const fz0 = legH + 20;
const fz1 = H - 30;
const fh = (fz1 - fz0 - (n - 1) * gap) / n;
for (let i = 0; i < n; i++) {
  const z = fz0 + i * (fh + gap);
  ns.part(`drawer-${i + 1}`, blk(-W / 2 + 20, -D / 2, z, W / 2 - 20, -D / 2 + 16, z + fh).color(front));
  ns.part(`handle-${i + 1}`, blk(-50, -D / 2 - 15, z + fh / 2 - 8, 50, -D / 2 + 1, z + fh / 2 + 8).color(handle));
}

return ns.model();
