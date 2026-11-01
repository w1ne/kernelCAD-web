// Original kernelCAD low-poly baby crib (cot): corner posts, slatted long
// sides, solid end boards, a mattress and a folded blanket. Long axis along X.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0. Front faces -Y.

meta({
  name: 'crib',
  license: 'CC0-1.0',
  title: 'Baby crib',
  description: 'Wooden baby crib or cot with slatted sides, solid end boards, a mattress and a blanket. Knobs: slat spacing, wood, mattress and blanket colours.',
  tags: ['crib', 'cot', 'baby bed', 'nursery', 'bed', 'baby', 'kids room'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'bedroom', 'nursery', 'kids-room'],
  triangleBudget: 500,
});

const slats = param('slats', '11', { choices: ['9', '11', '13'], label: 'Slats per side' });
const wood = param('wood', '#efeee9', { label: 'Wood' });
const mattress = param('mattress', '#e8eef2', { label: 'Mattress' });
const blanket = param('blanket', '#9cc3d9', { label: 'Blanket' });

presets({
  natural: { wood: '#c69c6d', blanket: '#e6b6a8' },
  grey: { wood: '#8f9396', blanket: '#f0d27a' },
});

const n = Number(slats.value);
const L = 1300;
const D = 720;
const H = 920;
const p = 50;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const c = assembly('crib');
const xs = [-L / 2, L / 2 - p];
const ys = [-D / 2, D / 2 - p];
let k = 0;
for (const x of xs) for (const y of ys) c.part(`post-${++k}`, blk(x, y, 0, x + p, y + p, H).color(wood));

const ix0 = -L / 2 + p - 1;
const ix1 = L / 2 - p + 1;
const baseZ = 300;
for (const [s, y0, y1] of [['front', -D / 2 + 10, -D / 2 + 40], ['back', D / 2 - 40, D / 2 - 10]] as const) {
  c.part(`${s}-bottom-rail`, blk(ix0, y0, baseZ - 60, ix1, y1, baseZ).color(wood));
  c.part(`${s}-top-rail`, blk(ix0, y0 - 5, H - 70, ix1, y1 + 5, H - 20).color(wood));
  const span = ix1 - ix0;
  for (let i = 0; i < n; i++) {
    const x = ix0 + (span * (i + 1)) / (n + 1);
    c.part(`${s}-slat-${i + 1}`, blk(x - 14, y0 + 5, baseZ - 1, x + 14, y1 - 5, H - 69).color(wood));
  }
}
// End boards: a taller headboard and a lower footboard.
const iy0 = -D / 2 + p - 1;
const iy1 = D / 2 - p + 1;
c.part('headboard', blk(-L / 2 + 10, iy0, baseZ - 60, -L / 2 + 35, iy1, H - 30).color(wood));
c.part('footboard', blk(L / 2 - 35, iy0, baseZ - 60, L / 2 - 10, iy1, H - 160).color(wood));
c.part('deck', blk(ix0, -D / 2 + 39, baseZ - 40, ix1, D / 2 - 39, baseZ - 20).color(wood));
c.part('mattress', blk(-L / 2 + 40, -D / 2 + 42, baseZ - 21, L / 2 - 40, D / 2 - 42, baseZ + 100).color(mattress));
c.part('blanket', blk(80, -D / 2 + 60, baseZ + 99, L / 2 - 60, D / 2 - 60, baseZ + 150).color(blanket));

return c.model();
