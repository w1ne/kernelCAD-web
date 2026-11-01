// Original kernelCAD low-poly picnic hamper: a rectangular wicker body
// built from alternating proud and sunken courses, a hinged flat lid with a
// carry handle and two leather straps; open, it shows a checked cloth.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, straps towards -Y.

meta({
  name: 'picnic-basket',
  license: 'CC0-1.0',
  title: 'Picnic basket',
  description: 'Rectangular wicker picnic hamper with a hinged lid, carry handle and two buckled leather straps, shut or open over a cloth. Knobs: size, lid, wicker, band, strap and cloth colours.',
  tags: ['picnic basket', 'hamper', 'basket', 'wicker', 'picnic', 'park', 'summer'],
  kit: 'containers',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'indoor', 'park', 'garden', 'kitchen', 'farm'],
  triangleBudget: 520,
});

const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Size' });
const lid = param('lid', 'closed', { choices: ['closed', 'open'], label: 'Lid' });
const wicker = param('wicker', '#c99a58', { label: 'Wicker' });
const band = param('band', '#a87a40', { label: 'Woven bands' });
const strap = param('strap', '#6a3a22', { label: 'Straps and handle' });
const cloth = param('cloth', '#d8403a', { label: 'Cloth' });

presets({
  dark: { wicker: '#8a6440', band: '#6e4c2e', strap: '#3a2418' },
  blue: { cloth: '#3a6ac8', strap: '#2a2a2c' },
});

const s = size.value === 'small' ? 0.75 : size.value === 'large' ? 1.3 : 1;
const L = 460 * s;
const W = 300 * s;
const H = 220 * s;
const LH = 45 * s; // lid thickness

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const p = assembly('picnic-basket');
// Woven body: a slightly inset core with proud cane courses wrapped round it
// on alternate rows, so the sides read as two-tone woven bands.
const courses = 5;
const zs = Array.from({ length: courses + 1 }, (_, i) => (H * i) / courses);
p.part('body', blk(-L / 2 + 6 * s, -W / 2 + 6 * s, 0, L / 2 - 6 * s, W / 2 - 6 * s, H).color(wicker));
for (let i = 0; i < courses; i += 2) {
  p.part(`weave-${i / 2 + 1}`, blk(-L / 2, -W / 2, zs[i] + 4 * s, L / 2, W / 2, zs[i + 1] - 4 * s).color(band));
}
p.part('rim', blk(-L / 2 - 8 * s, -W / 2 - 8 * s, H - 18 * s, L / 2 + 8 * s, W / 2 + 8 * s, H + 3 * s).color(band));

// Lid, handle and the lid end of each strap are built shut, then swung back
// about the rear hinge line when open.
const hingeY = W / 2 + 8 * s;
const swing = (sh: Shape) => (lid.value === 'open' ? sh.translate(0, -hingeY, -H).rotateX(-100).translate(0, hingeY, H) : sh);
const lidShape = path().moveTo(-L / 2 - 10 * s, -W / 2 - 10 * s).lineTo(L / 2 + 10 * s, -W / 2 - 10 * s).lineTo(L / 2 + 10 * s, W / 2 + 10 * s).lineTo(-L / 2 - 10 * s, W / 2 + 10 * s).close()
  .loft(path().moveTo(-L / 2 + 15 * s, -W / 2 + 15 * s).lineTo(L / 2 - 15 * s, -W / 2 + 15 * s).lineTo(L / 2 - 15 * s, W / 2 - 15 * s).lineTo(-L / 2 + 15 * s, W / 2 - 15 * s).close(), { spacing: LH, ruled: true })
  .translate(0, 0, H - 1);
p.part('lid', swing(lidShape).color(wicker));
// Handle: two posts and a bar, standing on the lid along X.
const ht = H + LH + 70 * s;
p.part('handle', swing(blk(-L * 0.22, -12 * s, H + LH - 5, -L * 0.22 + 22 * s, 12 * s, ht)
  .union(blk(L * 0.22 - 22 * s, -12 * s, H + LH - 5, L * 0.22, 12 * s, ht))
  .union(blk(-L * 0.22, -14 * s, ht - 22 * s, L * 0.22, 14 * s, ht))).color(strap));

// Straps: down the front of the body, with a buckle, then over the lid.
for (const sx of [-1, 1]) {
  const x = sx * L * 0.28;
  const t = sx < 0 ? 'l' : 'r';
  p.part(`strap-${t}`, blk(x - 18 * s, -W / 2 - 12 * s, H * 0.35, x + 18 * s, -W / 2 + 2, H - 17 * s).color(strap));
  p.part(`buckle-${t}`, blk(x - 24 * s, -W / 2 - 16 * s, H * 0.48, x + 24 * s, -W / 2 - 8 * s, H * 0.62).color(band));
  p.part(`lid-strap-${t}`, swing(blk(x - 18 * s, -W / 2 - 14 * s, H - 20 * s, x + 18 * s, -W / 2 - 6 * s, H + LH - 5 * s)
    .union(blk(x - 18 * s, -W / 2 - 14 * s, H + LH - 9 * s, x + 18 * s, -W / 2 + 60 * s, H + LH + 4 * s))).color(strap));
}

if (lid.value === 'open') {
  // A rumpled cloth heaped in the open basket, its corner over the front.
  p.part('cloth', path().moveTo(-L / 2 + 10 * s, -W / 2 + 10 * s).lineTo(L / 2 - 10 * s, -W / 2 + 10 * s).lineTo(L / 2 - 10 * s, W / 2 - 10 * s).lineTo(-L / 2 + 10 * s, W / 2 - 10 * s).close()
    .loft(path().moveTo(-L * 0.3, -W * 0.2).lineTo(L * 0.15, -W * 0.3).lineTo(L * 0.32, W * 0.15).lineTo(-L * 0.2, W * 0.25).close(), { spacing: 50 * s, ruled: true })
    .translate(0, 0, H - 5)
    .union(extrudePolygon([[-L * 0.12, -W / 2 - 14 * s], [L * 0.12, -W / 2 - 14 * s], [0, -W / 2 + 40 * s]], 6 * s).translate(0, 0, H - 1))
    .union(extrudePolygon([[-L * 0.1, 0], [L * 0.1, 0], [0, -110 * s]], 6 * s).rotateX(90).translate(0, -W / 2 - 8 * s, H + 2))
    .color(cloth));
}

return p.model();
