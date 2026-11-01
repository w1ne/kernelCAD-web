// Original kernelCAD low-poly bread loaf: a faceted domed crust, as a bloomer,
// a long baguette or a round boule, with pale scored slashes across the top.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, length along X.

meta({
  name: 'bread-loaf',
  license: 'CC0-1.0',
  title: 'Bread loaf',
  description: 'Faceted crusty bread loaf as a bloomer, long baguette or round boule with pale scored slashes on top, for bakeries, kitchens, taverns and food pickups. Knobs: style, crust and score colours.',
  tags: ['bread', 'loaf', 'baguette', 'boule', 'bloomer', 'bakery', 'food', 'pickup'],
  kit: 'food-kitchen',
  category: 'item',
  origin: 'base',
  compat: ['kitchen', 'food', 'market', 'tavern', 'bakery', 'medieval', 'indoor'],
  triangleBudget: 220,
});

const style = param('style', 'bloomer', { choices: ['bloomer', 'baguette', 'round'], label: 'Style' });
const crust = param('crust', '#c98a3e', { label: 'Crust' });
const score = param('score', '#f0d9a2', { label: 'Scores' });

presets({
  rye: { crust: '#6e4026', score: '#b08a5c' },
  'pale white': { crust: '#e2b872', score: '#fbf0d2' },
});

const b = assembly('bread-loaf');
// A thin pale slash lying on a flat top facet, angled across the loaf.
const slash = (len: number, wid: number, x: number, z: number, ang: number) =>
  box(len, wid, 4, true).rotateZ(ang).translate(x, 0, z - 0.5);

if (style.value === 'round') {
  const D = 200;
  const H = 105;
  const ngon = (r: number, rot = 0) => {
    let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
    for (let k = 1; k < 9; k++) p = p.lineTo(r * Math.cos(rot + (2 * Math.PI * k) / 9), r * Math.sin(rot + (2 * Math.PI * k) / 9));
    return p.close();
  };
  const rings: [number, number][] = [[0.88, 0], [1, 0.2], [0.94, 0.55], [0.74, 0.86], [0.5, 1]];
  b.part('crust', ngon(rings[0][0] * D / 2).loft(rings.slice(1).map(([r]) => ngon(r * D / 2)), {
    planes: rings.map(([, z]) => ({ plane: 'XY' as const, origin: [0, 0, z * H] as [number, number, number] })),
    ruled: true,
  }).color(crust));
  // Cross-hatch: two pairs of crossing slashes on the flat crown.
  b.part('scores', slash(D * 0.44, 9, 0, H, 0).translate(0, -18, 0)
    .union(slash(D * 0.44, 9, 0, H, 0).translate(0, 18, 0))
    .union(slash(D * 0.44, 9, 0, H, 90).translate(-18, 0, 0))
    .union(slash(D * 0.44, 9, 0, H, 90).translate(18, 0, 0))
    .color(score));
} else {
  const long = style.value === 'baguette';
  const L = long ? 600 : 300;
  const W = long ? 72 : 135;
  const H = long ? 58 : 100;
  // Cross-section (width u, height v): flat base and a faceted dome with a
  // flat crown where the scores sit.
  const sec = (sw: number, sh: number) => {
    const pts: [number, number][] = [[-0.5, 0], [0.5, 0], [0.53, 0.38], [0.44, 0.8], [0.26, 1], [-0.26, 1], [-0.44, 0.8], [-0.53, 0.38]];
    let p = path().moveTo(pts[0][0] * W * sw, 0);
    for (const [u, v] of pts.slice(1)) p = p.lineTo(u * W * sw, v * H * sh);
    return p.close();
  };
  // Stations along the length (scale, position factor): rounded tapered ends.
  const st: [number, number][] = long
    ? [[0.45, 0], [0.85, 0.06], [1, 0.2], [1, 0.8], [0.85, 0.94], [0.45, 1]]
    : [[0.5, 0], [0.86, 0.1], [1, 0.3], [1, 0.7], [0.86, 0.9], [0.5, 1]];
  b.part('crust', sec(st[0][0], st[0][0]).loft(st.slice(1).map(([s]) => sec(s, s)), {
    planes: st.map(([, f]) => ({ plane: 'XY' as const, origin: [0, 0, f * L - L / 2] as [number, number, number] })),
    ruled: true,
  }).rotateX(90).rotateZ(90).color(crust));
  // Diagonal slashes along the crown.
  const k = long ? 5 : 4;
  const span = long ? L * 0.66 : L * 0.56;
  const ang = long ? -28 : -62;
  const len = (W * 0.5) / Math.sin((-ang * Math.PI) / 180);
  // Slashes do not touch each other, so each is its own part.
  for (let i = 0; i < k; i++) {
    b.part(`score-${i + 1}`, slash(len, long ? 11 : 18, -span / 2 + (span * i) / (k - 1), H, ang).color(score));
  }
}

return b.model();
