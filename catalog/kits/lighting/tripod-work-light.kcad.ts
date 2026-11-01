// Original kernelCAD low-poly site work light: one or two rectangular flood
// heads with glowing lenses and finned backs on a T-bar, raised on a
// telescopic three-legged stand.
// Millimetres, Z up, feet on z = 0 centred on x = y = 0, lenses face -Y.

meta({
  name: 'tripod-work-light',
  license: 'CC0-1.0',
  title: 'Tripod work light',
  description: 'Construction site work light: one or two flood heads with glowing lenses on a T-bar atop a telescopic tripod stand. Knobs: heads, stand height, housing, lens and stand colours.',
  tags: ['work light', 'floodlight', 'site light', 'halogen', 'tripod light', 'construction', 'flood lamp', 'job site'],
  kit: 'lighting',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'garage', 'workshop', 'outdoor', 'industrial', 'night'],
  triangleBudget: 480,
});

const heads = param('heads', '2', { choices: ['1', '2'], label: 'Flood heads' });
const height = param('heightM', '1.8', { choices: ['1.2', '1.8', '2.4'], label: 'Stand height (m)' });
const housing = param('housing', '#e8b818', { label: 'Housing' });
const lens = param('lens', '#fff6d0', { label: 'Lens' });
const stand = param('stand', '#2a2a2c', { label: 'Stand' });

presets({
  orange: { housing: '#e07a22' },
  black: { housing: '#2a2a2c', stand: '#5a6066' },
  off: { lens: '#8a9296' },
});

const Hs = Number(height.value) * 1000;
const ngon = (r: number, k: number) => {
  let p = path().moveTo(r, 0);
  for (let i = 1; i < k; i++) p = p.lineTo(r * Math.cos((2 * Math.PI * i) / k), r * Math.sin((2 * Math.PI * i) / k));
  return p.close();
};
const rod = (p0: [number, number, number], p1: [number, number, number], r: number) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return ngon(r, 6).extrude(len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const w = assembly('tripod-work-light');
const hub = 520;
for (let i = 0; i < 3; i++) {
  const a = (2 * Math.PI * i) / 3 - Math.PI / 2;
  const fx = 520 * Math.cos(a);
  const fy = 520 * Math.sin(a);
  w.part(`leg-${i + 1}`, rod([0, 0, hub + 20], [fx, fy, 16], 11).union(box(44, 44, 24, true).translate(fx, fy, 12)).color(stand));
}
// Telescopic mast: a wide lower tube, a lock collar and a narrow upper tube.
w.part('mast', ngon(20, 8).extrude(Hs * 0.45).translate(0, 0, hub - 40)
  .union(ngon(30, 8).extrude(50).translate(0, 0, hub - 40 + Hs * 0.45 - 30))
  .union(ngon(14, 8).extrude(Hs - hub + 60 - Hs * 0.45 + 30).translate(0, 0, hub - 40 + Hs * 0.45 - 10)).color(stand));

// T-bar and flood heads, each tilted 20 degrees down toward -Y on short brackets.
const n = Number(heads.value);
const span = n === 2 ? 520 : 0;
const top = Hs + 20;
if (n === 2) w.part('t-bar', blk(-span / 2 - 20, -20, top, span / 2 + 20, 20, top + 40).color(stand));
for (let i = 0; i < n; i++) {
  const x = n === 2 ? (i === 0 ? -span / 2 : span / 2) : 0;
  const hz = top + 210;
  const head = blk(-160, -55, -120, 160, 45, 120)
    .union(blk(-140, 44, -100, 140, 70, -70)).union(blk(-140, 44, -20, 140, 70, 10)).union(blk(-140, 44, 60, 140, 70, 90));
  w.part(`head-${i + 1}`, head.rotateX(-20).translate(x, 0, hz).color(housing));
  w.part(`lens-${i + 1}`, blk(-135, -64, -98, 135, -50, 98).rotateX(-20).translate(x, 0, hz).color(lens));
  // U bracket from the bar up to the head's side pivots.
  w.part(`bracket-${i + 1}`, blk(x - 185, -15, top + 30, x + 185, 15, top + 50)
    .union(blk(x - 185, -15, top + 30, x - 160, 15, hz + 10))
    .union(blk(x + 160, -15, top + 30, x + 185, 15, hz + 10)).color(stand));
}

return w.model();
