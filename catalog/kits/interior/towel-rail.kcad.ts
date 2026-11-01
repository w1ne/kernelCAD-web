// Original kernelCAD low-poly heated towel rail: a ladder of round bars
// between two side tubes on wall stand-offs, with a valve at the foot and an
// optional folded towel over a bar. Origin 'wall': the back sits on the
// y = 0 wall plane, the rail projects toward -Y, centred on x = 0 with the
// middle of its height at z = 0.

meta({
  name: 'towel-rail',
  license: 'CC0-1.0',
  title: 'Heated towel rail',
  description: 'Wall-mounted heated towel rail ladder with stand-offs and valves, optionally holding a folded towel. Knobs: bars, height, towel, rail, towel and stripe colours.',
  tags: ['towel rail', 'towel radiator', 'heated towel rail', 'towel', 'radiator', 'bathroom'],
  kit: 'interior',
  category: 'attachment',
  origin: 'wall',
  compat: ['indoor', 'bathroom'],
  triangleBudget: 500,
});

const bars = param('bars', '10', { choices: ['7', '10', '13'], label: 'Bars' });
const height = param('height', '1000', { choices: ['800', '1000', '1200'], label: 'Height (mm)' });
const towel = param('towel', 'yes', { choices: ['yes', 'no'], label: 'Towel' });
const metal = param('metal', '#c9ccd0', { label: 'Rail' });
const cloth = param('cloth', '#e8e2d6', { label: 'Towel' });
const stripe = param('stripe', '#3c6e9f', { label: 'Towel stripe' });

presets({
  black: { metal: '#2b2d30', cloth: '#d9cfbd' },
  brass: { metal: '#c9a24a', cloth: '#f4f3ef', stripe: '#3f5e45' },
  white: { metal: '#f2f1ec', cloth: '#9cc3d9', stripe: '#f4f3ef' },
});

const n = Number(bars.value);
const H = Number(height.value);
const W = 500;
const off = 70; // tube centre distance from the wall
const ngon = (r: number, s: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < s; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / s), r * Math.sin((2 * Math.PI * k) / s));
  return p.close();
};
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const t = assembly('towel-rail');
for (const sx of [-1, 1]) {
  const s = sx < 0 ? 'left' : 'right';
  t.part(`tube-${s}`, ngon(16, 6).extrude(H).translate(sx * W / 2, -off, -H / 2).color(metal));
  for (const z of [-H / 2 + 120, H / 2 - 120]) {
    t.part(`standoff-${s}-${z > 0 ? 'top' : 'bottom'}`, blk(sx * W / 2 - 10, -off, z - 10, sx * W / 2 + 10, 0, z + 10).color(metal));
  }
  t.part(`valve-${s}`, blk(sx * W / 2 - 18, -off - 18, -H / 2 - 70, sx * W / 2 + 18, -off + 18, -H / 2 + 1).color(metal));
}
const zs: number[] = [];
for (let i = 0; i < n; i++) zs.push(-H / 2 + 60 + ((H - 120) * i) / (n - 1));
zs.forEach((z, i) => {
  t.part(`bar-${i + 1}`, ngon(11, 6).extrude(W).translate(0, 0, -W / 2).rotateY(90).translate(0, -off, z).color(metal));
});
if (towel.value === 'yes') {
  // Towel folded over the third bar from the top: a front and back drop
  // joined by a fold over the bar.
  const bz = zs[n - 3];
  const tw = W - 90;
  const drop = 480;
  t.part('towel', blk(-tw / 2, -off - 30, bz - drop, tw / 2, -off - 12, bz + 14)
    .union(blk(-tw / 2, -off + 12, bz - drop * 0.7, tw / 2, -off + 30, bz + 14))
    .union(blk(-tw / 2, -off - 30, bz + 13, tw / 2, -off + 30, bz + 30)).color(cloth));
  t.part('stripe', blk(-tw / 2 - 1, -off - 33, bz - drop + 60, tw / 2 + 1, -off - 20, bz - drop + 110).color(stripe));
}

return t.model();
