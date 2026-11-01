// Original kernelCAD low-poly umbrella acacia: a slender trunk forking into
// angled limbs under a very wide, flat-topped canopy of shallow faceted pads.

meta({
  name: 'acacia-tree',
  license: 'CC0-1.0',
  title: 'Acacia tree',
  description: 'Savanna umbrella-thorn acacia with a slender forked trunk and a wide flat-topped canopy. Knobs: height, canopy pads, bark and leaf colours.',
  tags: ['tree', 'acacia', 'umbrella thorn', 'savanna', 'africa', 'safari', 'desert', 'flat top', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'savanna', 'desert', 'meadow'],
  triangleBudget: 400,
});

const heightM = param('heightM', '6', { choices: ['4', '6', '9'], label: 'Height (m)' });
const pads = param('pads', '4', { choices: ['3', '4', '5'], label: 'Canopy pads' });
const bark = param('bark', '#5a4636', { label: 'Bark' });
const leaves = param('leaves', '#7a9a3a', { label: 'Leaves' });

presets({
  dry: { leaves: '#a8a04a' },
  lush: { leaves: '#5a8a34' },
});

const h = Number(heightM.value) * 1000;
const n = Number(pads.value);

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

const tree = assembly('acacia-tree');
const forkZ = h * 0.45;
tree.part('trunk', stack([[h * 0.03, 0], [h * 0.022, forkZ + h * 0.03]], 6).color(bark));

// Limbs fan up and out from the fork to the underside of the canopy.
const canopyZ = h * 0.82;
const reach = h * 0.42;
for (let i = 0; i < n; i++) {
  const az = (360 * i) / n + 25;
  const dx = reach * (0.6 + 0.15 * (i % 2));
  const dz = canopyZ - forkZ;
  const len = Math.hypot(dx, dz) + h * 0.03;
  const tilt = (Math.atan2(dx, dz) * 180) / Math.PI;
  tree.part(`limb-${i + 1}`, limb(h * 0.016, h * 0.008, len, tilt, az, forkZ).color(bark));
}

// Canopy: a broad flat central pad plus thinner pads over each limb tip.
const R = h * 0.42;
const flatPad = (x: number, y: number, z: number, r: number, t: number, s: number) =>
  stack([[r * 0.75, z], [r, z + t * 0.45], [r * 0.6, z + t]], s, x, y);
tree.part('canopy', flatPad(0, 0, canopyZ - h * 0.02, R * 0.75, h * 0.14, 9).color(leaves));
for (let i = 0; i < n; i++) {
  const a = ((360 * i) / n + 25) * (Math.PI / 180);
  const d = reach * (0.6 + 0.15 * (i % 2));
  tree.part(`pad-${i + 1}`, flatPad(d * Math.cos(a), d * Math.sin(a), canopyZ - h * 0.03 + (i % 2) * h * 0.02, R * 0.45, h * 0.1, 7).color(leaves));
}

return tree.model();
