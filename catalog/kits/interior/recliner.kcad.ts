// Original kernelCAD low-poly recliner: a plump upholstered armchair with a
// pillow back, padded arms and a footrest that is tucked away or raised with
// the back reclined. Boxes and ruled lofts. Millimetres, Z up, standing on
// z = 0 centred on x = y = 0. Front faces -Y.

meta({
  name: 'recliner',
  license: 'CC0-1.0',
  title: 'Recliner',
  description: 'Overstuffed recliner armchair with padded arms and a pillow back, upright or reclined with the footrest raised. Knobs: position, upholstery, cushion and base colours.',
  tags: ['recliner', 'armchair', 'lounge chair', 'lazy boy', 'chair', 'seat', 'living room'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'living-room', 'tv-room'],
  triangleBudget: 300,
});

const position = param('position', 'reclined', { choices: ['upright', 'reclined'], label: 'Position' });
const fabric = param('fabric', '#7a4a32', { label: 'Upholstery' });
const cushion = param('cushion', '#8d5a3e', { label: 'Cushions' });
const base = param('base', '#2b2927', { label: 'Base' });

presets({
  grey: { fabric: '#5c6066', cushion: '#6d7378' },
  navy: { fabric: '#2f3e57', cushion: '#405270' },
  cream: { fabric: '#d9cfbd', cushion: '#e8e0d0', base: '#6b4a2e' },
});

const W = 900;
const D = 900;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
// A pillowy block: a ruled loft that rounds over from a full rectangle to a
// slightly inset top.
const pillow = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, inset = 25) => {
  const r = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
  const w = x1 - x0;
  const d = y1 - y0;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return r(w, d).loft([r(w, d), r(w - inset * 2, d - inset * 2)], {
    planes: [
      { plane: 'XY', origin: [cx, cy, z0] },
      { plane: 'XY', origin: [cx, cy, z1 - inset] },
      { plane: 'XY', origin: [cx, cy, z1] },
    ],
    ruled: true,
  });
};

const reclined = position.value === 'reclined';
const r = assembly('recliner');
// The raised footrest pushes the footprint forward; shift so it stays centred.
const yo = reclined ? 70 : 0;
const add = (name: string, sh: Shape) => r.part(name, sh.translate(0, yo, 0));
const armW = 170;
add('base', blk(-W / 2 + 40, -D / 2 + 60, 0, W / 2 - 40, D / 2 - 60, 60).color(base));
add('body', blk(-W / 2 + armW - 5, -D / 2 + 30, 59, W / 2 - armW + 5, D / 2 - 40, 300).color(fabric));
for (const sx of [-1, 1]) {
  const x0 = sx < 0 ? -W / 2 : W / 2 - armW;
  add(`arm-${sx < 0 ? 'left' : 'right'}`, pillow(x0, -D / 2 + 20, 59, x0 + armW, D / 2 - 30, 620, 40).color(fabric));
}
add('seat', pillow(-W / 2 + armW - 2, -D / 2 + 30, 299, W / 2 - armW + 2, D / 2 - 200, 470).color(cushion));
// Back: built upright at the rear, then tipped back about its bottom edge.
const tip = reclined ? -28 : -8;
const back = (sh: Shape) => sh.translate(0, -(D / 2 - 120), -300).rotateX(tip).translate(0, D / 2 - 120, 300);
add('back', back(blk(-W / 2 + armW - 2, D / 2 - 200, 290, W / 2 - armW + 2, D / 2 - 40, 1020)).color(fabric));
add('back-pillow', back(pillow(-W / 2 + armW + 10, D / 2 - 330, 460, W / 2 - armW - 10, D / 2 - 199, 960, 30)
  .translate(0, 0, 0)).color(cushion));
if (reclined) {
  // Footrest raised level with the seat on a short scissor bracket.
  add('footrest', pillow(-W / 2 + armW + 10, -D / 2 - 420, 300, W / 2 - armW - 10, -D / 2 + 31, 410, 20).color(cushion));
  add('footrest-bracket', blk(-60, -D / 2 - 250, 200, 60, -D / 2 + 40, 301).color(base));
} else {
  add('footrest-front', blk(-W / 2 + armW + 10, -D / 2 + 15, 120, W / 2 - armW - 10, -D / 2 + 31, 290).color(fabric));
}

return r.model();
