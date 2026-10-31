// Original kernelCAD low-poly sofa. Boxes only; front faces -Y.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0.

meta({
  name: 'sofa',
  license: 'CC0-1.0',
  title: 'Sofa',
  description: 'Boxy upholstered sofa with seat and back cushions on wooden feet. Knobs: seat count, frame fabric, cushion and leg colours.',
  tags: ['sofa', 'couch', 'settee', 'seat', 'living room', 'lounge'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'living-room', 'office'],
  triangleBudget: 300,
});

const seats = param('seats', '3', { choices: ['2', '3'], label: 'Seats' });
const fabric = param('fabric', '#5a6b7d', { label: 'Frame fabric' });
const cushion = param('cushion', '#7d8fa3', { label: 'Cushions' });
const legs = param('legs', '#4a3324', { label: 'Legs' });

presets({
  charcoal: { fabric: '#3b3d42', cushion: '#55585f', legs: '#1f1f1f' },
  mustard: { fabric: '#b8892c', cushion: '#d0a548', legs: '#6b4a2e' },
  cream: { fabric: '#d9cfbd', cushion: '#e8e0d0', legs: '#8a6a48' },
});

const n = Number(seats.value);
const seatW = 620;
const armW = 180;
const W = n * seatW + 2 * armW;
const D = 900;
const legH = 120;

// Corner-to-corner box helper.
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const sofa = assembly('sofa');
const x0 = -W / 2;
const y0 = -D / 2;
// Legs
const li = 40;
const lw = 50;
[[x0 + li, y0 + li], [W / 2 - li - lw, y0 + li], [x0 + li, D / 2 - li - lw], [W / 2 - li - lw, D / 2 - li - lw]].forEach(([lx, ly], i) => {
  sofa.part(`leg-${i + 1}`, blk(lx, ly, 0, lx + lw, ly + lw, legH).color(legs));
});
// Frame: base plinth, back, arms
sofa.part('base', blk(x0, y0, legH, W / 2, D / 2, 300).color(fabric));
sofa.part('back', blk(x0 + armW, D / 2 - 200, 290, W / 2 - armW, D / 2, 820).color(fabric));
sofa.part('arm-left', blk(x0, y0, 290, x0 + armW, D / 2, 620).color(fabric));
sofa.part('arm-right', blk(W / 2 - armW, y0, 290, W / 2, D / 2, 620).color(fabric));
// Cushions
for (let i = 0; i < n; i++) {
  const cx = x0 + armW + i * seatW;
  sofa.part(`seat-${i + 1}`, blk(cx + 8, y0 + 10, 290, cx + seatW - 8, D / 2 - 200, 440).color(cushion));
  sofa.part(`back-cushion-${i + 1}`, blk(cx + 10, D / 2 - 360, 430, cx + seatW - 10, D / 2 - 200, 780).color(cushion));
}

return sofa.model();
