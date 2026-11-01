// Original kernelCAD low-poly stone wall section: a 2 m length of coursed
// masonry with staggered two-tone blocks on both faces, a mortar core and a
// row of capstones; the ruined style knocks the courses down in steps
// towards one end. Runs along X, centred, so sections join on the 2 m grid.

meta({
  name: 'stone-wall-section',
  license: 'CC0-1.0',
  title: 'Stone wall section',
  description: 'Two-metre section of coursed stone wall with staggered two-tone blocks and capstones, intact or ruined in steps. Knobs: height, style, block, accent block, mortar and cap colours.',
  tags: ['wall', 'stone wall', 'masonry', 'ruin', 'castle', 'garden wall', 'boundary', 'medieval', 'terrain', 'grid'],
  kit: 'terrain',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'castle', 'village', 'dungeon'],
  triangleBudget: 1000,
});

const heightM = param('heightM', '1.2', { choices: ['0.8', '1.2', '2'], label: 'Height (m)' });
const style = param('style', 'intact', { choices: ['intact', 'ruined'], label: 'Style' });
const block = param('block', '#a39d92', { label: 'Blocks' });
const block2 = param('block2', '#8d877c', { label: 'Accent blocks' });
const mortar = param('mortar', '#5e5a53', { label: 'Mortar' });
const capC = param('cap', '#bdb7ab', { label: 'Capstones' });

presets({
  sandstone: { block: '#d6b886', block2: '#c4a172', mortar: '#8c7350', cap: '#e4cfa2' },
  mossy: { block: '#9a9c8a', block2: '#7f8c62', mortar: '#4f5640', cap: '#7f9a4f' },
  dungeon: { block: '#62656b', block2: '#55585e', mortar: '#2f3034', cap: '#74777d' },
});

const S = 2000;
const h = S / 2;
const H = Number(heightM.value) * 1000;
const T = 450; // wall thickness
const ruined = style.value === 'ruined';
const courses = Math.max(3, Math.round(H / 240));
const ch = H / courses;
const g = 24;
const d = 150; // block depth on each face

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
// Ruined walls lose courses towards +X: the top surviving z at x.
const topAt = (x: number) => (ruined ? H * (1 - 0.6 * Math.max(0, (x + h * 0.2) / (h * 1.2))) : H);

const wall = assembly('stone-wall-section');
let k = 0;
const cutsEven = [-h, -h / 2, 0, h / 2, h];
const cutsOdd = [-h, -3 * h / 4, -h / 4, h / 4, 3 * h / 4, h];
for (let c = 0; c < courses; c++) {
  const z0 = c * ch + (c === 0 ? 0 : g / 2);
  const z1 = (c + 1) * ch - g / 2;
  const cuts = c % 2 === 0 ? cutsEven : cutsOdd;
  for (let i = 0; i < cuts.length - 1; i++) {
    const a0 = cuts[i] + (i === 0 ? 0 : g / 2);
    const a1 = cuts[i + 1] - (i === cuts.length - 2 ? 0 : g / 2);
    if (topAt((a0 + a1) / 2) < z1 - 1) continue;
    // End blocks of even courses are through-stones spanning the full
    // thickness, so the wall end shows bonded masonry rather than the core.
    if (c % 2 === 0 && (i === 0 || i === cuts.length - 2)) {
      k++;
      wall.part(`block-${k}`, blk(a0, -T / 2 + 4, z0, a1, T / 2 - 4, z1).color(k % 3 === 0 ? block2 : block));
      continue;
    }
    for (const side of [-1, 1]) {
      k++;
      const inset = 10 * (0.5 + 0.5 * Math.sin(k * 7.3));
      const y0 = side < 0 ? -T / 2 + inset : T / 2 - d;
      const y1 = side < 0 ? -T / 2 + d : T / 2 - inset;
      wall.part(`block-${k}`, blk(a0, y0, z0, a1, y1, z1).color(k % 3 === 0 ? block2 : block));
    }
  }
}
// Mortar core: a stepped profile along X under the surviving courses.
const steps = ruined ? 5 : 1;
for (let i = 0; i < steps; i++) {
  const x0 = -h + (S * i) / steps;
  const x1 = -h + (S * (i + 1)) / steps;
  const top = Math.min(topAt(x0), topAt(x1));
  const zc = Math.max(ch - g, Math.floor(top / ch) * ch - g / 2) - 25; // below block tops: no coplanar faces
  wall.part(`core-${i + 1}`, blk(x0 + (i === 0 ? 10 : 0), -T / 2 + 15, 0, x1 - (i === steps - 1 ? 10 : 0), T / 2 - 15, zc).color(mortar));
}
if (!ruined) {
  // Capstones: chunky slabs slightly wider than the wall.
  const nc = 4;
  for (let i = 0; i < nc; i++) {
    const x0 = -h + (S * i) / nc + (i === 0 ? 0 : g / 2);
    const x1 = -h + (S * (i + 1)) / nc - (i === nc - 1 ? 0 : g / 2);
    wall.part(`cap-${i + 1}`, blk(x0, -T / 2 - 30, H - g / 2 - 2, x1, T / 2 + 30, H + 110 - 15 * (i % 2)).color(capC));
  }
}

return wall.model();
