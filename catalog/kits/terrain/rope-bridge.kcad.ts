// Original kernelCAD low-poly rope bridge: a sagging plank walkway slung
// between two pairs of tall log posts, with sagging hand ropes and vertical
// hanger ropes. Spans along Y; the deck ends sit at the chosen height so it
// crosses between cliff or platform tops of the same height on the 2 m grid.

meta({
  name: 'rope-bridge',
  license: 'CC0-1.0',
  title: 'Rope bridge',
  description: 'Sagging plank rope bridge slung between tall log posts, with hand ropes and hangers, for crossing chasms between cliff tops. Knobs: span, deck end height, sag, plank, post and rope colours.',
  tags: ['bridge', 'rope bridge', 'suspension bridge', 'planks', 'chasm', 'canyon', 'jungle', 'adventure', 'terrain', 'grid'],
  kit: 'terrain',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'mountain', 'jungle', 'forest'],
  triangleBudget: 1100,
});

const spanM = param('spanM', '6', { choices: ['4', '6', '8'], label: 'Span (m)' });
const endM = param('endM', '2', { choices: ['1', '2', '3'], label: 'Deck end height (m)' });
const sagP = param('sag', 'medium', { choices: ['low', 'medium', 'deep'], label: 'Sag' });
const plank = param('plank', '#a87a48', { label: 'Planks' });
const post = param('post', '#6a4a30', { label: 'Posts' });
const rope = param('rope', '#d6c08a', { label: 'Rope' });

presets({
  weathered: { plank: '#9a9282', post: '#5f574c', rope: '#bdb39a' },
  jungle: { plank: '#8a6a3a', post: '#4a3a24', rope: '#a8b06a' },
});

const L = Number(spanM.value) * 1000;
const E = Number(endM.value) * 1000;
// Keep the low point of the deck at least 0.3 m off the ground.
const sag = Math.min(E - 300, (sagP.value === 'low' ? 0.04 : sagP.value === 'deep' ? 0.12 : 0.08) * L);
const W = 1000;
const railH = 900;
const pr = 80;

// Deck height at y: a parabola through both ends with its low point mid-span.
const zAt = (y: number) => E - sag * (1 - (2 * y / L) ** 2);
const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) p = p.lineTo(r * Math.cos(rot + (2 * Math.PI * k) / s), r * Math.sin(rot + (2 * Math.PI * k) / s));
  return p.close();
};
// Straight rope piece of square section between two (y, z) points at x.
const ropeSeg = (x: number, y0: number, z0: number, y1: number, z1: number, th = 30) => {
  const len = Math.hypot(y1 - y0, z1 - z0);
  const ang = (Math.atan2(z1 - z0, y1 - y0) * 180) / Math.PI;
  return box(th, len + th, th, true).rotateX(ang).translate(x, (y0 + y1) / 2, (z0 + z1) / 2);
};

const rb = assembly('rope-bridge');
// Posts: a pair at each end, from the ground to above the hand ropes.
for (const end of [-1, 1]) {
  for (const side of [-1, 1]) {
    rb.part(`post-${end < 0 ? 'a' : 'b'}-${side < 0 ? 'l' : 'r'}`, ngon(pr, 6).loft(ngon(pr * 0.8, 6), { spacing: E + railH + 250, ruled: true })
      .translate(side * (W / 2 + 40), end * (L / 2 + pr), 0).color(post));
  }
  rb.part(`crossbar-${end < 0 ? 'a' : 'b'}`, box(W + 240, 110, 110, true).translate(0, end * (L / 2 + pr), E - 70).color(post));
}
// Planks along the curve, each tilted to the local slope.
const pw = 160;
const n = Math.floor(L / (pw + 40));
for (let i = 0; i < n; i++) {
  const y = -L / 2 + (L * (i + 0.5)) / n;
  const slope = (Math.atan((sag * 8 * y) / (L * L)) * 180) / Math.PI;
  const ex = 40 * Math.sin(i * 2.7);
  rb.part(`plank-${i + 1}`, box(W - 60 + ex, pw, 40, true).rotateX(slope).rotateZ(2 * Math.sin(i * 1.3)).translate(0, y, zAt(y) - 20).color(plank));
}
// Under-ropes carrying the planks, hand ropes and hangers in segments.
const segs = 6;
for (const side of [-1, 1]) {
  const s = side < 0 ? 'l' : 'r';
  for (let k = 0; k < segs; k++) {
    const y0 = -L / 2 - pr + ((L + 2 * pr) * k) / segs;
    const y1 = -L / 2 - pr + ((L + 2 * pr) * (k + 1)) / segs;
    const c = (y: number) => zAt(Math.max(-L / 2, Math.min(L / 2, y)));
    rb.part(`deck-rope-${s}-${k + 1}`, ropeSeg(side * (W / 2 - 40), y0, c(y0) - 45, y1, c(y1) - 45).color(rope));
    // Hand rope sags less than the deck.
    const hz = (y: number) => E + railH - (E - c(y)) * 0.55;
    rb.part(`hand-rope-${s}-${k + 1}`, ropeSeg(side * (W / 2 + 40), y0, hz(y0), y1, hz(y1)).color(rope));
    if (k > 0) {
      rb.part(`hanger-${s}-${k}`, box(20, 20, hz(y0) - c(y0) + 40, true).translate(side * (W / 2), y0, (hz(y0) + c(y0) - 40) / 2).color(rope));
    }
  }
}

return rb.model();
