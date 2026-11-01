// Original kernelCAD low-poly bookshelf loudspeaker: a box cabinet with a
// dark front baffle carrying a woofer cone and a dome tweeter in trim rings,
// a bass port and small feet, or covered by a cloth grille.
// Millimetres, Z up, base on z = 0 centred on x = y = 0. Drivers face -Y.

meta({
  name: 'bookshelf-speaker',
  license: 'CC0-1.0',
  title: 'Bookshelf speaker',
  description: 'Bookshelf hi-fi loudspeaker box with a woofer cone, dome tweeter and bass port on a front baffle, or a cloth grille cover. Knobs: size, grille, cabinet, baffle, cone, trim and grille colours.',
  tags: ['speaker', 'loudspeaker', 'bookshelf speaker', 'hi-fi', 'stereo', 'audio', 'woofer', 'music'],
  kit: 'electronics',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'living-room', 'bedroom', 'office', 'desk', 'study'],
  triangleBudget: 280,
});

const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Size' });
const grille = param('grille', 'off', { choices: ['off', 'on'], label: 'Grille' });
const cabinet = param('cabinet', '#6a4126', { label: 'Cabinet' });
const baffle = param('baffle', '#202124', { label: 'Baffle' });
const cone = param('cone', '#34363a', { label: 'Cone' });
const trim = param('trim', '#b1b5bb', { label: 'Trim' });
const cloth = param('cloth', '#3a3c40', { label: 'Grille cloth' });

presets({
  black: { cabinet: '#1d1e20', trim: '#7a7d82' },
  white: { cabinet: '#ecebe7', baffle: '#ecebe7', cone: '#c9a24a', trim: '#2b2c2e', cloth: '#d6d4cf' },
});

const s = size.value === 'small' ? 0.75 : size.value === 'large' ? 1.3 : 1;
const W = 180 * s;
const D = 240 * s;
const H = 300 * s;
const fy = -D / 2;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
const ngon = (r: number, n: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n));
  return p.close();
};
const disc = (r: number, n: number, d: number, x: number, y: number, z: number) => ngon(r, n).extrude(d).rotateX(90).translate(x, y, z);

const sp = assembly('bookshelf-speaker');
const z0 = 10;
sp.part('cabinet', blk(-W / 2, fy + 8, z0, W / 2, D / 2, z0 + H).color(cabinet));
for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
  sp.part(`foot-${sx}-${sy}`, blk(sx * (W / 2 - 22) - 10, sy * (D / 2 - 26) - 10, 0, sx * (W / 2 - 22) + 10, sy * (D / 2 - 26) + 10, z0 + 1).color(baffle));
}
if (grille.value === 'on') {
  sp.part('grille-frame', blk(-W / 2 + 4, fy - 2, z0 + 4, W / 2 - 4, fy + 9, z0 + H - 4).color(baffle));
  sp.part('grille', blk(-W / 2 + 12, fy - 5, z0 + 12, W / 2 - 12, fy, z0 + H - 12).color(cloth));
  sp.part('badge', blk(-W * 0.12, fy - 7, z0 + 22, W * 0.12, fy - 4, z0 + 30).color(trim));
} else {
  sp.part('baffle', blk(-W / 2 + 6, fy, z0 + 6, W / 2 - 6, fy + 9, z0 + H - 6).color(baffle));
  const R = W * 0.37;
  const wz = z0 + H * 0.38;
  sp.part('woofer-ring', disc(R, 10, 5, 0, fy + 1, wz).color(trim));
  sp.part('woofer-cone', ngon(R - 7 * s, 10).loft(ngon(R * 0.32, 10), { spacing: 16 * s, ruled: true }).rotateX(90).translate(0, fy - 3, wz).color(cone));
  sp.part('woofer-cap', disc(R * 0.24, 8, 6, 0, fy - 17 * s, wz).color(trim));
  const tz = z0 + H * 0.8;
  sp.part('tweeter-ring', disc(26 * s, 8, 5, 0, fy + 1, tz).color(trim));
  sp.part('tweeter-dome', ngon(16 * s, 8).loft(ngon(6 * s, 8), { spacing: 9 * s, ruled: true }).rotateX(90).translate(0, fy - 3, tz).color(cone));
  sp.part('port', disc(14 * s, 8, 2, W * 0.27, fy - 0.5, z0 + H * 0.1).color(cone));
}

return sp.model();
