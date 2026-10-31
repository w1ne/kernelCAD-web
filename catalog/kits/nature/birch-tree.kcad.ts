// Original kernelCAD low-poly birch: a slender pale faceted trunk with dark
// bark bands and a narrow crown of stacked faceted blobs.

meta({
  name: 'birch-tree',
  title: 'Birch tree',
  description: 'Slender birch with a thin white trunk, dark bark bands and a narrow airy crown. Knobs: height, crown blobs, bark, band and leaf colours.',
  tags: ['tree', 'birch', 'deciduous', 'white bark', 'forest', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'forest', 'meadow', 'park'],
  triangleBudget: 300,
});

const heightM = param('heightM', '9', { choices: ['6', '9', '12', '15'], label: 'Height (m)' });
const blobs = param('blobs', '3', { choices: ['2', '3', '4'], label: 'Crown blobs' });
const bark = param('bark', '#e8e4da', { label: 'Bark' });
const bands = param('bands', '#3a3532', { label: 'Bark bands' });
const leaves = param('leaves', '#7fb04a', { label: 'Leaves' });

presets({
  autumn: { leaves: '#e2b93b' },
  spring: { leaves: '#9ccc5a' },
});

const h = Number(heightM.value) * 1000;
const n = Number(blobs.value);

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};

const blob = (x: number, y: number, z: number, r: number, hh: number, s: number) =>
  ngon(r * 0.5, s).loft([ngon(r, s, Math.PI / s), ngon(r * 0.8, s), ngon(r * 0.3, s, Math.PI / s)], {
    planes: [
      { plane: 'XY', origin: [x, y, z] },
      { plane: 'XY', origin: [x, y, z + hh * 0.35] },
      { plane: 'XY', origin: [x, y, z + hh * 0.72] },
      { plane: 'XY', origin: [x, y, z + hh] },
    ],
    ruled: true,
  });

const tree = assembly('birch-tree');
const r0 = h * 0.018;
const r1 = h * 0.009;
const trunkH = h * 0.8;
tree.part('trunk', ngon(r0, 5).loft(ngon(r1, 5), { spacing: trunkH, ruled: true }).color(bark));

// Dark bands: short collars slightly proud of the tapered trunk.
for (let i = 0; i < 4; i++) {
  const z = h * (0.08 + i * 0.11);
  const rr = (r0 + (r1 - r0) * (z / trunkH)) * 1.22;
  tree.part(`band-${i + 1}`, ngon(rr, 5).extrude(h * 0.02 + (i % 2) * h * 0.012).translate(0, 0, z).color(bands));
}

const crownBase = h * 0.4;
const segH = (h - crownBase) / ((n - 1) * 0.92 + 1.25);
for (let i = 0; i < n; i++) {
  const r = h * 0.12 * (1 - (0.35 * i) / n);
  const off = (i % 2 === 0 ? 1 : -1) * r * 0.18;
  tree.part(`crown-${i + 1}`, blob(off, -off * 0.5, crownBase + i * segH * 0.92, r, segH * 1.25, 6).color(leaves));
}

return tree.model();
