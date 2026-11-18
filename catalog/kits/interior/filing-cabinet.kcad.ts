// Original kernelCAD low-poly office filing cabinet: a steel carcass with
// proud drawer fronts, recessed bar pulls, label holders and a top lock.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0. Front faces -Y.

meta({
  name: 'filing-cabinet',
  license: 'CC0-1.0',
  title: 'Filing cabinet',
  description: 'Steel office filing cabinet with two to four drawers, bar pulls, label holders and a lock. Knobs: drawer count, body, drawer front and handle colours.',
  tags: ['filing cabinet', 'file cabinet', 'cabinet', 'drawers', 'office', 'storage', 'metal'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'office', 'school'],
  triangleBudget: 300,
});

const drawers = param('drawers', '4', { choices: ['2', '3', '4'], label: 'Drawers' });
const body = param('body', '#8f979e', { label: 'Body' });
const fronts = param('fronts', '#a6aeb5', { label: 'Drawer fronts' });
const pulls = param('pulls', '#d6d9dc', { label: 'Handles and labels' });

presets({
  beige: { body: '#c9bea6', fronts: '#d6ccb4', pulls: '#6b6b66' },
  black: { body: '#2b2d30', fronts: '#36393d', pulls: '#b9bcbf' },
  red: { body: '#a8342c', fronts: '#bd3d33', pulls: '#e8e8e4' },
});

const n = Number(drawers.value);
const W = 470;
const D = 620;
const plinth = 40;
const dh = 330;
const H = plinth + n * dh + 20;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const fc = assembly('filing-cabinet');
fc.part('carcass', blk(-W / 2, -D / 2 + 12, 0, W / 2, D / 2, H).color(body));
const gap = 8;
for (let i = 0; i < n; i++) {
  const z0 = plinth + i * dh;
  fc.part(`drawer-${i + 1}`, blk(-W / 2 + 12, -D / 2, z0 + gap / 2, W / 2 - 12, -D / 2 + 13, z0 + dh - gap / 2).color(fronts));
  const zc = z0 + dh * 0.62;
  fc.part(`pull-${i + 1}`, blk(-110, -D / 2 - 22, zc - 14, 110, -D / 2 + 1, zc + 6).color(pulls));
  fc.part(`label-${i + 1}`, blk(-45, -D / 2 - 5, zc + 30, 45, -D / 2 + 1, zc + 75).color(pulls));
}
fc.part('lock', blk(W / 2 - 70, -D / 2 - 10, H - 50, W / 2 - 40, -D / 2 + 13, H - 20).color(pulls));

return fc.model();
