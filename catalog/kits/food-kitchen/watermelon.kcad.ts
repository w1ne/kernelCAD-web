// Original kernelCAD low-poly watermelon: a faceted oblong melon lying on its
// side with dark stripes on alternate facets, or a single wedge slice standing
// on its rind with red flesh, pale pith and black seeds.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, slice faces -Y.

meta({
  name: 'watermelon',
  license: 'CC0-1.0',
  title: 'Watermelon',
  description: 'Faceted striped watermelon lying whole, or a wedge slice standing on its rind showing red flesh, pale pith and black seeds, as food or market produce. Knobs: cut, rind, stripe, pith, flesh and seed colours.',
  tags: ['watermelon', 'melon', 'fruit', 'slice', 'wedge', 'food', 'produce', 'summer', 'pickup'],
  kit: 'food-kitchen',
  category: 'item',
  origin: 'base',
  compat: ['kitchen', 'food', 'market', 'farm', 'picnic', 'beach'],
  triangleBudget: 440,
});

const cut = param('cut', 'whole', { choices: ['whole', 'wedge'], label: 'Cut' });
const rind = param('rind', '#5fa83c', { label: 'Rind' });
const stripe = param('stripe', '#24572a', { label: 'Stripes' });
const pith = param('pith', '#e4efc4', { label: 'Pith' });
const flesh = param('flesh', '#e8383e', { label: 'Flesh' });
const seed = param('seed', '#1e1a18', { label: 'Seeds' });

presets({
  yellow: { flesh: '#f2cc3a' },
  'dark rind': { rind: '#2e6a30', stripe: '#1c3e20' },
});

const R = 110; // melon radius across
const w = assembly('watermelon');
if (cut.value === 'whole') {
  const L = 360;
  const N = 10;
  const rot = Math.PI / N; // a flat facet lies on the ground
  const vtx = (r: number, k: number): [number, number] => [r * Math.cos(rot + (2 * Math.PI * k) / N), r * Math.sin(rot + (2 * Math.PI * k) / N)];
  const ngon = (r: number) => {
    let p = path().moveTo(...vtx(r, 0));
    for (let k = 1; k < N; k++) p = p.lineTo(...vtx(r, k));
    return p.close();
  };
  // Rings (radius factor, length factor) from one end to the other.
  const rings: [number, number][] = [[0.3, 0], [0.72, 0.08], [0.95, 0.25], [1, 0.5], [0.95, 0.75], [0.72, 0.92], [0.3, 1]];
  const planes = rings.map(([, f]) => ({ plane: 'XY' as const, origin: [0, 0, f * L - L / 2] as [number, number, number] }));
  const out = 1.01;
  const zc = R * out * Math.cos(rot);
  w.part('rind', ngon(R * rings[0][0]).loft(rings.slice(1).map(([f]) => ngon(R * f)), { planes, ruled: true })
    .rotateY(90).translate(0, 0, zc).color(rind));
  // Stripes: a thin skin over every other facet, pole to pole.
  const band = (r: number, k: number) => {
    const [a, b, c, d] = [vtx(r * 0.97, k), vtx(r * out, k), vtx(r * out, k + 1), vtx(r * 0.97, k + 1)];
    return path().moveTo(...a).lineTo(...b).lineTo(...c).lineTo(...d).close();
  };
  for (let k = 0; k < N; k += 2) {
    w.part(`stripe-${k / 2 + 1}`, band(R * rings[0][0], k).loft(rings.slice(1).map(([f]) => band(R * f, k)), { planes, ruled: true })
      .rotateY(90).translate(0, 0, zc).color(stripe));
  }
} else {
  // Wedge: a 64 degree sector of the melon's cross-section, point up.
  const T = 38; // slice thickness
  const half = (32 * Math.PI) / 180;
  const seg = 6;
  const arc = (r: number, rev = false): [number, number][] => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= seg; i++) {
      const t = -Math.PI / 2 - half + (2 * half * i) / seg;
      pts.push([r * Math.cos(t), r * Math.sin(t)]);
    }
    return rev ? pts.reverse() : pts;
  };
  const band = (r0: number, r1: number) => [...arc(r1), ...arc(r0, true)];
  // Profile in (x, z) with the apex at z = R; lowest rind point touches z = 0.
  const stand = (prof: [number, number][], t: number) =>
    extrudePolygon(prof.map(([x, z]) => [x, z + R] as [number, number]), t).rotateX(90).translate(0, t / 2, 0);
  const rf = R * 0.8;
  const rp = R * 0.9;
  w.part('flesh', stand([[0, 0], ...arc(rf)], T).color(flesh));
  w.part('pith', stand(band(rf - 1, rp), T - 2).color(pith));
  w.part('rind', stand(band(rp - 1, R), T - 4).color(rind));
  // Seeds: small dark tear-drops pushed through both cut faces.
  const seeds: [number, number][] = [[-14, 50], [12, 46], [0, 68], [-24, 74], [22, 72], [-8, 86], [10, 90]];
  seeds.forEach(([x, d], i) => {
    w.part(`seed-${i + 1}`, extrudePolygon([[0, 3.5], [-2.5, -2], [2.5, -2]], T + 3)
      .rotateX(90).translate(x, (T + 3) / 2, R - d).color(seed));
  });
}

return w.model();
