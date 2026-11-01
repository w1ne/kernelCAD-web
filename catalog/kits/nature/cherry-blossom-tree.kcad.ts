// Original kernelCAD low-poly cherry blossom tree: a short leaning trunk that
// splits into spreading limbs under a wide, flat cloud of pink blossom
// (flattened faceted blobs), with an optional carpet of fallen petals.

meta({
  name: 'cherry-blossom-tree',
  license: 'CC0-1.0',
  title: 'Cherry blossom tree',
  description: 'Japanese cherry (sakura) with a leaning trunk, spreading limbs and a wide flat cloud of pink blossom, with optional fallen petals. Knobs: height, blossom clouds, petal carpet, bark, blossom and petal colours.',
  tags: ['tree', 'cherry', 'cherry blossom', 'sakura', 'blossom', 'spring', 'japanese garden', 'park', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'garden', 'park', 'meadow'],
  triangleBudget: 500,
});

const heightM = param('heightM', '5', { choices: ['3', '5', '7'], label: 'Height (m)' });
const clouds = param('clouds', '5', { choices: ['4', '5', '6'], label: 'Blossom clouds' });
const carpet = param('carpet', 'yes', { choices: ['yes', 'no'], label: 'Fallen petals' });
const bark = param('bark', '#4a3530', { label: 'Bark' });
const blossom = param('blossom', '#f2b6c8', { label: 'Blossom' });
const petals = param('petals', '#f6cdd9', { label: 'Fallen petals' });

presets({
  white: { blossom: '#f6f0f0', petals: '#f8f4f4' },
  deep: { blossom: '#e07fa2', petals: '#eaa0bb' },
  summer: { blossom: '#5f9a3c', carpet: 'no' },
});

const h = Number(heightM.value) * 1000;
const n = Number(clouds.value);

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
// Tapered limb from the origin along +Z, tilted then turned to an azimuth.
const limb = (r0: number, r1: number, len: number, tilt: number, az: number, z: number) =>
  ngon(r0, 5).loft(ngon(r1, 5), { spacing: len, ruled: true }).rotateY(tilt).rotateZ(az).translate(0, 0, z);
// Flat blossom cloud: wide and shallow.
const cloud = (x: number, y: number, z: number, r: number) =>
  stack([[r * 0.5, z - r * 0.1], [r, z + r * 0.3], [r * 0.85, z + r * 0.62], [r * 0.3, z + r * 0.9]], 7, x, y);

const tree = assembly('cherry-blossom-tree');
const trunkH = h * 0.42;
tree.part('trunk', stack([[h * 0.05, 0], [h * 0.04, h * 0.12], [h * 0.03, trunkH]], 6).color(bark));

const R = h * 0.2;
const spread = h * 0.36;
const tips: [number, number, number][] = [[0, 0, h - R * 0.75]];
for (let i = 0; i < n - 1; i++) {
  const az = (360 * i) / (n - 1) + 15;
  const tilt = 52 + 8 * (i % 2);
  const len = spread / Math.sin((tilt * Math.PI) / 180);
  const z0 = trunkH * (0.82 + 0.06 * (i % 2));
  tree.part(`limb-${i + 1}`, limb(h * 0.024, h * 0.01, len, tilt, az, z0).color(bark));
  const a = (az * Math.PI) / 180;
  const tz = z0 + len * Math.cos((tilt * Math.PI) / 180);
  tips.push([spread * Math.cos(a), spread * Math.sin(a), tz - R * 0.35]);
}
tips.forEach(([x, y, z], i) => {
  tree.part(`blossom-${i + 1}`, cloud(x, y, z, i === 0 ? R * 1.2 : R * (0.9 + 0.12 * Math.sin(i * 2.3))).color(blossom));
});

if (carpet.value === 'yes') {
  // Irregular thin drift of petals under the crown.
  const cr = spread * 0.95;
  const pts: [number, number][] = [];
  for (let k = 0; k < 11; k++) {
    const a = (2 * Math.PI * k) / 11;
    const rr = cr * (0.88 + 0.12 * Math.sin(k * 1.9 + 1));
    pts.push([rr * Math.cos(a), rr * Math.sin(a)]);
  }
  tree.part('petal-carpet', extrudePolygon(pts, 8).color(petals));
}

return tree.model();
