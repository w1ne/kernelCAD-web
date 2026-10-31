// Original kernelCAD low-poly dining chair. Front faces -Y.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0.

meta({
  name: 'dining-chair',
  license: 'CC0-1.0',
  title: 'Dining chair',
  description: 'Wooden dining chair with a padded seat and a slatted or solid back. Knobs: back style, slat count, wood and seat pad colours.',
  tags: ['chair', 'dining chair', 'kitchen chair', 'seat', 'wooden chair'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'kitchen', 'dining-room', 'office'],
  triangleBudget: 250,
});

const back = param('back', 'slats', { choices: ['slats', 'solid'], label: 'Back style' });
const slats = param('slats', '3', { choices: ['2', '3', '4', '5'], label: 'Back slats' });
const wood = param('wood', '#a07548', { label: 'Wood' });
const pad = param('pad', '#8d3b32', { label: 'Seat pad' });

presets({
  walnut: { wood: '#5a3a27', pad: '#c8b89a' },
  white: { wood: '#efeee9', pad: '#7d8fa3' },
  black: { wood: '#262422', pad: '#8a8a86' },
});

const W = 440;
const D = 460;
const seatZ = 450;
const backZ = 900;
const lw = 38;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const chair = assembly('dining-chair');
const x0 = -W / 2;
const y0 = -D / 2;
chair.part('leg-front-left', blk(x0, y0, 0, x0 + lw, y0 + lw, seatZ - 40).color(wood));
chair.part('leg-front-right', blk(W / 2 - lw, y0, 0, W / 2, y0 + lw, seatZ - 40).color(wood));
// Back legs run up into the back posts.
chair.part('post-left', blk(x0, D / 2 - lw, 0, x0 + lw, D / 2, backZ).color(wood));
chair.part('post-right', blk(W / 2 - lw, D / 2 - lw, 0, W / 2, D / 2, backZ).color(wood));
chair.part('seat-frame', blk(x0, y0, seatZ - 60, W / 2, D / 2 - 1, seatZ - 30).color(wood));
chair.part('seat-pad', blk(x0 + 15, y0 + 10, seatZ - 31, W / 2 - 15, D / 2 - lw - 5, seatZ).color(pad));
chair.part('rail-top', blk(x0 + lw - 1, D / 2 - 30, backZ - 110, W / 2 - lw + 1, D / 2 - 8, backZ - 10).color(wood));
if (back.value === 'solid') {
  chair.part('back-panel', blk(x0 + lw - 1, D / 2 - 26, seatZ + 60, W / 2 - lw + 1, D / 2 - 12, backZ - 109).color(wood));
} else {
  const n = Number(slats.value);
  const inner = W - 2 * lw;
  const sw = 30;
  const gap = (inner - n * sw) / (n + 1);
  for (let i = 0; i < n; i++) {
    const sx = x0 + lw + gap + i * (sw + gap);
    chair.part(`slat-${i + 1}`, blk(sx, D / 2 - 24, seatZ - 31, sx + sw, D / 2 - 14, backZ - 109).color(wood));
  }
}

return chair.model();
