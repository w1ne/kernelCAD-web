// Original kernelCAD low-poly scarecrow: a pole with a cross bar dressed in
// a patched shirt with straw tufts at cuffs and waist, a sack head with a
// stitched face and a wide-brimmed straw hat. Millimetres, Z up, base on
// z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'scarecrow',
  license: 'CC0-1.0',
  title: 'Scarecrow',
  description: 'Field scarecrow on a pole with outstretched shirt sleeves, straw tufts, sack head and wide straw hat. Knobs: hat style, pole, shirt, patch, head, hat and straw colours.',
  tags: ['scarecrow', 'farm', 'field', 'crops', 'halloween', 'straw', 'harvest', 'autumn'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'farm', 'field', 'medieval', 'fantasy', 'halloween'],
  triangleBudget: 360,
});

const hatStyle = param('hatStyle', 'brim', { choices: ['brim', 'pointed'], label: 'Hat' });
const pole = param('pole', '#6e4a2c', { label: 'Pole' });
const shirt = param('shirt', '#a83a2c', { label: 'Shirt' });
const patch = param('patch', '#3f5f8a', { label: 'Patches and face' });
const head = param('head', '#c9b48a', { label: 'Sack head' });
const hat = param('hat', '#9a7a3a', { label: 'Hat' });
const straw = param('straw', '#e0c25a', { label: 'Straw' });

presets({
  halloween: { shirt: '#4a3a5a', patch: '#e07a1e', hat: '#2a2a2c', hatStyle: 'pointed' },
  plaid: { shirt: '#3f6a3a', patch: '#c8302a' },
});

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
const ngon = (r: number, n: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos(rot + (2 * Math.PI * k) / n), r * Math.sin(rot + (2 * Math.PI * k) / n));
  return p.close();
};

const armZ = 1450;
const sc = assembly('scarecrow');
sc.part('pole', blk(-35, -35, 0, 35, 35, 1700).union(blk(-650, -30, armZ - 30, 650, 30, armZ + 30)).color(pole));
// Shirt body: tapering from shoulders to waist; sleeves along the bar.
sc.part('shirt', path().moveTo(-150, -90).lineTo(150, -90).lineTo(150, 90).lineTo(-150, 90).close()
  .loft(path().moveTo(-230, -110).lineTo(230, -110).lineTo(230, 110).lineTo(-230, 110).close(), { spacing: 560, ruled: true })
  .translate(0, 0, armZ - 500)
  .union(blk(-560, -80, armZ - 80, 560, 80, armZ + 60))
  .color(shirt));
sc.part('patch-1', blk(-120, -114, armZ - 330, -30, -108, armZ - 250).color(patch));
sc.part('patch-2', blk(330, -84, armZ - 60, 420, -78, armZ + 30).color(patch));
// Straw tufts: splayed pyramids at the cuffs and below the waist.
for (const sx of [-1, 1]) {
  sc.part(`cuff-straw-${sx < 0 ? 'left' : 'right'}`, ngon(75, 5).loft(ngon(130, 5, 0.6), { spacing: 140, ruled: true }).rotateY(sx * 90).translate(sx * 555, 0, armZ - 10).color(straw));
}
sc.part('waist-straw', ngon(170, 7).loft(ngon(230, 7, 0.4), { spacing: 160, ruled: true }).rotateX(180).translate(0, 0, armZ - 499).color(straw));
// Sack head: a lumpy faceted ball with a stitched mouth and eyes.
sc.part('head', ngon(110, 7).loft([ngon(150, 7, 0.45), ngon(140, 7), ngon(70, 7, 0.45)], {
  planes: [
    { plane: 'XY', origin: [0, 0, armZ + 50] },
    { plane: 'XY', origin: [0, 0, armZ + 140] },
    { plane: 'XY', origin: [0, 0, armZ + 260] },
    { plane: 'XY', origin: [0, 0, armZ + 330] },
  ],
  ruled: true,
}).color(head));
sc.part('mouth', blk(-80, -150, armZ + 120, 80, -138, armZ + 135).color(patch));
sc.part('eye-left', blk(-70, -150, armZ + 190, -30, -136, armZ + 230).color(patch));
sc.part('eye-right', blk(30, -150, armZ + 190, 70, -136, armZ + 230).color(patch));
if (hatStyle.value === 'brim') {
  sc.part('hat', ngon(300, 9).extrude(25).translate(0, 0, armZ + 290)
    .union(ngon(140, 9).loft(ngon(105, 9), { spacing: 150, ruled: true }).translate(0, 0, armZ + 300))
    .color(hat));
} else {
  sc.part('hat', ngon(260, 9).extrude(25).translate(0, 0, armZ + 290)
    .union(ngon(140, 9).loft(ngon(15, 9), { spacing: 380, ruled: true }).rotateY(10).translate(0, 0, armZ + 300))
    .color(hat));
}

return sc.model();
