// Original kernelCAD low-poly kitchen base run: 600 mm cabinet modules on a
// recessed plinth, worktop with an optional inset sink and tap. Doors face -Y.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0.

meta({
  name: 'kitchen-counter',
  title: 'Kitchen counter',
  description: 'Run of kitchen base cabinets with a worktop and an optional sink with tap. Knobs: length, sink, cabinet, worktop and handle colours.',
  tags: ['kitchen counter', 'kitchen cabinet', 'worktop', 'countertop', 'sink', 'kitchen', 'base unit'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'kitchen'],
  triangleBudget: 400,
});

const modules = param('modules', '3', { choices: ['2', '3', '4'], label: 'Cabinets (600 mm)' });
const sink = param('sink', 'yes', { choices: ['yes', 'no'], label: 'Sink' });
const cabinet = param('cabinet', '#e8e7e2', { label: 'Cabinets' });
const worktop = param('worktop', '#a07548', { label: 'Worktop' });
const handle = param('handle', '#3a3a3a', { label: 'Handles' });
const steel = param('steel', '#b8bcc0', { label: 'Sink and tap' });

presets({
  sage: { cabinet: '#7d9478', worktop: '#e6e2d8', handle: '#c9a24a' },
  navy: { cabinet: '#2c3e57', worktop: '#e9e7e1', handle: '#c9c9c4' },
  dark: { cabinet: '#2b2927', worktop: '#8a8a86', handle: '#b0b0aa' },
});

const n = Number(modules.value);
const mw = 600;
const W = n * mw;
const D = 600;
const H = 900;
const t = 38;
const plinth = 100;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const k = assembly('kitchen-counter');
k.part('plinth', blk(-W / 2, -D / 2 + 60, 0, W / 2, D / 2, plinth + 1).color(handle));
// Open-front carcass (two sides and a back): the doors are its only front faces.
k.part('carcass-left', blk(-W / 2, -D / 2 + 20, plinth, -W / 2 + 18, D / 2, H - t + 1).color(cabinet));
k.part('carcass-right', blk(W / 2 - 18, -D / 2 + 20, plinth, W / 2, D / 2, H - t + 1).color(cabinet));
k.part('carcass-back', blk(-W / 2 + 17, D / 2 - 18, plinth, W / 2 - 17, D / 2, H - t + 1).color(cabinet));
// Sink bowl sits over the second module (or the first when there are only two).
const sinkCx = -W / 2 + mw * (n > 2 ? 1.5 : 0.5);
let top = blk(-W / 2, -D / 2, H - t, W / 2, D / 2 + 10, H);
if (sink.value === 'yes') {
  top = top.subtract(blk(sinkCx - 230, -D / 2 + 90, H - t - 5, sinkCx + 230, D / 2 - 110, H + 5));
}
k.part('worktop', top.color(worktop));
if (sink.value === 'yes') {
  k.part('basin', blk(sinkCx - 230, -D / 2 + 90, H - 180, sinkCx + 230, D / 2 - 110, H - t + 1).color(steel));
  k.part('tap-post', blk(sinkCx - 18, D / 2 - 90, H - 1, sinkCx + 18, D / 2 - 54, H + 260).color(steel));
  k.part('tap-spout', blk(sinkCx - 14, D / 2 - 230, H + 230, sinkCx + 14, D / 2 - 60, H + 258).color(steel));
}
const gap = 4;
for (let i = 0; i < n; i++) {
  const x = -W / 2 + i * mw;
  // Every third module from the left is a drawer stack; the rest are doors.
  if (i % 3 === 2) {
    const fh = (H - t - plinth - 10 - 2 * gap) / 3;
    for (let j = 0; j < 3; j++) {
      const z = plinth + 5 + j * (fh + gap);
      k.part(`drawer-${i + 1}-${j + 1}`, blk(x + gap / 2, -D / 2, z, x + mw - gap / 2, -D / 2 + 21, z + fh).color(cabinet));
      k.part(`handle-${i + 1}-${j + 1}`, blk(x + mw / 2 - 80, -D / 2 - 18, z + fh - 45, x + mw / 2 + 80, -D / 2 + 1, z + fh - 30).color(handle));
    }
  } else {
    k.part(`door-${i + 1}`, blk(x + gap / 2, -D / 2, plinth + 5, x + mw - gap / 2, -D / 2 + 21, H - t - 5).color(cabinet));
    const hx = i % 2 === 0 ? x + mw - 50 : x + 35;
    k.part(`handle-${i + 1}`, blk(hx, -D / 2 - 18, H - t - 220, hx + 15, -D / 2 + 1, H - t - 60).color(handle));
  }
}

return k.model();
