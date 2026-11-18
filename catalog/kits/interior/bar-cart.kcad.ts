// Original kernelCAD low-poly bar cart: a two-tier rolling trolley with a
// tubular frame, lipped trays, a push handle and two wheels, set with
// bottles and glasses. Millimetres, Z up, standing on z = 0 centred on
// x = y = 0. Long side faces -Y.

meta({
  name: 'bar-cart',
  license: 'CC0-1.0',
  title: 'Bar cart',
  description: 'Two-tier rolling bar cart with a handle and wheels, set with bottles and glasses. Knobs: bottles, frame, tray, bottle, second bottle and glass colours.',
  tags: ['bar cart', 'drinks trolley', 'trolley', 'serving cart', 'bar', 'bottles', 'living room'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'living-room', 'dining-room', 'bar', 'hotel'],
  triangleBudget: 500,
});

const bottles = param('bottles', '3', { choices: ['0', '2', '3', '4'], label: 'Bottles' });
const frame = param('frame', '#c9a24a', { label: 'Frame' });
const tray = param('tray', '#2b2d30', { label: 'Trays' });
const bottleA = param('bottleA', '#3f6a3a', { label: 'Bottles A' });
const bottleB = param('bottleB', '#8a4a22', { label: 'Bottles B' });
const glass = param('glass', '#cfe2e8', { label: 'Glasses' });

presets({
  chrome: { frame: '#c9ccd0', tray: '#f2f1ec' },
  black: { frame: '#232323', tray: '#b98a5a' },
});

const nb = Number(bottles.value);
const L = 800;
const D = 450;
const H = 800;
const tube = 22;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
const ngon = (r: number, s: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < s; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / s), r * Math.sin((2 * Math.PI * k) / s));
  return p.close();
};

const c = assembly('bar-cart');
const wr = 80; // wheel radius
const px = L / 2 - tube;
const py = D / 2 - tube;
for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
  const z0 = sx > 0 ? wr : 0;
  c.part(`post-${sx}-${sy}`, blk(sx * px - tube / 2, sy * py - tube / 2, z0, sx * px + tube / 2, sy * py + tube / 2, H).color(frame));
}
// Wheels at the +X end, axle through the posts.
for (const sy of [-1, 1]) {
  c.part(`wheel-${sy < 0 ? 'front' : 'back'}`, ngon(wr, 10).extrude(30).translate(0, 0, -15).rotateX(90).translate(px, sy * (py + 30), wr).color(tray));
}
c.part('axle', ngon(8, 6).extrude(D + 80).translate(0, 0, -(D + 80) / 2).rotateX(90).translate(px, 0, wr).color(frame));
// Handle loop at the -X end.
c.part('handle', blk(-L / 2 - 120, -py - tube / 2, H - 20, -L / 2 - 100, py + tube / 2, H + 2).color(frame));
for (const sy of [-1, 1]) {
  c.part(`handle-arm-${sy < 0 ? 'f' : 'b'}`, blk(-L / 2 - 120, sy * py - tube / 2, H - 20, -px + 1, sy * py + tube / 2, H).color(frame));
}
// Trays with raised lips.
for (const [name, z] of [['lower', 220], ['upper', H - 60]] as const) {
  c.part(`tray-${name}`, blk(-px, -py, z, px, py, z + 50)
    .subtract(blk(-px + 15, -py + 15, z + 12, px - 15, py - 15, z + 80)).color(tray));
}
// Bottles on the upper tray with glasses beside them.
const zt = H - 60 + 11;
const bottle = (x: number, y: number, h: number) =>
  ngon(38, 6).loft([ngon(38, 6), ngon(13, 6), ngon(13, 6)], {
    planes: [
      { plane: 'XY', origin: [x, y, zt] },
      { plane: 'XY', origin: [x, y, zt + h * 0.62] },
      { plane: 'XY', origin: [x, y, zt + h * 0.78] },
      { plane: 'XY', origin: [x, y, zt + h] },
    ],
    ruled: true,
  });
for (let i = 0; i < nb; i++) {
  const x = -px + 90 + i * 100;
  c.part(`bottle-${i + 1}`, bottle(x, 40 - (i % 2) * 70, 300 - (i % 2) * 50).color(i % 2 === 0 ? bottleA : bottleB));
}
for (let i = 0; i < 3; i++) {
  const x = px - 80 - (i % 2) * 70;
  const y = -100 + i * 90;
  c.part(`glass-${i + 1}`, ngon(32, 6).loft(ngon(28, 6), { spacing: 100, ruled: true }).translate(x, y, zt).color(glass));
}

return c.model();
