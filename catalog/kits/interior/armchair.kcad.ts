// Original kernelCAD low-poly armchair. Boxes only; front faces -Y.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0.

meta({
  name: 'armchair',
  license: 'CC0-1.0',
  title: 'Armchair',
  description: 'Single upholstered lounge armchair with seat and back cushions on short wooden feet. Knobs: arm style, fabric, cushion and leg colours.',
  tags: ['armchair', 'chair', 'lounge chair', 'seat', 'living room', 'club chair'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'living-room', 'bedroom', 'office'],
  triangleBudget: 200,
});

const arms = param('arms', 'wide', { choices: ['wide', 'slim'], label: 'Arm style' });
const fabric = param('fabric', '#8a4b3a', { label: 'Frame fabric' });
const cushion = param('cushion', '#a5604c', { label: 'Cushions' });
const legs = param('legs', '#4a3324', { label: 'Legs' });

presets({
  sage: { fabric: '#6f8468', cushion: '#879c80', legs: '#5a4030' },
  leather: { fabric: '#5b3a24', cushion: '#6e4730', legs: '#1f1f1f' },
});

const armW = arms.value === 'wide' ? 200 : 110;
const seatW = 600;
const W = seatW + 2 * armW;
const D = 860;
const legH = 120;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const chair = assembly('armchair');
const x0 = -W / 2;
const y0 = -D / 2;
const li = 40;
const lw = 50;
[[x0 + li, y0 + li], [W / 2 - li - lw, y0 + li], [x0 + li, D / 2 - li - lw], [W / 2 - li - lw, D / 2 - li - lw]].forEach(([lx, ly], i) => {
  chair.part(`leg-${i + 1}`, blk(lx, ly, 0, lx + lw, ly + lw, legH).color(legs));
});
chair.part('base', blk(x0, y0, legH, W / 2, D / 2, 300).color(fabric));
chair.part('back', blk(x0 + armW - 5, D / 2 - 200, 290, W / 2 - armW + 5, D / 2, 860).color(fabric));
chair.part('arm-left', blk(x0, y0, 290, x0 + armW, D / 2, 620).color(fabric));
chair.part('arm-right', blk(W / 2 - armW, y0, 290, W / 2, D / 2, 620).color(fabric));
chair.part('seat', blk(x0 + armW + 5, y0 + 10, 290, W / 2 - armW - 5, D / 2 - 200, 450).color(cushion));
chair.part('back-cushion', blk(x0 + armW + 10, D / 2 - 350, 440, W / 2 - armW - 10, D / 2 - 195, 810).color(cushion));

return chair.model();
