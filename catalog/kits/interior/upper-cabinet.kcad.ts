// Original kernelCAD low-poly wall cabinet for kitchens: a shallow carcass
// with solid or glazed hinged doors and bar handles near the bottom edge.
// Origin 'wall': the back sits on the y = 0 wall plane, the cabinet projects
// toward -Y, centred on x = 0 with its middle at z = 0. Millimetres, Z up.

meta({
  name: 'upper-cabinet',
  license: 'CC0-1.0',
  title: 'Wall cabinet',
  description: 'Kitchen wall-hung upper cabinet with one to three solid or glass doors and bar handles. Knobs: doors, door style, cabinet, glass and handle colours.',
  tags: ['wall cabinet', 'upper cabinet', 'kitchen cabinet', 'cupboard', 'kitchen', 'storage', 'wall unit'],
  kit: 'interior',
  category: 'attachment',
  origin: 'wall',
  compat: ['indoor', 'kitchen', 'bathroom', 'laundry'],
  triangleBudget: 300,
});

const doors = param('doors', '2', { choices: ['1', '2', '3'], label: 'Doors' });
const style = param('style', 'solid', { choices: ['solid', 'glass'], label: 'Door style' });
const cabinet = param('cabinet', '#3f5a6e', { label: 'Cabinet' });
const glass = param('glass', '#b8d0d8', { label: 'Glass' });
const pulls = param('pulls', '#b8913f', { label: 'Handles' });

presets({
  white: { cabinet: '#f2f1ec', pulls: '#3b3d42' },
  oak: { cabinet: '#c69c6d', pulls: '#2b2927' },
});

const n = Number(doors.value);
const dw = 400;
const W = n * dw;
const H = 720;
const D = 330;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const c = assembly('upper-cabinet');
c.part('carcass', blk(-W / 2, -D + 20, -H / 2, W / 2, 0, H / 2).color(cabinet));
for (let i = 0; i < n; i++) {
  const x0 = -W / 2 + i * dw + 3;
  const x1 = -W / 2 + (i + 1) * dw - 3;
  let door = blk(x0, -D, -H / 2 + 3, x1, -D + 21, H / 2 - 3);
  if (style.value === 'glass') {
    door = door.subtract(blk(x0 + 70, -D - 10, -H / 2 + 73, x1 - 70, -D + 30, H / 2 - 73));
    c.part(`glass-${i + 1}`, blk(x0 + 69, -D + 8, -H / 2 + 72, x1 - 69, -D + 14, H / 2 - 72).color(glass));
  }
  c.part(`door-${i + 1}`, door.color(cabinet));
  // Handles sit at the lower inner corner of each door.
  const right = n === 1 || i % 2 === 0;
  const hx = right ? x1 - 45 : x0 + 30;
  c.part(`handle-${i + 1}`, blk(hx, -D - 18, -H / 2 + 50, hx + 15, -D + 1, -H / 2 + 200).color(pulls));
}

return c.model();
