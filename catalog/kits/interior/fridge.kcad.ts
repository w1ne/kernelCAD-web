// Original kernelCAD low-poly fridge: upright cabinet as a fridge-over-freezer
// or a wide side-by-side model, with long bar handles. Doors face -Y.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0.

meta({
  name: 'fridge',
  title: 'Fridge',
  description: 'Upright kitchen refrigerator, fridge-over-freezer or wide side-by-side, with bar handles. Knobs: style, body and handle colours.',
  tags: ['fridge', 'refrigerator', 'freezer', 'kitchen appliance', 'appliance', 'kitchen'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'kitchen'],
  triangleBudget: 150,
});

const style = param('style', 'combi', { choices: ['combi', 'side-by-side'], label: 'Style' });
const body = param('body', '#e9eaeb', { label: 'Body' });
const handle = param('handle', '#7f8489', { label: 'Handles' });
const trim = param('trim', '#3a3d40', { label: 'Base grille' });

presets({
  steel: { body: '#b9bdc1', handle: '#e0e2e4', trim: '#2a2c2e' },
  retro: { body: '#9fcfc4', handle: '#d8d8d4', trim: '#d8d8d4' },
  black: { body: '#2a2b2d', handle: '#8f9396', trim: '#151515' },
});

const wide = style.value === 'side-by-side';
const W = wide ? 910 : 600;
const D = 650;
const H = wide ? 1780 : 1850;
const doorT = 50;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const f = assembly('fridge');
const y0 = -D / 2;
// Open-front cabinet shell (sides and back): the doors are its only front faces.
f.part('cabinet-left', blk(-W / 2, y0 + doorT, 0, -W / 2 + 30, D / 2, H).color(body));
f.part('cabinet-right', blk(W / 2 - 30, y0 + doorT, 0, W / 2, D / 2, H).color(body));
f.part('cabinet-back', blk(-W / 2 + 29, D / 2 - 30, 0, W / 2 - 29, D / 2, H).color(body));
f.part('cabinet-top', blk(-W / 2 + 29, y0 + doorT, H - 1, W / 2 - 29, D / 2 - 29, H).color(body));
f.part('grille', blk(-W / 2 + 10, y0 + 10, 0, W / 2 - 10, y0 + doorT + 1, 90).color(trim));
const g = 6;
// A door is two slabs split beside its handle, so the handle strip stays a
// narrow face of its own next to the bar.
const door = (name: string, x0: number, x1: number, z0: number, z1: number, hx: number, hz0: number, hz1: number) => {
  const sx = hx < (x0 + x1) / 2 ? hx + 80 : hx - 80;
  f.part(`${name}-a`, blk(x0, y0, z0, Math.min(sx, x1), y0 + doorT + 1, z1).color(body));
  f.part(`${name}-b`, blk(Math.max(sx, x0), y0, z0, x1, y0 + doorT + 1, z1).color(body));
  f.part(`handle-${name}`, blk(hx - 12, y0 - 35, hz0, hx + 13, y0 + 1, hz1).color(handle));
};
if (wide) {
  const split = W * 0.08; // freezer side narrower than fridge side
  door('freezer', -W / 2, split - g / 2, 95, H, split - 48, 700, 1500);
  door('fridge', split + g / 2, W / 2, 95, H, split + 48, 700, 1500);
} else {
  const zs = 95 + (H - 95) * 0.36;
  door('freezer', -W / 2, W / 2, 95, zs - g / 2, W / 2 - 58, zs - 380, zs - 80);
  door('fridge', -W / 2, W / 2, zs + g / 2, H, W / 2 - 58, zs + 80, zs + 600);
}

return f.model();
