// Original kernelCAD low-poly maple: a straight faceted trunk under a tall
// egg-shaped crown (a ruled loft of polygon rings) with a few side lumps.

meta({
  name: 'maple-tree',
  license: 'CC0-1.0',
  title: 'Maple tree',
  description: 'Deciduous maple with a straight trunk and a full egg-shaped faceted crown, ideal for autumn scenes. Knobs: height, crown shape, side lumps, bark and leaf colours.',
  tags: ['tree', 'maple', 'deciduous', 'broadleaf', 'autumn', 'fall', 'park', 'forest', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'forest', 'meadow', 'park'],
  triangleBudget: 400,
});

const heightM = param('heightM', '8', { choices: ['6', '8', '10', '14'], label: 'Height (m)' });
const crown = param('crown', 'round', { choices: ['round', 'oval'], label: 'Crown shape' });
const lumps = param('lumps', '3', { choices: ['0', '2', '3', '4'], label: 'Side lumps' });
const bark = param('bark', '#5e4a3a', { label: 'Bark' });
const leaves = param('leaves', '#5c9a3c', { label: 'Leaves' });

presets({
  autumn: { leaves: '#d4462a' },
  golden: { leaves: '#e0a53a' },
  snowy: { leaves: '#e6edf1', bark: '#4a3c32' },
});

const h = Number(heightM.value) * 1000;
const n = Number(lumps.value);
const oval = crown.value === 'oval';

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Ruled loft through rings [radius, z]; alternate rings turn half a facet.
const stack = (rings: number[][], s: number, x = 0, y = 0) => {
  const profiles = rings.map(([r], i) => ngon(r, s, i % 2 ? Math.PI / s : 0));
  return profiles[0].loft(profiles.slice(1), {
    planes: rings.map(([, z]) => ({ plane: 'XY' as const, origin: [x, y, z] as [number, number, number] })),
    ruled: true,
  });
};

const tree = assembly('maple-tree');
tree.part('trunk', stack([[h * 0.045, 0], [h * 0.03, h * 0.5]], 6).color(bark));

const R = h * (oval ? 0.25 : 0.31);
const z0 = h * (oval ? 0.3 : 0.36);
const H = h - z0;
tree.part('crown', stack([
  [R * 0.45, z0],
  [R * 0.92, z0 + H * 0.2],
  [R, z0 + H * 0.45],
  [R * 0.78, z0 + H * 0.72],
  [R * 0.35, z0 + H * 0.92],
  [R * 0.06, h],
], 8).color(leaves));

for (let i = 0; i < n; i++) {
  const a = (2 * Math.PI * i) / n + 0.6;
  const d = R * 0.82;
  const rr = R * 0.45;
  const zz = z0 + H * (0.12 + 0.12 * (i % 2));
  tree.part(`lump-${i + 1}`, stack([[rr * 0.5, zz], [rr, zz + rr * 0.5], [rr * 0.7, zz + rr * 1.1], [rr * 0.15, zz + rr * 1.5]], 6, d * Math.cos(a), d * Math.sin(a)).color(leaves));
}

return tree.model();
