// Original kernelCAD low-poly straight staircase: treads and risers between
// two stringers, with an optional handrail on balusters and a newel post.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0. The bottom step
// faces -Y and the flight climbs toward +Y.

meta({
  name: 'staircase',
  license: 'CC0-1.0',
  title: 'Staircase',
  description: 'Straight interior staircase with treads, risers, stringers and an optional handrail with balusters and newel post. Knobs: steps, width, handrail side, tread, riser and rail colours.',
  tags: ['staircase', 'stairs', 'steps', 'stair', 'handrail', 'banister', 'flight'],
  kit: 'interior',
  category: 'structure',
  origin: 'base',
  compat: ['indoor', 'hallway', 'house', 'loft'],
  triangleBudget: 800,
});

const steps = param('steps', '14', { choices: ['8', '12', '14', '16'], label: 'Steps' });
const width = param('width', '900', { choices: ['800', '900', '1100'], label: 'Width (mm)' });
const rail = param('rail', 'right', { choices: ['none', 'left', 'right', 'both'], label: 'Handrail' });
const tread = param('tread', '#b98a5a', { label: 'Treads' });
const riser = param('riser', '#f2f1ec', { label: 'Risers and stringers' });
const railC = param('railColor', '#5a3a27', { label: 'Handrail' });

presets({
  oak: { tread: '#c69c6d', riser: '#c69c6d', railColor: '#8a6a48' },
  dark: { tread: '#3b3d42', riser: '#efeee9', railColor: '#2b2927' },
});

const n = Number(steps.value);
const W = Number(width.value);
const rise = 180;
const go = 250;
const L = n * go;
const Hh = n * rise;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
const side = (pts: [number, number][], x0: number, t: number) =>
  extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(x0, 0, 0);

const s = assembly('staircase');
const y0 = -L / 2;
const st = 40;
// Stringers: a sloped band from the floor to the top landing edge.
const str: [number, number][] = [[y0, 0], [y0 + go, 0], [y0 + L, Hh - rise - 60], [y0 + L, Hh + 40], [y0 + L - 30, Hh + 40], [y0, rise + 40]];
s.part('stringer-left', side(str, -W / 2 - st, st).color(riser));
s.part('stringer-right', side(str, W / 2, st).color(riser));
for (let i = 0; i < n; i++) {
  const y = y0 + i * go;
  const z = (i + 1) * rise;
  s.part(`riser-${i + 1}`, blk(-W / 2 - 1, y + 10, z - rise, W / 2 + 1, y + 30, z - 25).color(riser));
  s.part(`tread-${i + 1}`, blk(-W / 2 - 1, y - 20, z - 30, W / 2 + 1, y + go, z).color(tread));
}
const sides = rail.value === 'both' ? [-1, 1] : rail.value === 'left' ? [-1] : rail.value === 'right' ? [1] : [];
for (const sx of sides) {
  const x = sx * (W / 2 + st / 2);
  const rh = 900;
  s.part(`newel-${sx}`, blk(x - 45, y0 + 10, 0, x + 45, y0 + 100, rise + rh + 120).color(railC));
  // Handrail: a sloped bar parallel to the pitch line.
  const ang = (Math.atan2(Hh, L) * 180) / Math.PI;
  const len = Math.hypot(L - 100, Hh - rise);
  s.part(`handrail-${sx}`, box(60, len, 50, true).rotateX(ang).translate(x, y0 + 55 + (L - 100) / 2, rise + rh + (Hh - rise) / 2 + 30).color(railC));
  for (let i = 1; i < n; i += 2) {
    const y = y0 + i * go + go / 2;
    const zt = (i + 1) * rise;
    const zr = rise + rh + ((y - y0 - 55) * (Hh - rise)) / (L - 100) + 10;
    s.part(`baluster-${sx}-${i}`, blk(x - 14, y - 14, zt - 1, x + 14, y + 14, zr).color(railC));
  }
}

return s.model();
