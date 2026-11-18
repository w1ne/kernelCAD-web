// Original kernelCAD low-poly chandelier: a central stem with a hub bowl and
// knop, one or two tiers of curved arms ending in drip cups with candles or
// glowing tulip shades, and a chain up to a ceiling canopy. A hanging fixture modelled
// upright: the bottom finial sits on z = 0 and the canopy top is the ceiling
// side. Millimetres, Z up, centred on x = y = 0.

meta({
  name: 'chandelier',
  license: 'CC0-1.0',
  title: 'Chandelier',
  description: 'Hanging chandelier for ceiling mounting, with one or two tiers of curved arms carrying candles or glowing tulip shades, a central stem and a chain to a ceiling canopy, for castle halls, manors and ballrooms. Knobs: lower arms, tiers, lights, metal, candle and flame colours.',
  tags: ['chandelier', 'ceiling light', 'hanging light', 'candles', 'castle', 'manor', 'ballroom', 'medieval', 'gothic'],
  kit: 'lighting',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'medieval', 'castle', 'fantasy', 'gothic', 'dining-room', 'living-room', 'tavern'],
  triangleBudget: 820,
});

const arms = param('arms', '6', { choices: ['4', '5', '6'], label: 'Lower arms' });
const tiers = param('tiers', '2', { choices: ['1', '2'], label: 'Tiers' });
const lights = param('lights', 'candles', { choices: ['candles', 'shades'], label: 'Lights' });
const metal = param('metal', '#c9a43a', { label: 'Metal' });
const wax = param('wax', '#f2ecd8', { label: 'Candles and sleeves' });
const flame = param('flame', '#ff8c2a', { label: 'Flames and glowing shades' });

presets({
  iron: { metal: '#2e2e32', wax: '#e8dcb8' },
  electric: { lights: 'shades', metal: '#c4c8cc', wax: '#e8e8e8', flame: '#fff0c0' },
  haunted: { metal: '#2a2a2c', wax: '#5a5a5e', flame: '#7af0c8' },
});

const n = Number(arms.value);
const two = tiers.value === '2';
const shades = lights.value === 'shades';
const ngon = (r: number, k0: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < k0; k++) p = p.lineTo(r * Math.cos(rot + (2 * Math.PI * k) / k0), r * Math.sin(rot + (2 * Math.PI * k) / k0));
  return p.close();
};
const rings = (rs: [number, number][], k0: number, x = 0, y = 0) =>
  ngon(rs[0][0], k0).loft(rs.slice(1).map(([r]) => ngon(r, k0)), {
    planes: rs.map(([, z]) => ({ plane: 'XY' as const, origin: [x, y, z] as [number, number, number] })),
    ruled: true,
  });
const seg = (x0: number, z0: number, x1: number, z1: number, t: number) => {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const a = (Math.atan2(z1 - z0, x1 - x0) * 180) / Math.PI;
  return box(len + t, t, t, true).rotateY(-a).translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
};

const c = assembly('chandelier');
// Finial, hub bowl, stem with a knop, chain and ceiling canopy.
c.part('hub', rings([[2, 0], [36, 70], [120, 118], [16, 160]], 8).color(metal));
const top = two ? 640 : 480;
c.part('stem', ngon(16, 6).extrude(top - 160).translate(0, 0, 160).color(metal));
c.part('knop', rings([[18, 300], [46, 330], [18, 360]], 6).color(metal));
const links = 3;
for (let i = 0; i < links; i++) {
  c.part(`link-${i + 1}`, box(28, 8, 64, true).rotateZ(i % 2 ? 90 : 0).translate(0, 0, top + 20 + i * 50).color(metal));
}
const zc = top + 20 + links * 50;
c.part('canopy', rings([[14, zc - 30], [90, zc + 20]], 6).color(metal));

// One tier: arms from (r0, z0) out and down to an elbow, then up to a cup.
const tier = (label: string, count: number, r0: number, z0: number, R: number, rot: number) => {
  for (let i = 0; i < count; i++) {
    const a = rot + (360 * i) / count;
    const ar = (a * Math.PI) / 180;
    const ex = R * 0.72;
    const ez = z0 - 35;
    const cz = z0 + 60;
    c.part(`${label}-arm-${i + 1}a`, seg(r0, z0, ex, ez, 16).rotateZ(a).color(metal));
    c.part(`${label}-arm-${i + 1}b`, seg(ex, ez, R, cz, 16).rotateZ(a).color(metal));
    const x = R * Math.cos(ar);
    const y = R * Math.sin(ar);
    c.part(`${label}-cup-${i + 1}`, rings([[12, cz - 8], [38, cz + 12]], 5, x, y).color(metal));
    const ch = shades ? 60 : 110;
    c.part(`${label}-candle-${i + 1}`, ngon(15, 5).extrude(ch).translate(x, y, cz + 8).color(wax));
    c.part(`${label}-flame-${i + 1}`, shades
      ? rings([[12, cz + ch - 4], [40, cz + ch + 60]], 5, x, y).color(flame)
      : rings([[13, cz + ch - 2], [1, cz + ch + 60]], 4, x, y).color(flame));
  }
};
tier('low', n, 100, 125, 380, 0);
if (two) tier('up', 3, 14, 420, 210, 60);

return c.model();
