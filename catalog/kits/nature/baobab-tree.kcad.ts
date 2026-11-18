// Original kernelCAD low-poly baobab: a huge bottle-shaped faceted trunk with
// a ring of short stubby branches at the top, each ending in a small leaf tuft.

meta({
  name: 'baobab-tree',
  license: 'CC0-1.0',
  title: 'Baobab tree',
  description: 'African baobab with a massive bottle-shaped trunk and short root-like branches crowned by sparse leaf tufts, for savanna scenes. Knobs: height, branches, leaf tufts, bark and leaf colours.',
  tags: ['tree', 'baobab', 'savanna', 'africa', 'madagascar', 'desert', 'bottle tree', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'desert', 'savanna', 'meadow'],
  triangleBudget: 500,
});

const heightM = param('heightM', '10', { choices: ['7', '10', '15'], label: 'Height (m)' });
const branches = param('branches', '6', { choices: ['5', '6', '7'], label: 'Branches' });
const tufts = param('tufts', 'yes', { choices: ['yes', 'no'], label: 'Leaf tufts' });
const bark = param('bark', '#a08672', { label: 'Bark' });
const leaves = param('leaves', '#6f9a3a', { label: 'Leaves' });

presets({
  dry: { tufts: 'no' },
  sunset: { bark: '#b07a5a', leaves: '#8a9a3a' },
});

const h = Number(heightM.value) * 1000;
const n = Number(branches.value);

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

const tree = assembly('baobab-tree');
const trunkTop = h * 0.7;
tree.part('trunk', stack([
  [h * 0.17, 0],
  [h * 0.15, h * 0.12],
  [h * 0.14, h * 0.38],
  [h * 0.09, h * 0.6],
  [h * 0.07, trunkTop],
], 8).color(bark));

// Stubby branches: short tapered pieces radiating up and out, often forked.
const tips: [number, number, number][] = [];
for (let i = 0; i < n; i++) {
  const az = (360 * i) / n + 10 * Math.sin(i * 1.7);
  const tilt = 48 + 10 * (i % 2);
  const len = h * (0.24 + 0.04 * Math.sin(i * 2.1));
  const z0 = trunkTop - h * 0.05;
  const br = ngon(h * 0.03, 5).loft(ngon(h * 0.012, 5), { spacing: len, ruled: true }).rotateY(tilt).rotateZ(az).translate(0, 0, z0);
  tree.part(`branch-${i + 1}`, br.color(bark));
  const a = (az * Math.PI) / 180;
  const t = (tilt * Math.PI) / 180;
  tips.push([len * Math.sin(t) * Math.cos(a), len * Math.sin(t) * Math.sin(a), z0 + len * Math.cos(t)]);
}
// Short centre spike so the crown is not hollow.
tree.part('branch-top', ngon(h * 0.035, 5).loft(ngon(h * 0.012, 5), { spacing: h * 0.2, ruled: true }).translate(0, 0, trunkTop - h * 0.04).color(bark));
tips.push([0, 0, trunkTop + h * 0.15]);

if (tufts.value === 'yes') {
  tips.forEach(([x, y, z], i) => {
    const r = h * 0.075;
    tree.part(`tuft-${i + 1}`, stack([[r * 0.5, z - r * 0.25], [r, z + r * 0.1], [r * 0.35, z + r * 0.45]], 6, x, y).color(leaves));
  });
}

return tree.model();
