// Original kernelCAD low-poly kitchen island: a freestanding cabinet block
// with a worktop that can overhang the back as a breakfast bar, drawer and
// door fronts on the working side and a recessed plinth.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0. Working side
// (fronts) faces -Y; the seating overhang is on +Y.

meta({
  name: 'kitchen-island',
  license: 'CC0-1.0',
  title: 'Kitchen island',
  description: 'Freestanding kitchen island with drawers and doors, a recessed plinth and a worktop that can overhang as a breakfast bar. Knobs: length, overhang, cabinet, worktop and handle colours.',
  tags: ['kitchen island', 'island', 'breakfast bar', 'counter', 'kitchen', 'cabinet', 'worktop'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'kitchen', 'dining-room'],
  triangleBudget: 400,
});

const length = param('length', '1800', { choices: ['1200', '1800', '2400'], label: 'Length (mm)' });
const overhang = param('overhang', 'yes', { choices: ['yes', 'no'], label: 'Breakfast bar overhang' });
const cabinet = param('cabinet', '#3f5a6e', { label: 'Cabinets' });
const worktop = param('worktop', '#e9e6df', { label: 'Worktop' });
const pulls = param('pulls', '#b8913f', { label: 'Handles' });

presets({
  oak: { cabinet: '#c69c6d', worktop: '#2b2d30', pulls: '#2b2927' },
  white: { cabinet: '#f2f1ec', worktop: '#8a6a48', pulls: '#3b3d42' },
  sage: { cabinet: '#8fa58a', worktop: '#f4f3ef', pulls: '#c9ccd0' },
});

const L = Number(length.value);
const D = 620;
const H = 900;
const tt = 40;
const oh = overhang.value === 'yes' ? 300 : 30;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const k = assembly('kitchen-island');
// Keep the whole island centred on y = 0, overhang included.
const yc = -(oh - 30) / 2;
const y0 = yc - D / 2;
const y1 = yc + D / 2;
k.part('carcass', blk(-L / 2, y0 + 20, 100, L / 2, y1, H - tt + 1).color(cabinet));
k.part('plinth', blk(-L / 2 + 60, y0 + 70, 0, L / 2 - 60, y1 - 60, 101).color(cabinet));
k.part('worktop', blk(-L / 2 - 30, y0 - 30, H - tt, L / 2 + 30, y1 + oh, H).color(worktop));
if (oh > 100) {
  // Bar-side panels at each end support the overhang.
  for (const sx of [-1, 1]) {
    const x = sx < 0 ? -L / 2 : L / 2 - 40;
    k.part(`bar-panel-${sx < 0 ? 'left' : 'right'}`, blk(x, y1 - 1, 0, x + 40, y1 + oh, H - tt + 1).color(cabinet));
  }
}
// Working side: 600 mm bays, alternating a drawer stack and a door.
const bays = Math.round(L / 600);
const bw = L / bays;
const fy = y0;
for (let i = 0; i < bays; i++) {
  const x0 = -L / 2 + i * bw + 3;
  const x1 = -L / 2 + (i + 1) * bw - 3;
  const z0 = 103;
  const z1 = H - tt - 3;
  if (i % 2 === 0) {
    const n = 3;
    const dh = (z1 - z0) / n;
    for (let j = 0; j < n; j++) {
      const a = z0 + j * dh;
      k.part(`drawer-${i + 1}-${j + 1}`, blk(x0, fy, a + 3, x1, fy + 21, a + dh - 3).color(cabinet));
      k.part(`pull-${i + 1}-${j + 1}`, blk((x0 + x1) / 2 - 90, fy - 18, a + dh - 60, (x0 + x1) / 2 + 90, fy + 1, a + dh - 45).color(pulls));
    }
  } else {
    k.part(`door-${i + 1}`, blk(x0, fy, z0 + 3, x1, fy + 21, z1).color(cabinet));
    k.part(`door-pull-${i + 1}`, blk(x1 - 50, fy - 18, z1 - 250, x1 - 35, fy + 1, z1 - 60).color(pulls));
  }
}

return k.model();
