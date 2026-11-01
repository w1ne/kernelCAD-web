// Original kernelCAD low-poly apple tree: a short forked trunk under a wide,
// flattened faceted crown dotted with small faceted apples.

meta({
  name: 'apple-tree',
  license: 'CC0-1.0',
  title: 'Apple tree',
  description: 'Short orchard apple tree with a forked trunk, a wide rounded crown and fruit on the outside of the canopy. Knobs: height, apple count, bark, leaf and fruit colours.',
  tags: ['tree', 'apple tree', 'fruit tree', 'orchard', 'apple', 'farm', 'garden', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'garden', 'farm', 'meadow', 'park'],
  triangleBudget: 550,
});

const heightM = param('heightM', '4', { choices: ['3', '4', '5'], label: 'Height (m)' });
const apples = param('apples', '10', { choices: ['0', '6', '10', '14'], label: 'Apples' });
const bark = param('bark', '#6a4f3a', { label: 'Bark' });
const leaves = param('leaves', '#4f9140', { label: 'Leaves' });
const fruit = param('fruit', '#d23a2c', { label: 'Apples' });

presets({
  green: { fruit: '#9ccc3c' },
  golden: { fruit: '#e8c23a' },
  blossom: { leaves: '#f2c6d2', apples: '0' },
});

const h = Number(heightM.value) * 1000;
const n = Number(apples.value);

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
const limb = (r0: number, r1: number, len: number, tilt: number, az: number, z: number) =>
  ngon(r0, 5).loft(ngon(r1, 5), { spacing: len, ruled: true }).rotateY(tilt).rotateZ(az).translate(0, 0, z);

const tree = assembly('apple-tree');
const trunkH = h * 0.38;
tree.part('trunk', stack([[h * 0.05, 0], [h * 0.035, trunkH]], 6).color(bark));
tree.part('limb-1', limb(h * 0.028, h * 0.015, h * 0.3, 35, 30, trunkH * 0.9).color(bark));
tree.part('limb-2', limb(h * 0.026, h * 0.015, h * 0.28, 38, 160, trunkH * 0.92).color(bark));
tree.part('limb-3', limb(h * 0.024, h * 0.014, h * 0.26, 32, 270, trunkH * 0.95).color(bark));

// Wide flattened crown: widest ring at mid height.
const R = h * 0.42;
const z0 = h * 0.34;
const H = h - z0;
const crownRings = [
  [R * 0.55, z0],
  [R, z0 + H * 0.38],
  [R * 0.86, z0 + H * 0.7],
  [R * 0.3, h],
];
tree.part('crown', stack(crownRings, 9).color(leaves));
tree.part('crown-lump', stack([[R * 0.3, z0 + H * 0.1], [R * 0.5, z0 + H * 0.35], [R * 0.15, z0 + H * 0.68]], 6, R * 0.7, -R * 0.35).color(leaves));

// Crown radius at height z (linear between rings), for placing apples.
const crownR = (z: number) => {
  for (let i = 1; i < crownRings.length; i++) {
    const [r0, a] = crownRings[i - 1];
    const [r1, b] = crownRings[i];
    if (z <= b) return r0 + ((r1 - r0) * (z - a)) / (b - a);
  }
  return crownRings[crownRings.length - 1][0];
};

// Apples sit half-buried in the crown surface.
const ar = h * 0.032;
const apple = () => ngon(ar * 0.6, 5).loft([ngon(ar, 5, Math.PI / 5), ngon(ar * 0.5, 5)], {
  planes: [
    { plane: 'XY', origin: [0, 0, -ar * 0.8] },
    { plane: 'XY', origin: [0, 0, 0] },
    { plane: 'XY', origin: [0, 0, ar * 0.7] },
  ],
  ruled: true,
});
for (let i = 0; i < n; i++) {
  const a = i * 2.4 + 0.3;
  const zz = z0 + H * (0.22 + 0.42 * ((i * 0.618) % 1));
  const d = crownR(zz) + ar * 0.25;
  tree.part(`apple-${i + 1}`, apple().translate(d * Math.cos(a), d * Math.sin(a), zz).color(fruit));
}

return tree.model();
