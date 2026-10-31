// Original kernelCAD low-poly wall panel: 2 m long interior wall with skirting,
// optionally pierced by a framed window with a sill. The wall lies in the XZ
// plane, thickness along Y. Millimetres, Z up, standing on z = 0 centred on x = y = 0.

meta({
  name: 'wall-segment',
  license: 'CC0-1.0',
  title: 'Wall segment',
  description: 'Modular 2 m interior wall panel with skirting boards and an optional framed window or open doorway. Knobs: height, opening, wall, skirting and frame colours.',
  tags: ['wall', 'wall panel', 'partition', 'window', 'room', 'modular', 'building'],
  kit: 'interior',
  category: 'structure',
  origin: 'base',
  compat: ['indoor', 'living-room', 'bedroom', 'kitchen', 'office'],
  triangleBudget: 500,
});

const opening = param('opening', 'window', { choices: ['none', 'window', 'doorway'], label: 'Opening' });
const heightM = param('heightM', '2.5', { choices: ['2.4', '2.5', '2.7', '3'], label: 'Height (m)' });
const wallColor = param('wallColor', '#e9e4d8', { label: 'Wall' });
const skirting = param('skirting', '#f6f5f1', { label: 'Skirting and trim' });
const glass = param('glass', '#9cc3d9', { label: 'Glass' });

presets({
  sage: { wallColor: '#a8b8a0' },
  terracotta: { wallColor: '#d39b7c', skirting: '#efe9de' },
  grey: { wallColor: '#8f9399', skirting: '#e6e6e3' },
});

const W = 2000;
const H = Number(heightM.value) * 1000;
const T = 120;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const wall = assembly('wall-segment');
let body = blk(-W / 2, -T / 2, 0, W / 2, T / 2, H);
// Window: 1200 x 1200 with the sill at 900. Doorway: 900 x 2100 from the floor.
const ow = opening.value === 'window' ? 1200 : 900;
const oz0 = opening.value === 'window' ? 900 : 0;
const oz1 = opening.value === 'window' ? 2100 : 2100;
if (opening.value !== 'none') body = body.subtract(blk(-ow / 2, -T, oz0, ow / 2, T, oz1));
wall.part('wall', body.color(wallColor));

// Skirting on both faces, broken by a doorway.
const skirt = (side: string, y0: number, y1: number) => {
  if (opening.value === 'doorway') {
    wall.part(`skirting-${side}-left`, blk(-W / 2, y0, 0, -ow / 2, y1, 100).color(skirting));
    wall.part(`skirting-${side}-right`, blk(ow / 2, y0, 0, W / 2, y1, 100).color(skirting));
  } else {
    wall.part(`skirting-${side}`, blk(-W / 2, y0, 0, W / 2, y1, 100).color(skirting));
  }
};
skirt('front', -T / 2 - 15, -T / 2 + 1);
skirt('back', T / 2 - 1, T / 2 + 15);

if (opening.value === 'window') {
  const f = 50; // frame width
  wall.part('frame-left', blk(-ow / 2, -30, oz0, -ow / 2 + f, 30, oz1).color(skirting));
  wall.part('frame-right', blk(ow / 2 - f, -30, oz0, ow / 2, 30, oz1).color(skirting));
  wall.part('frame-top', blk(-ow / 2 + f, -30, oz1 - f, ow / 2 - f, 30, oz1).color(skirting));
  wall.part('frame-bottom', blk(-ow / 2 + f, -30, oz0, ow / 2 - f, 30, oz0 + f).color(skirting));
  wall.part('mullion', blk(-f / 2, -25, oz0 + f, f / 2, 25, oz1 - f).color(skirting));
  wall.part('glass', blk(-ow / 2 + f, -6, oz0 + f, ow / 2 - f, 6, oz1 - f).color(glass));
  wall.part('sill', blk(-ow / 2 - 60, -T / 2 - 50, oz0 - 30, ow / 2 + 60, T / 2 + 10, oz0).color(skirting));
} else if (opening.value === 'doorway') {
  wall.part('lining-left', blk(-ow / 2, -T / 2, 0, -ow / 2 + 20, T / 2, oz1).color(skirting));
  wall.part('lining-right', blk(ow / 2 - 20, -T / 2, 0, ow / 2, T / 2, oz1).color(skirting));
  wall.part('lining-head', blk(-ow / 2, -T / 2, oz1 - 20, ow / 2, T / 2, oz1).color(skirting));
}

return wall.model();
