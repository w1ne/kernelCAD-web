// Original kernelCAD low-poly corner sofa: an L-shaped sectional with a main
// run along X and a return coming forward on the left, seat and back cushions
// and wooden feet. Boxes only. Millimetres, Z up, standing on z = 0 centred
// on x = y = 0. Front of the main run faces -Y.

meta({
  name: 'corner-sofa',
  license: 'CC0-1.0',
  title: 'Corner sofa',
  description: 'L-shaped corner sectional sofa with seat and back cushions on low wooden feet. Knobs: main-run seats, return seats, return side, frame fabric, cushion and leg colours.',
  tags: ['corner sofa', 'sectional', 'l-shaped sofa', 'sofa', 'couch', 'living room', 'lounge'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'living-room', 'office'],
  triangleBudget: 500,
});

const seats = param('seats', '3', { choices: ['2', '3', '4'], label: 'Main-run seats' });
const ret = param('returnSeats', '2', { choices: ['1', '2'], label: 'Return seats' });
const sideK = param('side', 'right', { choices: ['left', 'right'], label: 'Return side' });
const fabric = param('fabric', '#6d7378', { label: 'Frame fabric' });
const cushion = param('cushion', '#8a9196', { label: 'Cushions' });
const legs = param('legs', '#3a2a1e', { label: 'Legs' });

presets({
  navy: { fabric: '#2f3e57', cushion: '#405270', legs: '#1f1f1f' },
  sand: { fabric: '#c9b89a', cushion: '#ddd0b6', legs: '#8a6a48' },
  green: { fabric: '#3f5e45', cushion: '#56785b', legs: '#5a3a27' },
});

const nm = Number(seats.value);
const nr = Number(ret.value);
const sw = 650; // seat width
const arm = 180;
const D = 950; // seat depth incl. back
const bk = 200; // back thickness
const legH = 110;
const W = bk + nm * sw + arm; // main run length along X
const L2 = arm + nr * sw + D; // return length along Y
const mir = sideK.value === 'left' ? 1 : -1; // mirror X for a right-hand return

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => {
  const a = mir * x0;
  const b = mir * x1;
  return box(Math.abs(b - a), y1 - y0, z1 - z0).translate(Math.min(a, b), y0, z0);
};

const s = assembly('corner-sofa');
const xL = -W / 2;
const xR = W / 2;
const yT = L2 / 2;
const yB = -L2 / 2;
const yM = yT - D; // front edge of the main run

// Feet at the outer corners of the L.
[[xL + 30, yB + 30], [xL + 30, yT - 80], [xR - 80, yT - 80], [xR - 80, yM + 30], [xL + D - 80, yB + 30]].forEach(([x, y], i) => {
  s.part(`leg-${i + 1}`, blk(x, y, 0, x + 50, y + 50, legH).color(legs));
});
// Base plinths, backs and arms.
s.part('base-main', blk(xL, yM, legH, xR, yT, 290).color(fabric));
s.part('base-return', blk(xL, yB, legH, xL + D, yM + 1, 290).color(fabric));
s.part('back-main', blk(xL, yT - bk, 280, xR - arm, yT, 800).color(fabric));
s.part('back-return', blk(xL, yB + arm, 280, xL + bk, yT - bk + 1, 800).color(fabric));
s.part('arm-main', blk(xR - arm, yM, 280, xR, yT, 600).color(fabric));
s.part('arm-return', blk(xL, yB, 280, xL + D, yB + arm, 600).color(fabric));

// Seat cushions: main run (the corner seat belongs to it) and the return.
for (let i = 0; i < nm; i++) {
  const x0 = xL + bk + i * sw;
  s.part(`seat-main-${i + 1}`, blk(x0 + 6, yM + 10, 280, x0 + sw - 6, yT - bk, 430).color(cushion));
  s.part(`back-cushion-main-${i + 1}`, blk(x0 + 8, yT - bk - 160, 420, x0 + sw - 8, yT - bk + 1, 760).color(cushion));
}
for (let i = 0; i < nr; i++) {
  const y0 = yB + arm + i * sw;
  s.part(`seat-return-${i + 1}`, blk(xL + bk, y0 + 6, 280, xL + D - 10, y0 + sw - 6, 430).color(cushion));
  s.part(`back-cushion-return-${i + 1}`, blk(xL + bk - 1, y0 + 8, 420, xL + bk + 160, y0 + sw - 8, 760).color(cushion));
}

return s.model();
