// Original kernelCAD low-poly chest of drawers: a carcass with an overhanging
// top, proud drawer fronts with gaps, knobs or bar pulls, on a plinth or legs.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0. Front faces -Y.

meta({
  name: 'chest-of-drawers',
  license: 'CC0-1.0',
  title: 'Chest of drawers',
  description: 'Bedroom chest of drawers (dresser) with three to five drawers, knobs or bar pulls, on a plinth or tapered legs. Knobs: drawer count, width, base, handles, body, fronts and handle colours.',
  tags: ['chest of drawers', 'dresser', 'drawers', 'commode', 'storage', 'cabinet', 'bedroom'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'bedroom', 'living-room', 'hallway'],
  triangleBudget: 400,
});

const drawers = param('drawers', '4', { choices: ['3', '4', '5'], label: 'Drawers' });
const width = param('width', '900', { choices: ['600', '900', '1200'], label: 'Width (mm)' });
const base = param('base', 'legs', { choices: ['plinth', 'legs'], label: 'Base' });
const handles = param('handles', 'knobs', { choices: ['knobs', 'bars'], label: 'Handles' });
const body = param('body', '#b98a5a', { label: 'Body' });
const fronts = param('fronts', '#c99a68', { label: 'Drawer fronts' });
const pulls = param('pulls', '#2b2927', { label: 'Handles' });

presets({
  white: { body: '#efeee9', fronts: '#f6f5f1', pulls: '#b8913f' },
  walnut: { body: '#5a3a27', fronts: '#6b452d', pulls: '#d0c08a' },
  sage: { body: '#d9d4c7', fronts: '#8fa58a', pulls: '#3a3a36' },
});

const n = Number(drawers.value);
const W = Number(width.value);
const D = 460;
const baseH = base.value === 'legs' ? 160 : 80;
const dh = 190; // drawer pitch
const H = baseH + n * dh + 30;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const ch = assembly('chest-of-drawers');
ch.part('carcass', blk(-W / 2, -D / 2 + 20, baseH, W / 2, D / 2, H - 25).color(body));
ch.part('top', blk(-W / 2 - 15, -D / 2 + 5, H - 26, W / 2 + 15, D / 2 + 5, H).color(body));
if (base.value === 'legs') {
  const lw = 45;
  const ins = 30;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy], i) => {
    const x = sx * (W / 2 - ins - lw / 2);
    const y = sy * (D / 2 - ins - lw / 2) + 10;
    // Tapered square leg: a ruled loft from a slim foot to a wider top.
    const sq = (r: number) => path().moveTo(-r, -r).lineTo(r, -r).lineTo(r, r).lineTo(-r, r).close();
    ch.part(`leg-${i + 1}`, sq(lw * 0.3).loft(sq(lw / 2), { spacing: baseH + 5, ruled: true }).translate(x, y, 0).color(body));
  });
} else {
  ch.part('plinth', blk(-W / 2 + 20, -D / 2 + 40, 0, W / 2 - 20, D / 2 - 20, baseH + 1).color(body));
}

const gap = 6;
for (let i = 0; i < n; i++) {
  const z0 = baseH + 10 + i * dh;
  ch.part(`drawer-${i + 1}`, blk(-W / 2 + 15, -D / 2, z0 + gap / 2, W / 2 - 15, -D / 2 + 21, z0 + dh - gap / 2).color(fronts));
  const zc = z0 + dh / 2;
  if (handles.value === 'knobs') {
    for (const fx of W >= 900 ? [-0.25, 0.25] : [0]) {
      ch.part(`knob-${i + 1}-${fx < 0 ? 'l' : fx > 0 ? 'r' : 'c'}`, blk(W * fx - 16, -D / 2 - 22, zc - 16, W * fx + 16, -D / 2 + 1, zc + 16).color(pulls));
    }
  } else {
    ch.part(`pull-${i + 1}`, blk(-W * 0.18, -D / 2 - 18, zc - 9, W * 0.18, -D / 2 + 1, zc + 9).color(pulls));
  }
}

return ch.model();
