// Original kernelCAD low-poly sapling: a thin young tree on a soil mound, a
// small two-lump crown and an optional timber support stake with a tie.

meta({
  name: 'sapling',
  license: 'CC0-1.0',
  title: 'Sapling',
  description: 'Freshly planted young tree on a soil mound with a small leafy crown and an optional support stake. Knobs: height, stake, bark, leaf, stake and soil colours.',
  tags: ['sapling', 'young tree', 'tree', 'seedling', 'planting', 'garden', 'park', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'garden', 'park', 'meadow', 'forest'],
  triangleBudget: 250,
});

const heightM = param('heightM', '2', { choices: ['1.2', '2', '3'], label: 'Height (m)' });
const stake = param('stake', 'yes', { choices: ['yes', 'no'], label: 'Support stake' });
const bark = param('bark', '#7a5b3e', { label: 'Bark' });
const leaves = param('leaves', '#6cae45', { label: 'Leaves' });
const post = param('post', '#c4a273', { label: 'Stake' });
const soil = param('soil', '#5a4030', { label: 'Soil' });

presets({
  autumn: { leaves: '#d88a2e' },
  spring: { leaves: '#a6d65a' },
});

const h = Number(heightM.value) * 1000;

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

const tree = assembly('sapling');
tree.part('mound', stack([[h * 0.16, 0], [h * 0.1, h * 0.03], [h * 0.03, h * 0.045]], 7).color(soil));
tree.part('trunk', stack([[h * 0.014, 0], [h * 0.008, h * 0.7]], 5).color(bark));

const R = h * 0.12;
tree.part('crown', stack([[R * 0.4, h * 0.58], [R, h * 0.72], [R * 0.7, h * 0.88], [R * 0.1, h]], 6).color(leaves));
tree.part('crown-side', stack([[R * 0.3, h * 0.56], [R * 0.6, h * 0.64], [R * 0.1, h * 0.76]], 5, R * 0.7, R * 0.3).color(leaves));

if (stake.value === 'yes') {
  const sx = h * 0.06;
  const sw = Math.max(30, h * 0.02);
  tree.part('stake', box(sw, sw, h * 0.5).translate(sx - sw / 2, -sw / 2, 0).color(post));
  // Tie: a flat strap from the stake across to the trunk.
  tree.part('tie', box(sx + sw * 0.4, sw * 0.6, sw * 0.5).translate(-h * 0.01, -sw * 0.3, h * 0.38).color(post));
}

return tree.model();
