// Original kernelCAD low-poly hallway bench: a padded seat over a slatted
// shoe shelf, with an optional tall back panel carrying coat hooks and a top
// shelf. Millimetres, Z up, standing on z = 0 centred on x = y = 0. Front
// faces -Y; the back panel stands against a wall at +Y.

meta({
  name: 'hall-bench',
  license: 'CC0-1.0',
  title: 'Hall bench',
  description: 'Entryway bench with a seat cushion and a shoe shelf, optionally with a tall back panel, coat hooks and a hat shelf. Knobs: width, back, shoes, wood, cushion, hook and shoe colours.',
  tags: ['hall bench', 'entryway bench', 'shoe bench', 'hall tree', 'bench', 'hallway', 'mudroom'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'hallway', 'bedroom'],
  triangleBudget: 400,
});

const width = param('width', '1000', { choices: ['800', '1000', '1200'], label: 'Width (mm)' });
const back = param('back', 'yes', { choices: ['yes', 'no'], label: 'Back with hooks' });
const shoes = param('shoes', 'yes', { choices: ['yes', 'no'], label: 'Shoes' });
const wood = param('wood', '#c69c6d', { label: 'Wood' });
const cushion = param('cushion', '#5c6f7d', { label: 'Cushion' });
const hooks = param('hooks', '#2b2927', { label: 'Hooks' });
const shoe = param('shoe', '#6b3f2a', { label: 'Shoes' });

presets({
  white: { wood: '#efeee9', cushion: '#c9b89a' },
  dark: { wood: '#4a3324', cushion: '#8d3b32', hooks: '#b8913f' },
});

const W = Number(width.value);
const D = 380;
const seatZ = 460;
const t = 22;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const b = assembly('hall-bench');
const y1 = D / 2;
const y0 = -D / 2;
b.part('side-left', blk(-W / 2, y0, 0, -W / 2 + t, y1, seatZ - 50).color(wood));
b.part('side-right', blk(W / 2 - t, y0, 0, W / 2, y1, seatZ - 50).color(wood));
b.part('seat', blk(-W / 2, y0, seatZ - 51, W / 2, y1, seatZ - 50 + t).color(wood));
b.part('cushion', blk(-W / 2 + 15, y0 + 15, seatZ - 50 + t - 1, W / 2 - 15, y1 - 15, seatZ + 40).color(cushion));
// Slatted shoe shelf.
for (let i = 0; i < 4; i++) {
  const y = y0 + 30 + i * ((D - 60) / 3);
  b.part(`slat-${i + 1}`, blk(-W / 2 + t - 1, y - 25, 120, W / 2 - t + 1, y + 25, 140).color(wood));
}
if (shoes.value === 'yes') {
  // Pairs of shoes as wedge blocks, toes forward.
  const pair = (x: number, z: number, sz: number) => {
    for (const dx of [-45, 45]) {
      const s = extrudePolygon([[-140 * sz, 0], [130 * sz, 0], [130 * sz, 60 * sz], [10 * sz, 120 * sz], [-140 * sz, 120 * sz]], 80)
        .translate(0, 0, -40).rotateX(90).rotateZ(90).translate(x + dx, 0, z);
      b.part(`shoe-${Math.round(x)}-${Math.round(z)}-${dx < 0 ? 'l' : 'r'}`, s.color(shoe));
    }
  };
  pair(-W / 4, 139, 0.85);
  pair(W / 4 - 20, 139, 1);
  pair(0, 0, 1);
}
if (back.value === 'yes') {
  const top = 1800;
  b.part('back-panel', blk(-W / 2, y1 - 20, 0, W / 2, y1, top).color(wood));
  b.part('hat-shelf', blk(-W / 2, y1 - 260, top - 30, W / 2, y1 - 19, top).color(wood));
  b.part('hook-rail', blk(-W / 2 + 40, y1 - 40, top - 380, W / 2 - 40, y1 - 19, top - 300).color(wood));
  const nh = Math.round(W / 250);
  for (let i = 0; i < nh; i++) {
    const x = -W / 2 + (W * (i + 0.5)) / nh;
    b.part(`hook-${i + 1}`, extrudePolygon([[0, 0], [20, 0], [90, 60], [90, 80], [70, 80], [0, 25]], 18)
      .translate(0, 0, -9).rotateX(90).rotateZ(-90).translate(x, y1 - 39, top - 370).color(hooks));
  }
}

return b.model();
