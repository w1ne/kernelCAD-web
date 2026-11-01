// Original kernelCAD low-poly giant mushroom: a fantasy toadstool taller than a
// person, with a thick stalk, a hanging ring skirt, gills under a broad domed
// cap and raised spots on the cap.

meta({
  name: 'giant-mushroom',
  license: 'CC0-1.0',
  title: 'Giant mushroom',
  description: 'Fantasy giant toadstool with a thick stalk, ring skirt, gills under a broad domed cap and raised spots, for fairy-tale forests. Knobs: height, cap shape, spots, cap, spot, stalk and gill colours.',
  tags: ['mushroom', 'giant mushroom', 'toadstool', 'fantasy', 'fairy tale', 'fungus', 'forest', 'magic', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'forest', 'swamp', 'fantasy'],
  triangleBudget: 450,
});

const heightM = param('heightM', '3', { choices: ['2', '3', '5'], label: 'Height (m)' });
const shape = param('shape', 'dome', { choices: ['dome', 'flat', 'cone'], label: 'Cap shape' });
const spots = param('spots', '8', { choices: ['0', '5', '8', '11'], label: 'Spots' });
const cap = param('cap', '#c8302a', { label: 'Cap' });
const spot = param('spot', '#f4efe2', { label: 'Spots' });
const stalk = param('stalk', '#efe6d0', { label: 'Stalk' });
const gills = param('gills', '#d9c8a8', { label: 'Gills and skirt' });

presets({
  glowing: { cap: '#3a6fd8', spot: '#9ff0ff', gills: '#7ad8e8' },
  brown: { cap: '#8a5a32', spot: '#d8b88a' },
  purple: { cap: '#7a3a9a', spot: '#f0d0ff' },
});

const h = Number(heightM.value) * 1000;
const n = Number(spots.value);
const s = 9;

const ngon = (r: number, k0: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < k0; k++) {
    const a = rot + (2 * Math.PI * k) / k0;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const stack = (rings: number[][], k0: number) => {
  const profiles = rings.map(([r], i) => ngon(r, k0, i % 2 ? Math.PI / k0 : 0));
  return profiles[0].loft(profiles.slice(1), {
    planes: rings.map(([, z]) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  });
};

const m = assembly('giant-mushroom');
const R = h * (shape.value === 'flat' ? 0.42 : 0.36);
const capZ = h * 0.62;
m.part('stalk', stack([[h * 0.11, 0], [h * 0.075, h * 0.12], [h * 0.06, capZ + h * 0.05]], 7).color(stalk));
m.part('skirt', stack([[h * 0.065, h * 0.5], [h * 0.11, h * 0.43]], 8).color(gills));
m.part('gills', stack([[h * 0.07, capZ - h * 0.03], [R * 0.95, capZ + h * 0.03]], s).color(gills));

const capRings = shape.value === 'cone'
  ? [[R, capZ + h * 0.03], [R * 0.8, capZ + h * 0.12], [R * 0.45, capZ + h * 0.26], [R * 0.06, h]]
  : shape.value === 'flat'
    ? [[R, capZ + h * 0.03], [R * 0.95, capZ + h * 0.1], [R * 0.7, capZ + h * 0.17], [R * 0.25, capZ + h * 0.21]]
    : [[R, capZ + h * 0.03], [R * 0.9, capZ + h * 0.15], [R * 0.62, capZ + h * 0.28], [R * 0.2, h]];
m.part('cap', stack(capRings, s).color(cap));

// Spots: low faceted bumps half-sunk into the cap surface on two bands.
const capR = (z: number) => {
  for (let i = 1; i < capRings.length; i++) {
    const [r0, a] = capRings[i - 1];
    const [r1, b] = capRings[i];
    if (z <= b) return r0 + ((r1 - r0) * (z - a)) / (b - a);
  }
  return capRings[capRings.length - 1][0];
};
const zLo = capRings[0][1];
const zHi = capRings[capRings.length - 1][1];
for (let i = 0; i < n; i++) {
  const upper = i % 3 === 2;
  const z = zLo + (zHi - zLo) * (upper ? 0.62 : 0.28);
  const a = i * 2.39996;
  const d = capR(z) * 0.97;
  const sr = R * (upper ? 0.14 : 0.18);
  const bump = ngon(sr, 5, i).loft(ngon(sr * 0.6, 5, i + 0.6), { spacing: sr * 0.7, ruled: true }).translate(0, 0, -sr * 0.35);
  // Tilt the bump to roughly follow the cap's slope.
  const tilt = upper ? 50 : 35;
  m.part(`spot-${i + 1}`, bump.rotateY(tilt).rotateZ((a * 180) / Math.PI).translate(d * Math.cos(a), d * Math.sin(a), z).color(spot));
}

return m.model();
