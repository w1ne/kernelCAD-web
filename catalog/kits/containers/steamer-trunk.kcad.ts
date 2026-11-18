// Original kernelCAD low-poly steamer trunk: a canvas-covered box and lid
// wrapped with wooden slats, brass corner caps, a lock plate, end handles
// and two leather straps; the lid is flat or a low dome.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, lock towards -Y.

meta({
  name: 'steamer-trunk',
  license: 'CC0-1.0',
  title: 'Steamer trunk',
  description: 'Vintage travel steamer trunk with wooden slats, brass corners, lock plate, end handles and leather straps, with a flat or domed lid. Knobs: size, top, straps, canvas, slat, brass and strap colours.',
  tags: ['trunk', 'steamer trunk', 'luggage', 'chest', 'travel', 'vintage', 'attic', 'storage'],
  kit: 'containers',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'attic', 'house', 'harbour', 'train', 'victorian'],
  triangleBudget: 520,
});

const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Size' });
const top = param('top', 'flat', { choices: ['flat', 'domed'], label: 'Lid' });
const straps = param('straps', '2', { choices: ['0', '2'], label: 'Straps' });
const canvas = param('canvas', '#3f5a48', { label: 'Canvas' });
const slat = param('slat', '#a8743f', { label: 'Wooden slats' });
const brass = param('brass', '#c9a43a', { label: 'Brass fittings' });
const strap = param('strap', '#6a3a22', { label: 'Leather straps' });

presets({
  'red-canvas': { canvas: '#8a2a24', slat: '#7a4a2a' },
  black: { canvas: '#2a2a2c', slat: '#6a4a30', brass: '#a8a8a0' },
  tan: { canvas: '#b88a5a', slat: '#6a4428', strap: '#3a2418' },
});

const s = size.value === 'small' ? 0.7 : size.value === 'large' ? 1.25 : 1;
const L = 900 * s;
const D = 520 * s;
const HB = 380 * s; // body height
const HL = 150 * s; // lid height (to the eaves for the dome)
const sl = 14 * s; // slat proud
const domed = top.value === 'domed';
const dome = domed ? 90 * s : 0;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
// Lid cross-section in (y, z): rectangle with an optional low four-facet dome.
const lidProfile = (d: number, h: number, rise: number): [number, number][] => {
  const r = d / 2;
  if (rise === 0) return [[-r, 0], [r, 0], [r, h], [-r, h]];
  return [[-r, 0], [r, 0], [r, h], [r * 0.6, h + rise * 0.7], [0, h + rise], [-r * 0.6, h + rise * 0.7], [-r, h]];
};
const lidBody = (d: number, h: number, rise: number, len: number) =>
  extrudePolygon(lidProfile(d, h, rise), len).rotateX(90).rotateZ(90).translate(-len / 2, 0, 0);

const t = assembly('steamer-trunk');
t.part('body', blk(-L / 2, -D / 2, 0, L / 2, D / 2, HB).color(canvas));
t.part('lid', lidBody(D + 8 * s, HL, dome, L + 8 * s).translate(0, 0, HB).color(canvas));

// Horizontal slats round the body (two) and lid edge, plus vertical end slats.
const ring = (z0: number, z1: number) => blk(-L / 2 - sl, -D / 2 - sl, z0, L / 2 + sl, D / 2 + sl, z1);
t.part('slats', ring(40 * s, 80 * s)
  .union(ring(HB - 60 * s, HB - 20 * s))
  .union(blk(-L / 2 + 140 * s, -D / 2 - sl, 0, -L / 2 + 180 * s, D / 2 + sl, HB - 20 * s))
  .union(blk(L / 2 - 180 * s, -D / 2 - sl, 0, L / 2 - 140 * s, D / 2 + sl, HB - 20 * s))
  .color(slat));
// Lid: a slat band round the eaves and two slats over the top, all one piece.
t.part('lid-slats', ring(HB + 30 * s, HB + 70 * s)
  .union(lidBody(D + 2 * sl, HL - 24 * s, dome, 40 * s).translate(-L / 2 + 160 * s, 0, HB + 30 * s))
  .union(lidBody(D + 2 * sl, HL - 24 * s, dome, 40 * s).translate(L / 2 - 160 * s, 0, HB + 30 * s))
  .color(slat));

// Brass corner caps at the eight corners, the lock plate and the hasp.
const c = 70 * s;
const caps: [number, number, number][] = [];
for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const z of [0, HB + HL + 4 * s - c]) caps.push([sx, sy, z]);
caps.forEach(([sx, sy, z], i) => {
  const x0 = sx < 0 ? -L / 2 - sl - 3 * s : L / 2 - c;
  const y0 = sy < 0 ? -D / 2 - sl - 3 * s : D / 2 - c;
  t.part(`corner-${i + 1}`, blk(x0, y0, z, x0 + c + sl + 3 * s, y0 + c + sl + 3 * s, z + c).color(brass));
});
t.part('lock', blk(-55 * s, -D / 2 - sl - 8 * s, HB - 90 * s, 55 * s, -D / 2, HB + 60 * s).color(brass));

// End handles: a leather grip on a brass plate at each end.
for (const sx of [-1, 1]) {
  const x = sx * (L / 2);
  t.part(`handle-${sx < 0 ? 'l' : 'r'}`, blk(Math.min(x, x + sx * 30 * s), -90 * s, HB * 0.62, Math.max(x, x + sx * 30 * s), 90 * s, HB * 0.62 + 30 * s)
    .union(blk(Math.min(x, x + sx * 10 * s), -100 * s, HB * 0.55, Math.max(x, x + sx * 10 * s), 100 * s, HB * 0.72))
    .color(strap));
}

if (straps.value === '2') {
  // Leather straps girdling the trunk over the lid, front to back.
  for (const sx of [-1, 1]) {
    const x = sx * L * 0.2;
    const w = 50 * s;
    t.part(`strap-${sx < 0 ? 'l' : 'r'}`, lidBody(D + 2 * sl + 10 * s, HB + HL + 4 * s, dome, w).translate(x, 0, 6 * s).color(strap));
    t.part(`buckle-${sx < 0 ? 'l' : 'r'}`, blk(x - 35 * s, -D / 2 - sl - 14 * s, HB - 130 * s, x + 35 * s, -D / 2 - sl, HB - 80 * s).color(brass));
  }
}

return t.model();
