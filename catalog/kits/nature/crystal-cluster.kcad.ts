// Original kernelCAD low-poly crystal cluster: hexagonal pointed crystals of
// mixed sizes fanning out of a faceted rock bed.

meta({
  name: 'crystal-cluster',
  license: 'CC0-1.0',
  title: 'Crystal cluster',
  description: 'Cluster of hexagonal pointed crystals fanning out of a faceted rock base, for caves, mines and fantasy scenes. Knobs: height, crystal count, crystal, rock colours.',
  tags: ['crystal', 'crystals', 'gem', 'quartz', 'amethyst', 'mineral', 'cave', 'mine', 'fantasy', 'magic', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'cave', 'mountain', 'fantasy'],
  triangleBudget: 350,
});

const heightM = param('heightM', '0.8', { choices: ['0.4', '0.8', '1.5'], label: 'Height (m)' });
const count = param('count', '7', { choices: ['5', '7', '9'], label: 'Crystals' });
const crystal = param('crystal', '#9a6ad8', { label: 'Crystals' });
const rock = param('rock', '#5a5660', { label: 'Rock base' });

presets({
  ice: { crystal: '#a8e4f4', rock: '#6a7a88' },
  emerald: { crystal: '#3ac88a', rock: '#4a4a44' },
  ruby: { crystal: '#d83a4a', rock: '#4a3a3a' },
  gold: { crystal: '#f2c84a', rock: '#6a5a4a' },
});

const h = Number(heightM.value) * 1000;
const n = Number(count.value);

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Hexagonal prism with a pointed tip, standing on its base along +Z.
const shard = (r: number, len: number) => ngon(r, 6).loft([ngon(r, 6), ngon(r * 0.08, 6)], {
  planes: [
    { plane: 'XY', origin: [0, 0, 0] },
    { plane: 'XY', origin: [0, 0, len * 0.72] },
    { plane: 'XY', origin: [0, 0, len] },
  ],
  ruled: true,
});

const cluster = assembly('crystal-cluster');
const W = h * 0.9;
const baseH = h * 0.2;
// Rock bed: an irregular low lump.
const jit = (k: number) => 0.8 + 0.2 * Math.sin(k * 2.7 + 0.4);
const bed = (r: number) => {
  let p = path().moveTo(r * jit(0), 0);
  for (let k = 1; k < 7; k++) {
    const a = (2 * Math.PI * k) / 7;
    p = p.lineTo(r * jit(k) * Math.cos(a), r * jit(k) * 0.85 * Math.sin(a));
  }
  return p.close();
};
cluster.part('rock', bed(W * 0.5).loft([bed(W * 0.42), bed(W * 0.22)], {
  planes: [
    { plane: 'XY', origin: [0, 0, 0] },
    { plane: 'XY', origin: [0, 0, baseH * 0.7] },
    { plane: 'XY', origin: [0, 0, baseH] },
  ],
  ruled: true,
}).color(rock));

// Crystals: the tallest near upright in the middle, smaller ones tilted out.
// Each starts above r * sin(tilt) so its tilted base never dips below z = 0.
for (let i = 0; i < n; i++) {
  const main = i === 0;
  const a = (i * 137.5 + 20) % 360;
  const tilt = main ? 6 : 22 + 14 * (i % 3);
  const len = main ? h * 0.85 : h * (0.38 + 0.28 * ((i * 0.618) % 1));
  const r = main ? h * 0.09 : h * (0.045 + 0.02 * (i % 2));
  const d = main ? 0 : W * (0.12 + 0.05 * (i % 3));
  const z0 = Math.max(baseH * 0.4, r * Math.sin((tilt * Math.PI) / 180) + 5);
  const s = shard(r, len).rotateZ(i * 17).rotateY(tilt).rotateZ(a).translate(d * Math.cos((a * Math.PI) / 180), d * Math.sin((a * Math.PI) / 180), z0);
  cluster.part(`crystal-${i + 1}`, s.color(crystal));
}

return cluster.model();
