// Original kernelCAD low-poly bathtub: a built-in tub with a panelled apron
// or a freestanding roll-top tub on four feet, a sunken basin, mixer tap and
// optional bath water. Long axis along X. Millimetres, Z up, standing on
// z = 0 centred on x = y = 0. Front faces -Y.

meta({
  name: 'bathtub',
  license: 'CC0-1.0',
  title: 'Bathtub',
  description: 'Bathroom bathtub, built-in with a front apron or freestanding roll-top on feet, with a sunken basin, mixer tap and optional water. Knobs: style, water, tub, feet and tap, and water colours.',
  tags: ['bathtub', 'bath', 'tub', 'clawfoot', 'roll top', 'bathroom'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'bathroom'],
  triangleBudget: 400,
});

const style = param('style', 'freestanding', { choices: ['built-in', 'freestanding'], label: 'Style' });
const water = param('water', 'yes', { choices: ['yes', 'no'], label: 'Water' });
const tub = param('tub', '#f2f1ec', { label: 'Tub' });
const metal = param('metal', '#c9ccd0', { label: 'Feet and tap' });
const waterC = param('waterColor', '#8ec9df', { label: 'Water' });

presets({
  black: { tub: '#2b2d30', metal: '#b8913f' },
  sage: { tub: '#9fb59a', metal: '#e8e6df' },
});

const L = 1700;
const W = 760;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
// Rectangle with chamfered corners, the low-poly stand-in for a rounded tub.
const cham = (w: number, d: number, c: number) =>
  path().moveTo(-w / 2 + c, -d / 2).lineTo(w / 2 - c, -d / 2).lineTo(w / 2, -d / 2 + c).lineTo(w / 2, d / 2 - c)
    .lineTo(w / 2 - c, d / 2).lineTo(-w / 2 + c, d / 2).lineTo(-w / 2, d / 2 - c).lineTo(-w / 2, -d / 2 + c).close();
const slab = (w: number, d: number, c: number, z0: number, z1: number) => cham(w, d, c).extrude(z1 - z0).translate(0, 0, z0);

const b = assembly('bathtub');
const free = style.value === 'freestanding';
const z0 = free ? 120 : 0;
const H = free ? 640 : 560;
const rim = 70;
// Basin: tapered, deeper at the middle than the rim.
const basin = cham(L - 2 * rim - 220, W - 2 * rim - 160, 140).loft(cham(L - 2 * rim, W - 2 * rim, 200), {
  spacing: H - 140 + 20,
  ruled: true,
}).translate(0, 0, z0 + 140);
let shell: Shape;
if (free) {
  shell = cham(L - 300, W - 200, 160).loft([cham(L - 40, W - 30, 220), cham(L, W, 240)], {
    planes: [
      { plane: 'XY', origin: [0, 0, z0] },
      { plane: 'XY', origin: [0, 0, z0 + H - 60] },
      { plane: 'XY', origin: [0, 0, z0 + H] },
    ],
    ruled: true,
  });
} else {
  shell = blk(-L / 2, -W / 2, 0, L / 2, W / 2, H).subtract(blk(-L / 2 + 40, -W / 2 - 10, 0, L / 2 - 40, -W / 2 + 30, 60));
}
b.part('tub', shell.subtract(basin).color(tub));
if (free) {
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy], i) => {
    const x = sx * (L / 2 - 300);
    const y = sy * (W / 2 - 160);
    const foot = path().moveTo(-45, -45).lineTo(45, -45).lineTo(45, 45).lineTo(-45, 45).close()
      .loft(path().moveTo(-35, -35).lineTo(35, -35).lineTo(35, 35).lineTo(-35, 35).close(), { spacing: z0 + 30, ruled: true });
    b.part(`foot-${i + 1}`, foot.translate(x, y, 0).color(metal));
  });
}
if (water.value === 'yes') {
  b.part('water', slab(L - 2 * rim - 120, W - 2 * rim - 80, 170, z0 + 140, z0 + H - 140).color(waterC));
}
// Mixer tap on the rim at the +X end: pillar, spout and two handles.
const tx = L / 2 - rim / 2 - 10;
const tz = z0 + H;
b.part('tap', blk(tx - 18, -18, tz - 5, tx + 18, 18, tz + 170)
  .union(blk(tx - 160, -14, tz + 135, tx + 1, 14, tz + 165))
  .union(blk(tx - 160, -14, tz + 95, tx - 132, 14, tz + 150))
  .union(blk(tx - 12, -80, tz + 60, tx + 12, 80, tz + 84)).color(metal));

return b.model();
