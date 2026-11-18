// Original kernelCAD low-poly vending machine: a tall cabinet with a recessed
// display of product rows on shelves, a side button panel with a coin slot
// and a dark pickup flap. Millimetres, Z up, front faces -Y.

meta({
  name: 'vending-machine',
  license: 'CC0-1.0',
  title: 'Vending machine',
  description: 'Drinks and snacks vending machine with a stocked display, button panel and pickup flap. Knobs: product rows, cabinet, panel and two product colours.',
  tags: ['vending machine', 'drinks', 'snacks', 'machine', 'kiosk', 'station', 'street', 'interior'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street', 'indoor', 'office', 'station'],
  triangleBudget: 520,
});

const rows = param('rows', '5', { choices: ['4', '5', '6'], label: 'Product rows' });
const cabinet = param('cabinet', '#c8261e', { label: 'Cabinet' });
const panel = param('panel', '#2a2c2e', { label: 'Panel and recess' });
const product1 = param('product1', '#f2c418', { label: 'Products A' });
const product2 = param('product2', '#2a7fc8', { label: 'Products B' });

presets({
  blue: { cabinet: '#2a5ea8', product1: '#e8432e', product2: '#f2f2ee' },
  white: { cabinet: '#e8e8e4', product1: '#4f9a3a', product2: '#e8432e' },
});

const n = Number(rows.value);
const W = 900;
const D = 750;
const H = 1830;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const wx0 = -W / 2 + 60;
const wx1 = W / 2 - 260;
const wz0 = 620;
const wz1 = H - 120;
const depth = 140;
const vm = assembly('vending-machine');
vm.part('cabinet', blk(-W / 2, -D / 2, 0, W / 2, D / 2, H)
  .subtract(blk(wx0, -D / 2 - 10, wz0, wx1, -D / 2 + depth, wz1)).color(cabinet));
vm.part('recess-back', blk(wx0, -D / 2 + depth - 2, wz0, wx1, -D / 2 + depth + 1, wz1).color(panel));
vm.part('plinth', blk(-W / 2 + 20, -D / 2 - 20, 0, W / 2 - 20, -D / 2 + 1, 80).color(panel));
vm.part('button-panel', blk(wx1 + 50, -D / 2 - 8, 900, W / 2 - 50, -D / 2 + 1, wz1).color(panel));
vm.part('coin-slot', blk(wx1 + 100, -D / 2 - 14, 1250, W / 2 - 100, -D / 2, 1290).color(product1));
for (let b = 0; b < 3; b++) {
  const z = 1380 + b * 110;
  vm.part(`button-${b + 1}`, blk(wx1 + 100, -D / 2 - 18, z, W / 2 - 100, -D / 2, z + 60).color(product2));
}
vm.part('flap', blk(wx0, -D / 2 - 6, 200, wx1, -D / 2 + 1, 420).color(panel));

// Shelves of products, alternating colour per row.
const rh = (wz1 - wz0) / n;
const per = 4;
const cw = (wx1 - wx0) / per;
for (let r = 0; r < n; r++) {
  const z = wz0 + r * rh;
  vm.part(`shelf-${r + 1}`, blk(wx0, -D / 2 - 4, z, wx1, -D / 2 + depth, z + 18).color(cabinet));
  for (let c = 0; c < per; c++) {
    const x = wx0 + cw * (c + 0.5);
    vm.part(`item-${r + 1}-${c + 1}`, blk(x - cw * 0.32, -D / 2 + 30, z + 17, x + cw * 0.32, -D / 2 + depth - 1, z + rh * 0.78)
      .color(r % 2 === 0 ? product1 : product2));
  }
}

return vm.model();
