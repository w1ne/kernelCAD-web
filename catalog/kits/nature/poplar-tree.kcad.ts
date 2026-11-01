// Original kernelCAD low-poly Lombardy poplar: a tall straight trunk carrying a
// narrow column of stacked faceted foliage lumps, tapering to a point.

meta({
  name: 'poplar-tree',
  license: 'CC0-1.0',
  title: 'Poplar tree',
  description: 'Tall Lombardy poplar with a narrow lumpy column of foliage stacked up a straight trunk, for avenues and windbreaks. Knobs: height, lumps, bark and leaf colours.',
  tags: ['tree', 'poplar', 'lombardy poplar', 'deciduous', 'columnar', 'avenue', 'windbreak', 'countryside', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'meadow', 'farm', 'park', 'street'],
  triangleBudget: 400,
});

const heightM = param('heightM', '14', { choices: ['8', '14', '20'], label: 'Height (m)' });
const lumps = param('lumps', '5', { choices: ['4', '5', '6'], label: 'Foliage lumps' });
const bark = param('bark', '#7d7466', { label: 'Bark' });
const leaves = param('leaves', '#6a9a3e', { label: 'Leaves' });

presets({
  autumn: { leaves: '#e0b43a' },
  silver: { leaves: '#93ab84', bark: '#a8a49a' },
});

const h = Number(heightM.value) * 1000;
const n = Number(lumps.value);

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const stack = (rings: number[][], s: number, x = 0, y = 0) => {
  const profiles = rings.map(([r], i) => ngon(r, s, i % 2 ? Math.PI / s : 0));
  return profiles[0].loft(profiles.slice(1), {
    planes: rings.map(([, z]) => ({ plane: 'XY' as const, origin: [x, y, z] as [number, number, number] })),
    ruled: true,
  });
};

const tree = assembly('poplar-tree');
tree.part('trunk', stack([[h * 0.025, 0], [h * 0.012, h * 0.7]], 6).color(bark));

// Lumps overlap vertically, shrink toward the top and wobble off-axis.
const z0 = h * 0.16;
const span = h - z0;
const lh = (span / n) * 1.55;
for (let i = 0; i < n; i++) {
  const t = i / (n - 1);
  const r = h * 0.075 * (1 - t * 0.55);
  const z = z0 + i * ((span - lh) / (n - 1));
  const dx = Math.sin(i * 2.3) * r * 0.15;
  const dy = Math.cos(i * 1.9) * r * 0.15;
  const top = i === n - 1 ? 0.05 : 0.3;
  tree.part(`foliage-${i + 1}`, stack([[r * 0.5, z], [r, z + lh * 0.35], [r * 0.85, z + lh * 0.65], [r * top, z + lh]], 7, dx, dy).color(leaves));
}

return tree.model();
