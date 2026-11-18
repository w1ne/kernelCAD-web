// Original kernelCAD low-poly stone arch bridge: a humped masonry bridge with
// a semicircular arch, a lighter voussoir ring proud of the face, a paved
// deck and parapet walls with capstones. Spans along Y in whole 2 m tiles, its
// ends meeting the 0.2 m tile height so paths run straight on and off.

meta({
  name: 'stone-arch-bridge',
  license: 'CC0-1.0',
  title: 'Stone arch bridge',
  description: 'Humped masonry footbridge with a semicircular arch, voussoir ring, paved deck and capped parapets, 4 or 6 m long on the 2 m grid. Knobs: length, parapets, stone, arch ring, deck and capstone colours.',
  tags: ['bridge', 'stone bridge', 'arch', 'packhorse bridge', 'masonry', 'river', 'crossing', 'medieval', 'terrain', 'grid'],
  kit: 'terrain',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'village', 'castle', 'forest'],
  triangleBudget: 700,
});

const lengthM = param('lengthM', '4', { choices: ['4', '6'], label: 'Length (m)' });
const parapets = param('parapets', 'yes', { choices: ['yes', 'no'], label: 'Parapets' });
const stone = param('stone', '#a39c90', { label: 'Stone' });
const ring = param('ring', '#c4bcab', { label: 'Arch ring' });
const deck = param('deck', '#857f74', { label: 'Deck paving' });
const cap = param('cap', '#c7c0b2', { label: 'Capstones' });

presets({
  sandstone: { stone: '#c9a878', ring: '#dcc29a', deck: '#a88a62', cap: '#e4cfa2' },
  mossy: { stone: '#8a8f7a', ring: '#a3a68f', deck: '#6f7a55', cap: '#7f9a4f' },
});

const L = Number(lengthM.value) * 1000;
const W = 1800;
const endZ = 200; // deck height at the ends = tile height
const crownZ = L === 4000 ? 1400 : 1850;
const a = L === 4000 ? 1000 : 1500; // arch radius
const rt = 220; // arch ring thickness
const segs = 10;
const hasPar = parapets.value === 'yes';

// Extrude a (y, z) profile along +X over [x0, x0 + len].
const slab = (pts: [number, number][], x0: number, len: number) =>
  extrudePolygon(pts, len).rotateX(90).rotateZ(90).translate(x0, 0, 0);
// Deck top line: rises from the ends to the crown in two straight runs with
// a short flat over the arch.
const topAt = (y: number) => {
  const flat = a * 0.45;
  const ay = Math.abs(y);
  if (ay <= flat) return crownZ;
  return crownZ - ((crownZ - endZ) * (ay - flat)) / (L / 2 - flat);
};
const arch = (r: number, rev = false) => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= segs; i++) {
    const u = rev ? segs - i : i;
    const th = Math.PI - (Math.PI * u) / segs; // from -y side over the top to +y
    pts.push([r * Math.cos(th), r * Math.sin(th)]);
  }
  return pts;
};
const deckLine = (rev = false) => {
  const ys = [-L / 2, -a * 0.45, a * 0.45, L / 2];
  const pts = ys.map((y) => [y, topAt(y)] as [number, number]);
  return rev ? pts.reverse() : pts;
};

const br = assembly('stone-arch-bridge');
// Spandrel body: ground line, up over the arch opening, deck line back.
const body: [number, number][] = [[-L / 2, 0], ...arch(a + 5).map(([y, z]) => [y, Math.max(z, 0)] as [number, number]), [L / 2, 0], ...deckLine(true).map(([y, z]) => [y, z - 60] as [number, number])];
// arch() runs -y to +y; replace the opening's foot points so the outline goes
// (-L/2,0) -> (-a,0) -> over -> (a,0) -> (L/2,0).
br.part('body', slab(body, -W / 2, W).color(stone));
// Voussoir ring proud of both faces: alternating wedge blocks in the ring
// and stone colours, with a taller keystone at the crown.
for (let i = 0; i < segs; i++) {
  const t0 = Math.PI - (Math.PI * i) / segs;
  const t1 = Math.PI - (Math.PI * (i + 1)) / segs;
  const key = i === segs / 2 - 1 || i === segs / 2;
  const ro = a + rt + (key ? 45 : 0);
  const wedge: [number, number][] = [
    [a * Math.cos(t0), a * Math.sin(t0)], [ro * Math.cos(t0), ro * Math.sin(t0)],
    [ro * Math.cos(t1), ro * Math.sin(t1)], [a * Math.cos(t1), a * Math.sin(t1)],
  ];
  br.part(`voussoir-${i + 1}`, slab(wedge, -W / 2 - 35, W + 70).color(i % 2 === 0 ? ring : stone));
}
// Paving on top.
const deckPts: [number, number][] = [...deckLine().map(([y, z]) => [y, z - 62] as [number, number]), ...deckLine(true)];
br.part('deck', slab(deckPts, -W / 2 + (hasPar ? 200 : 0), W - (hasPar ? 400 : 0)).color(deck));
if (hasPar) {
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? -W / 2 : W / 2 - 200;
    const s = side < 0 ? 'left' : 'right';
    const par: [number, number][] = [...deckLine().map(([y, z]) => [y, z - 70] as [number, number]), ...deckLine(true).map(([y, z]) => [y, z + 300] as [number, number])];
    br.part(`parapet-${s}`, slab(par, x0, 200).color(stone));
    const capPts: [number, number][] = [...deckLine().map(([y, z]) => [y, z + 298] as [number, number]), ...deckLine(true).map(([y, z]) => [y, z + 380] as [number, number])];
    br.part(`cap-${s}`, slab(capPts, x0 - 25, 250).color(cap));
  }
}

return br.model();
