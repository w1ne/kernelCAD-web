// Original kernelCAD low-poly metal railing: two square posts with pyramid
// caps, top and bottom rails, and upright bars with spear tips or a flat top.
// Millimetres, Z up, runs along X; 2 m sections tile end to end.

meta({
  name: 'metal-fence-section',
  license: 'CC0-1.0',
  title: 'Metal fence section',
  description: 'Wrought-iron style railing panel with posts, rails and upright bars with spear or flat tops. Knobs: height, bar count, top style, metal and tip colours.',
  tags: ['fence', 'railing', 'railings', 'iron fence', 'gate', 'barrier', 'park', 'street'],
  kit: 'city-street',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'street', 'park', 'garden'],
  triangleBudget: 600,
});

const heightMm = param('heightMm', '1200', { choices: ['900', '1200', '1800'], label: 'Height (mm)' });
const bars = param('bars', '12', { choices: ['8', '12', '16'], label: 'Bars' });
const top = param('top', 'spear', { choices: ['spear', 'flat'], label: 'Bar tops' });
const metal = param('metal', '#22262a', { label: 'Metal' });
const tips = param('tips', '#c9a23a', { label: 'Spear tips' });

presets({
  green: { metal: '#1f3d2b', tips: '#1f3d2b' },
  white: { metal: '#e8e8e4', tips: '#e8e8e4' },
});

const H = Number(heightMm.value);
const n = Number(bars.value);
const spear = top.value === 'spear';
const L = 2000;
const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const f = assembly('metal-fence-section');
const pw = 70;
for (const [i, x] of [[1, -L / 2 + pw / 2], [2, L / 2 - pw / 2]] as const) {
  f.part(`post-${i}`, blk(x - pw / 2, -pw / 2, 0, x + pw / 2, pw / 2, H + 60).color(metal));
  f.part(`cap-${i}`, ngon(62, 4, Math.PI / 4).loft(ngon(4, 4, Math.PI / 4), { spacing: 70, ruled: true }).translate(x, 0, H + 60).color(tips));
}
const railTop = spear ? H - 180 : H - 40;
f.part('rail-bottom', blk(-L / 2 + pw - 1, -12, 120, L / 2 - pw + 1, 12, 160).color(metal));
f.part('rail-top', blk(-L / 2 + pw - 1, -12, railTop, L / 2 - pw + 1, 12, railTop + 40).color(metal));
const span = L - 2 * pw;
const barTop = spear ? H - 40 : H - 40;
for (let i = 0; i < n; i++) {
  const x = -span / 2 + (span * (i + 0.5)) / n;
  f.part(`bar-${i + 1}`, blk(x - 10, -10, 60, x + 10, 10, barTop).color(metal));
  if (spear) {
    f.part(`tip-${i + 1}`, ngon(24, 4, Math.PI / 4).loft(ngon(2, 4, Math.PI / 4), { spacing: 90, ruled: true }).translate(x, 0, barTop - 10).color(tips));
  }
}

return f.model();
