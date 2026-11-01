// Original kernelCAD low-poly laundry basket: a tapered woven hamper with a
// rim band and side handles, open with clothes piled inside or closed with
// a lid. Millimetres, Z up, standing on z = 0 centred on x = y = 0.

meta({
  name: 'laundry-basket',
  license: 'CC0-1.0',
  title: 'Laundry basket',
  description: 'Woven laundry hamper with a rim band and handles, open with a pile of clothes or closed with a lid. Knobs: lid, basket, rim and clothes colours.',
  tags: ['laundry basket', 'hamper', 'basket', 'clothes', 'laundry', 'bathroom', 'bedroom'],
  kit: 'interior',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'bathroom', 'bedroom', 'laundry'],
  triangleBudget: 300,
});

const lid = param('lid', 'open', { choices: ['open', 'closed'], label: 'Lid' });
const basket = param('basket', '#c9a46a', { label: 'Basket' });
const rim = param('rim', '#8a6a48', { label: 'Rim and handles' });
const clothA = param('clothA', '#3c6e9f', { label: 'Clothes A' });
const clothB = param('clothB', '#e8e2d6', { label: 'Clothes B' });

presets({
  grey: { basket: '#9aa0a6', rim: '#5c6066' },
  white: { basket: '#efeee9', rim: '#c9b89a', clothA: '#c2553f' },
});

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const b = assembly('laundry-basket');
const H = 560;
const s = 9;
// Hollow tapered body; the open top shows the clothes inside.
b.part('basket', ngon(170, s).loft(ngon(220, s), { spacing: H, ruled: true })
  .subtract(ngon(158, s).loft(ngon(208, s), { spacing: H, ruled: true }).translate(0, 0, 15)).color(basket));
b.part('rim', ngon(228, s).extrude(30).subtract(ngon(205, s).extrude(50).translate(0, 0, -10)).translate(0, 0, H - 30).color(rim));
for (const sx of [-1, 1]) {
  b.part(`handle-${sx < 0 ? 'left' : 'right'}`, blk(sx * 228 - 18, -60, H - 110, sx * 228 + 18, 60, H - 70).color(rim));
}
if (lid.value === 'closed') {
  b.part('lid', ngon(232, s).loft(ngon(120, s), { spacing: 50, ruled: true }).translate(0, 0, H - 1).color(basket));
  b.part('lid-knob', ngon(30, 6).extrude(30).translate(0, 0, H + 45).color(rim));
} else {
  // Clothes: a slumped mound and a sleeve hanging over the rim.
  b.part('clothes', ngon(195, 7).loft([ngon(150, 7, 0.4), ngon(60, 7)], {
    planes: [
      { plane: 'XY', origin: [0, 0, H - 120] },
      { plane: 'XY', origin: [10, -10, H + 30] },
      { plane: 'XY', origin: [30, -20, H + 110] },
    ],
    ruled: true,
  }).color(clothA));
  b.part('sleeve', blk(-70, -232, H - 200, 40, -205, H + 20).union(blk(-70, -232, H - 1, 40, -120, H + 20)).color(clothB));
  b.part('towel', box(200, 140, 40, true).rotateZ(25).rotateY(-12).translate(-60, 50, H + 60).color(clothB));
}

return b.model();
