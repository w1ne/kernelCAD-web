// Original kernelCAD low-poly chain barrier: short posts on square bases with
// faceted ball tops, linked by sagging chains of alternating colour segments.
// Millimetres, Z up, posts along X.

meta({
  name: 'chain-barrier',
  license: 'CC0-1.0',
  title: 'Chain barrier',
  description: 'Row of short posts linked by sagging two-tone chains, for kerbs, car parks and queues. Knobs: post count, sag, post, chain and second chain colours.',
  tags: ['chain', 'barrier', 'post', 'bollard', 'fence', 'kerb', 'parking', 'queue', 'street'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street', 'parking'],
  triangleBudget: 600,
});

const posts = param('posts', '3', { choices: ['2', '3', '4'], label: 'Posts' });
const sag = param('sag', 'medium', { choices: ['shallow', 'medium', 'deep'], label: 'Chain sag' });
const post = param('post', '#2a2c2e', { label: 'Posts' });
const chain = param('chain', '#c8261e', { label: 'Chain' });
const chain2 = param('chain2', '#f2f2ee', { label: 'Chain stripe' });

presets({
  brass: { post: '#b8902f', chain: '#3a3c3f', chain2: '#3a3c3f' },
  safety: { post: '#3a3c3f', chain: '#f2c418', chain2: '#1e1e1e' },
});

const n = Number(posts.value);
const dip = sag.value === 'shallow' ? 90 : sag.value === 'deep' ? 320 : 190;
const spacing = 1500;
const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};

const cb = assembly('chain-barrier');
const hookZ = 780;
for (let i = 0; i < n; i++) {
  const x = (i - (n - 1) / 2) * spacing;
  cb.part(`base-${i + 1}`, box(220, 220, 40, true).translate(x, 0, 20).color(post));
  cb.part(`post-${i + 1}`, ngon(38, 8).extrude(800).translate(x, 0, 30).color(post));
  cb.part(`ball-${i + 1}`, ngon(12, 6).loft([ngon(70, 6, Math.PI / 6), ngon(12, 6)], {
    planes: [
      { plane: 'XY', origin: [x, 0, 820] },
      { plane: 'XY', origin: [x, 0, 880] },
      { plane: 'XY', origin: [x, 0, 950] },
    ],
    ruled: true,
  }).color(post));
}
// Each span: a parabola through the hooks, drawn as straight overlapping segments.
const segs = 8;
for (let i = 0; i < n - 1; i++) {
  const xa = (i - (n - 1) / 2) * spacing + 38;
  const xb = xa + spacing - 76;
  const pt = (u: number) => [xa + (xb - xa) * u, hookZ - dip * 4 * u * (1 - u)] as const;
  for (let k = 0; k < segs; k++) {
    const [x0, z0] = pt(k / segs);
    const [x1, z1] = pt((k + 1) / segs);
    const len = Math.hypot(x1 - x0, z1 - z0) + 20;
    const a = (Math.atan2(z1 - z0, x1 - x0) * 180) / Math.PI;
    const link = box(len, 22, 30, true).rotateY(-a).translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    cb.part(`chain-${i + 1}-${k + 1}`, link.color(k % 2 === 0 ? chain : chain2));
  }
}

return cb.model();
