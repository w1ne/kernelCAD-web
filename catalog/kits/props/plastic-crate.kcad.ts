// Original kernelCAD low-poly stackable plastic crate: an open-top box
// hollowed out, with ribbed vertical slots on every side and hand-hold
// cut-outs, single or as a stack. Millimetres, Z up, base on z = 0 centred
// on x = y = 0.

meta({
  name: 'plastic-crate',
  license: 'CC0-1.0',
  title: 'Plastic crate',
  description: 'Stackable open-top plastic crate with slotted sides and hand-holds, single or a stack, optionally full of produce or bottles. Knobs: stack, contents, crate, rim and contents colours.',
  tags: ['crate', 'plastic crate', 'bottle crate', 'produce crate', 'stack', 'market', 'warehouse', 'storage'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'outdoor', 'market', 'warehouse', 'street', 'shop'],
  triangleBudget: 480,
});

const stack = param('stack', '1', { choices: ['1', '2'], label: 'Stacked crates' });
const contents = param('contents', 'produce', { choices: ['empty', 'produce'], label: 'Contents' });
const crate = param('crate', '#2f6fc0', { label: 'Crate' });
const rim = param('rim', '#25579a', { label: 'Rim and slots' });
const goods = param('goods', '#e05a2a', { label: 'Contents' });

presets({
  red: { crate: '#c8302a', rim: '#9a241f', goods: '#e8c33a' },
  green: { crate: '#3f8a4a', rim: '#2b6a35', goods: '#c8302a' },
  black: { crate: '#2a2a2c', rim: '#1a1a1c', goods: '#7ac043' },
});

const n = Number(stack.value);
const L = 600;
const W = 400;
const H = 240;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const c = assembly('plastic-crate');
for (let i = 0; i < n; i++) {
  const z = i * (H - 10);
  const id = i + 1;
  c.part(`crate-${id}`, blk(-L / 2 + 8, -W / 2 + 8, z, L / 2 - 8, W / 2 - 8, z + H)
    .subtract(blk(-L / 2 + 22, -W / 2 + 22, z + 18, L / 2 - 22, W / 2 - 22, z + H + 10))
    .color(crate));
  // Rim band and dark slots on the long sides read as the ribbed walls.
  c.part(`rim-${id}`, blk(-L / 2, -W / 2, z + H - 35, L / 2, W / 2, z + H)
    .subtract(blk(-L / 2 + 22, -W / 2 + 22, z + H - 50, L / 2 - 22, W / 2 - 22, z + H + 10))
    .subtract(blk(-90, -W / 2 - 5, z + H - 30, 90, -W / 2 + 30, z + H + 5))
    .subtract(blk(-90, W / 2 - 30, z + H - 30, 90, W / 2 + 5, z + H + 5))
    .color(rim));
  for (const sy of [-1, 1]) {
    for (let k = 0; k < 5; k++) {
      const x = -L / 2 + 90 + k * ((L - 180) / 4);
      c.part(`slot-${id}-${sy < 0 ? 'f' : 'b'}${k + 1}`, blk(x - 18, sy * (W / 2 - 8) - 4, z + 40, x + 18, sy * (W / 2 - 8) + 4, z + H - 60).color(rim));
    }
  }
}
if (contents.value === 'produce') {
  const zt = (n - 1) * (H - 10) + 18;
  // A low faceted heap of fruit filling the top crate.
  c.part('goods', path().moveTo(-L / 2 + 23, -W / 2 + 23).lineTo(L / 2 - 23, -W / 2 + 23).lineTo(L / 2 - 23, W / 2 - 23).lineTo(-L / 2 + 23, W / 2 - 23).close()
    .loft([
      path().moveTo(-L / 2 + 30, -W / 2 + 30).lineTo(L / 2 - 30, -W / 2 + 30).lineTo(L / 2 - 30, W / 2 - 30).lineTo(-L / 2 + 30, W / 2 - 30).close(),
      path().moveTo(-L * 0.25, -W * 0.15).lineTo(L * 0.22, -W * 0.2).lineTo(L * 0.25, W * 0.15).lineTo(-L * 0.2, W * 0.2).close(),
    ], {
      planes: [
        { plane: 'XY', origin: [0, 0, zt] },
        { plane: 'XY', origin: [0, 0, zt + H - 40] },
        { plane: 'XY', origin: [0, 0, zt + H + 30] },
      ],
      ruled: true,
    }).color(goods));
}

return c.model();
