// Original kernelCAD low-poly weeping willow: a stout leaning trunk under a
// low dome crown, ringed by long tapered curtains of hanging foliage.

meta({
  name: 'willow-tree',
  license: 'CC0-1.0',
  title: 'Weeping willow',
  description: 'Weeping willow with a stout trunk, a domed crown and long hanging curtains of foliage, for pond and riverbank scenes. Knobs: height, curtain strands, bark and leaf colours.',
  tags: ['tree', 'willow', 'weeping willow', 'deciduous', 'pond', 'river', 'lake', 'swamp', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'water', 'swamp', 'park', 'meadow'],
  triangleBudget: 500,
});

const heightM = param('heightM', '8', { choices: ['6', '8', '10', '12'], label: 'Height (m)' });
const strands = param('strands', '14', { choices: ['10', '14', '18'], label: 'Hanging strands' });
const bark = param('bark', '#5a4b3c', { label: 'Bark' });
const leaves = param('leaves', '#8ab045', { label: 'Leaves' });

presets({
  autumn: { leaves: '#d2b03a' },
  dark: { leaves: '#5c8a34', bark: '#3f342b' },
});

const h = Number(heightM.value) * 1000;
const n = Number(strands.value);

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

const tree = assembly('willow-tree');
tree.part('trunk', stack([[h * 0.07, 0], [h * 0.05, h * 0.18], [h * 0.035, h * 0.62]], 6).color(bark));

const R = h * 0.42;
tree.part('crown', stack([
  [R * 0.55, h * 0.52],
  [R, h * 0.64],
  [R * 0.82, h * 0.8],
  [R * 0.42, h * 0.94],
  [R * 0.08, h],
], 8).color(leaves));

// Hanging strand: a long tapered blade in a vertical plane tangent to the
// crown edge, its top buried in the crown, leaning slightly outward.
const strand = (len: number, w: number) => extrudePolygon([
  [-w, 0], [w, 0], [w * 0.6, -len * 0.7], [w * 0.15, -len], [-w * 0.35, -len * 0.9], [-w * 0.6, -len * 0.6],
], 40).translate(0, 0, -20).rotateX(90).rotateZ(90);
for (let i = 0; i < n; i++) {
  const a = (360 * i) / n + (i % 2) * 7;
  const outer = i % 2 === 0;
  const d = R * (outer ? 0.92 : 0.8);
  const len = h * (outer ? 0.5 : 0.42) * (0.9 + 0.12 * Math.sin(i * 2.7));
  const piece = strand(len, R * 0.16).rotateY(-6).translate(d, 0, h * 0.66).rotateZ(a);
  tree.part(`strand-${i + 1}`, piece.color(leaves));
}

return tree.model();
