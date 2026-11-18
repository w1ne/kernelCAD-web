// Original kernelCAD low-poly landline desk telephone: an office phone with
// a sloped keypad, display and handset resting on a side cradle, or a
// classic rotary phone with a dial and the handset across the top.
// Millimetres, Z up, base on z = 0 centred on x = y = 0. Keypad or dial faces -Y.

meta({
  name: 'desk-phone',
  license: 'CC0-1.0',
  title: 'Desk phone',
  description: 'Landline desk telephone, an office phone with a sloped keypad, display and side handset or a classic rotary dial phone with the handset across the top. Knobs: style, body, handset, keys and display colours.',
  tags: ['telephone', 'phone', 'desk phone', 'landline', 'office phone', 'rotary phone', 'handset', 'keypad'],
  kit: 'electronics',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'office', 'desk', 'retro', 'hotel', 'reception'],
  triangleBudget: 300,
});

const style = param('style', 'office', { choices: ['office', 'rotary'], label: 'Style' });
const body = param('body', '#2c2d31', { label: 'Body' });
const handset = param('handset', '#45484f', { label: 'Handset' });
const keys = param('keys', '#c8cbd0', { label: 'Keys and dial' });
const display = param('display', '#9cc4a8', { label: 'Display' });

presets({
  white: { body: '#e8e6e0', handset: '#dedcd5', keys: '#8a8e94', display: '#a8c8e8' },
  retro: { body: '#a8322b', handset: '#a8322b', keys: '#efe8d8', display: '#efe8d8' },
});

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
const side = (pts: [number, number][], x0: number, x1: number) =>
  extrudePolygon(pts, x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);
const ngon = (r: number, n: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n));
  return p.close();
};
type Shape = ReturnType<typeof box>;

const ph = assembly('desk-phone');
if (style.value === 'office') {
  const W = 240;
  const D = 200;
  const yb = D / 2 - 45; // top of the slope
  const zf = 30;
  const zb = 72;
  const slope = Math.atan2(zb - zf, yb + D / 2);
  const sd = (slope * 180) / Math.PI;
  const zAt = (y: number) => zf + (y + D / 2) * Math.tan(slope);
  // Body: sloped keypad deck on the right, raised flat cradle on the left.
  ph.part('body', side([[-D / 2, 0], [D / 2, 0], [D / 2, zb], [yb, zb], [-D / 2, zf]], -W / 2 + 70, W / 2)
    .union(blk(-W / 2, -D / 2, 0, -W / 2 + 72, D / 2, 52)).color(body));
  // A key on the slope: a small block tilted to the deck angle.
  const onDeck = (s: Shape, x: number, y: number) => s.rotateX(sd).translate(x, y, zAt(y) - 1);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      ph.part(`key-${r}-${c}`, onDeck(box(22, 14, 7, true), 10 + c * 30, -D / 2 + 22 + r * 24).color(keys));
    }
  }
  for (let r = 0; r < 3; r++) ph.part(`fkey-${r}`, onDeck(box(20, 12, 6, true), W / 2 - 22, -D / 2 + 34 + r * 26).color(display));
  ph.part('display', onDeck(box(110, 34, 4, true), 40, yb - 26).color(display));
  // Handset lying along Y on the cradle.
  const hx = -W / 2 + 36;
  ph.part('handset', blk(hx - 16, -D / 2 + 30, 60, hx + 16, D / 2 - 30, 78)
    .union(blk(hx - 26, -D / 2 + 4, 50, hx + 26, -D / 2 + 50, 84))
    .union(blk(hx - 26, D / 2 - 50, 50, hx + 26, D / 2 - 4, 84)).color(handset));
} else {
  const W = 220;
  const D = 230;
  // Rotary body: a ruled loft from a wide base to a narrower top, leaning back.
  const rect = (hx: number, y0: number, y1: number) => path().moveTo(-hx, y0).lineTo(hx, y0).lineTo(hx, y1).lineTo(-hx, y1).close();
  ph.part('body', rect(W / 2, -D / 2, D / 2).loft([rect(W / 2 - 10, -D / 2 + 5, D / 2 - 5), rect(W / 2 - 40, -D / 2 + 70, D / 2 - 30)], {
    planes: [
      { plane: 'XY', origin: [0, 0, 0] },
      { plane: 'XY', origin: [0, 0, 20] },
      { plane: 'XY', origin: [0, 0, 105] },
    ],
    ruled: true,
  }).color(body));
  // Dial on the sloped front face.
  const fs = Math.atan2(85, 65); // front slope from horizontal
  const fd = 90 - (fs * 180) / Math.PI;
  const dy = -D / 2 + 5 + 65 * 0.5;
  const dz = 20 + 85 * 0.5;
  const onFace = (s: Shape) => s.rotateX(90 - fd).translate(0, dy, dz);
  ph.part('dial', onFace(ngon(62, 12).extrude(10).translate(0, 0, -3)).color(keys));
  ph.part('dial-centre', onFace(ngon(22, 8).extrude(14).translate(0, 0, -3)).color(display));
  for (let k = 0; k < 10; k++) {
    const a = ((-60 - k * 28) * Math.PI) / 180;
    ph.part(`hole-${k}`, onFace(blk(-5, -5, 6, 5, 5, 10).translate(42 * Math.cos(a), 42 * Math.sin(a), 0)).color(body));
  }
  // Handset across the top on two cradle prongs.
  for (const sx of [-1, 1]) ph.part(`prong-${sx}`, blk(sx * 55 - 12, 0, 100, sx * 55 + 12, 40, 128).color(body));
  ph.part('handset', blk(-95, 4, 126, 95, 36, 146)
    .union(blk(-120, -2, 116, -70, 42, 150))
    .union(blk(70, -2, 116, 120, 42, 150)).color(handset));
}

return ph.model();
