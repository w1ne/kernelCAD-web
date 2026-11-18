// Original kernelCAD low-poly toilet: a close-coupled WC with a pedestal,
// tapered bowl, seat ring, lid (closed or raised), cistern and flush button.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0. Front faces -Y,
// the cistern backs onto a wall at +Y.

meta({
  name: 'toilet',
  license: 'CC0-1.0',
  title: 'Toilet',
  description: 'Close-coupled toilet with a ceramic bowl and pedestal, cistern with flush button, seat and a closed or raised lid. Knobs: lid, ceramic, seat and button colours.',
  tags: ['toilet', 'wc', 'loo', 'lavatory', 'bathroom', 'restroom', 'sanitary'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'bathroom', 'restroom'],
  triangleBudget: 400,
});

const lid = param('lid', 'closed', { choices: ['closed', 'open'], label: 'Lid' });
const ceramic = param('ceramic', '#f4f3ef', { label: 'Ceramic' });
const seat = param('seat', '#e6e4dd', { label: 'Seat and lid' });
const button = param('button', '#b9bcbf', { label: 'Flush button' });

presets({
  wood: { seat: '#a8703f', button: '#b8913f' },
  black: { ceramic: '#2b2d30', seat: '#2b2d30', button: '#c9ccd0' },
});

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
// Egg-shaped ring: an ellipse stretched toward the front (-Y).
const egg = (rx: number, ry: number, cy: number, n = 12) => {
  const pt = (k: number) => {
    const a = (2 * Math.PI * k) / n - Math.PI / 2;
    const s = Math.sin(a);
    return [rx * Math.cos(a) * (1 - 0.18 * Math.max(0, -s)), cy + ry * s] as const;
  };
  let p = path().moveTo(pt(0)[0], pt(0)[1]);
  for (let k = 1; k < n; k++) p = p.lineTo(pt(k)[0], pt(k)[1]);
  return p.close();
};

const yo = -40; // shift so the footprint is centred on y = 0
const seatZ = 400;
const t = assembly('toilet');
// Pedestal flaring into the bowl.
t.part('bowl', egg(110, 170, yo + 20).loft([egg(140, 210, yo + 10), egg(185, 250, yo - 10)], {
  planes: [
    { plane: 'XY', origin: [0, 0, 0] },
    { plane: 'XY', origin: [0, 0, 200] },
    { plane: 'XY', origin: [0, 0, seatZ - 20] },
  ],
  ruled: true,
}).subtract(egg(110, 165, yo - 20).loft(egg(150, 215, yo - 10), { spacing: 160, ruled: true }).translate(0, 0, seatZ - 160 - 19))
  .union(blk(-120, yo + 140, 180, 120, yo + 330, seatZ - 20)).color(ceramic));
// Cistern against the wall.
const cy0 = yo + 210;
const cy1 = yo + 400;
t.part('cistern', blk(-190, cy0, seatZ - 21, 190, cy1, 780).color(ceramic));
t.part('cistern-lid', blk(-200, cy0 - 10, 779, 200, cy1 + 5, 810).color(ceramic));
t.part('flush-button', blk(-35, cy0 + 60, 809, 35, cy0 + 120, 822).color(button));
// Seat ring: the egg outline with a hole.
t.part('seat', egg(180, 245, yo - 10).extrude(25).subtract(egg(115, 165, yo - 20).extrude(45).translate(0, 0, -10))
  .translate(0, 0, seatZ - 21).color(seat));
if (lid.value === 'closed') {
  t.part('lid', egg(178, 243, yo - 10).extrude(22).translate(0, 0, seatZ + 3).color(seat));
} else {
  // Raised lid leans back against the cistern, hinged at the seat's rear.
  t.part('lid', egg(178, 243, 0).extrude(22).rotateX(-80).translate(0, cy0 - 30, seatZ - 10).color(seat));
}

return t.model();
