// Original kernelCAD low-poly wardrobe: tall carcass, hinged doors with bar
// handles, plinth and cornice. Doors face -Y.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0.

meta({
  name: 'wardrobe',
  title: 'Wardrobe',
  description: 'Tall hinged-door wardrobe with two to four doors, plinth and top trim. Knobs: door count, body, door and handle colours.',
  tags: ['wardrobe', 'closet', 'armoire', 'cupboard', 'cabinet', 'bedroom', 'storage'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'bedroom', 'office'],
  triangleBudget: 250,
});

const doors = param('doors', '2', { choices: ['2', '3', '4'], label: 'Doors' });
const body = param('body', '#b98a5a', { label: 'Body' });
const door = param('door', '#c99c6c', { label: 'Doors' });
const handle = param('handle', '#3a3a3a', { label: 'Handles' });

presets({
  walnut: { body: '#5a3a27', door: '#6b4630', handle: '#c9a24a' },
  white: { body: '#e8e7e2', door: '#f6f5f1', handle: '#8f8f8b' },
  dark: { body: '#2b2927', door: '#3a3735', handle: '#b0b0aa' },
});

const n = Number(doors.value);
const dw = 500;
const W = n * dw + 40;
const D = 600;
const H = 2100;
const plinth = 80;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const wr = assembly('wardrobe');
wr.part('plinth', blk(-W / 2 + 30, -D / 2 + 50, 0, W / 2 - 30, D / 2 - 10, plinth + 1).color(body));
wr.part('carcass', blk(-W / 2, -D / 2 + 20, plinth, W / 2, D / 2, H - 40).color(body));
wr.part('cornice', blk(-W / 2 - 15, -D / 2, H - 40, W / 2 + 15, D / 2 + 5, H).color(body));
const gap = 4;
const x0 = -W / 2 + 20;
for (let i = 0; i < n; i++) {
  const dx = x0 + i * dw;
  wr.part(`door-${i + 1}`, blk(dx + gap / 2, -D / 2, plinth + 15, dx + dw - gap / 2, -D / 2 + 21, H - 55).color(door));
  // Handles sit next to the meeting edge of each door pair; a lone last door gets one on its left edge.
  const leftHinge = i % 2 === 0 && i !== n - 1;
  const hx = leftHinge ? dx + dw - 50 : dx + 30;
  wr.part(`handle-${i + 1}`, blk(hx, -D / 2 - 25, 950, hx + 20, -D / 2 + 1, 1250).color(handle));
}

return wr.model();
