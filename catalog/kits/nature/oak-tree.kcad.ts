// Original kernelCAD low-poly oak: a tapered faceted trunk with two limbs and a
// lumpy crown made of overlapping faceted blobs (ruled lofts of polygon rings).

meta({
  name: 'oak-tree',
  title: 'Oak tree',
  description: 'Broad deciduous oak with a stout faceted trunk and a lumpy clustered crown. Knobs: height, crown lumps, crown shape, bark and leaf colours.',
  tags: ['tree', 'oak', 'deciduous', 'broadleaf', 'forest', 'park', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'forest', 'meadow', 'park'],
  triangleBudget: 400,
});

const heightM = param('heightM', '7', { choices: ['5', '7', '9', '12'], label: 'Height (m)' });
const lumps = param('lumps', '5', { choices: ['3', '4', '5', '6'], label: 'Crown lumps' });
const crown = param('crown', 'round', { choices: ['round', 'wide', 'tall'], label: 'Crown shape' });
const bark = param('bark', '#6b4a2f', { label: 'Bark' });
const leaves = param('leaves', '#4f8a3a', { label: 'Leaves' });

presets({
  autumn: { leaves: '#d0832e' },
  summer: { leaves: '#3d7a2f' },
  snowy: { leaves: '#e6edf1', bark: '#4f3d2e' },
});

const h = Number(heightM.value) * 1000;
const n = Number(lumps.value);
const widen = crown.value === 'wide' ? 1.3 : crown.value === 'tall' ? 0.8 : 1;
const stretch = crown.value === 'tall' ? 1.25 : crown.value === 'wide' ? 0.85 : 1;

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};

// Faceted blob: four polygon rings, alternate rings rotated half a facet.
const blob = (x: number, y: number, z: number, r: number, hh: number, s: number) =>
  ngon(r * 0.55, s).loft([ngon(r, s, Math.PI / s), ngon(r * 0.85, s), ngon(r * 0.35, s, Math.PI / s)], {
    planes: [
      { plane: 'XY', origin: [x, y, z] },
      { plane: 'XY', origin: [x, y, z + hh * 0.35] },
      { plane: 'XY', origin: [x, y, z + hh * 0.72] },
      { plane: 'XY', origin: [x, y, z + hh] },
    ],
    ruled: true,
  });

// Tapered limb from the origin along +Z, tilted then turned to an azimuth.
const limb = (r0: number, r1: number, len: number, tilt: number, az: number, z: number) =>
  ngon(r0, 5).loft(ngon(r1, 5), { spacing: len, ruled: true }).rotateY(tilt).rotateZ(az).translate(0, 0, z);

const tree = assembly('oak-tree');
const trunkH = h * 0.4;
tree.part('trunk', ngon(h * 0.05, 6).loft(ngon(h * 0.03, 6), { spacing: trunkH, ruled: true }).color(bark));
tree.part('limb-1', limb(h * 0.022, h * 0.01, h * 0.24, 48, 20, trunkH * 0.8).color(bark));
tree.part('limb-2', limb(h * 0.02, h * 0.01, h * 0.22, 45, 200, trunkH * 0.88).color(bark));

const cr = h * 0.22 * widen; // lump radius
const ch = h * 0.28 * stretch; // lump height
const base = h - ch * 1.75;
tree.part('crown-top', blob(0, 0, h - ch, cr * 1.1, ch, 7).color(leaves));
tree.part('crown-core', blob(0, 0, base, cr * 1.15, ch * 1.1, 7).color(leaves));
for (let i = 0; i < n - 2; i++) {
  const a = (2 * Math.PI * i) / (n - 2) + 0.4;
  const d = cr * 1.25;
  const zz = base + ch * (0.25 + 0.2 * Math.sin(i * 2.1));
  tree.part(`crown-${i + 1}`, blob(d * Math.cos(a), d * Math.sin(a), zz, cr * 0.8, ch * 0.85, 6).color(leaves));
}

return tree.model();
