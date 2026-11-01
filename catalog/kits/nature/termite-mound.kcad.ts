// Original kernelCAD low-poly termite mound: a lumpy cathedral spire of
// baked earth with smaller side spires on a flared, dusty skirt.

meta({
  name: 'termite-mound',
  license: 'CC0-1.0',
  title: 'Termite mound',
  description: 'Tall cathedral termite mound of baked earth with lumpy side spires on a flared skirt, for savanna and outback scenes. Knobs: height, side spires, earth and skirt colours.',
  tags: ['termite mound', 'anthill', 'mound', 'savanna', 'outback', 'africa', 'australia', 'desert', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'savanna', 'desert'],
  triangleBudget: 400,
});

const heightM = param('heightM', '2.5', { choices: ['1.2', '2.5', '4'], label: 'Height (m)' });
const spires = param('spires', '3', { choices: ['1', '2', '3', '4'], label: 'Side spires' });
const earth = param('earth', '#b8724a', { label: 'Earth' });
const skirt = param('skirt', '#9a5e3c', { label: 'Skirt' });

presets({
  grey: { earth: '#9a8e80', skirt: '#7a7064' },
  ochre: { earth: '#d29a52', skirt: '#b07a3e' },
});

const h = Number(heightM.value) * 1000;
const n = Number(spires.value);
const s = 7;

const jit = (k: number, salt: number) => 0.8 + 0.32 * (0.5 + 0.5 * Math.sin(k * 12.9898 + salt * 78.233));
const ring = (r: number, salt: number, rot: number) => {
  const pt = (k: number) => {
    const a = rot + (2 * Math.PI * k) / s;
    const rr = r * jit(k, salt);
    return [rr * Math.cos(a), rr * Math.sin(a)] as const;
  };
  const [x0, y0] = pt(0);
  let p = path().moveTo(x0, y0);
  for (let k = 1; k < s; k++) {
    const [x, y] = pt(k);
    p = p.lineTo(x, y);
  }
  return p.close();
};
// Lumpy spire: jittered rings narrowing to a blunt top, drifting sideways.
const spire = (r: number, hh: number, x: number, y: number, z: number, salt: number) => {
  const rings = [[r, 0], [r * 0.82, 0.3], [r * 0.6, 0.6], [r * 0.38, 0.85], [r * 0.12, 1]];
  const profiles = rings.map(([rr], i) => ring(rr, salt + i, (i % 2) * (Math.PI / s)));
  return profiles[0].loft(profiles.slice(1), {
    planes: rings.map(([, t], i) => ({
      plane: 'XY' as const,
      origin: [x + Math.sin(i * 1.3 + salt) * r * 0.12, y + Math.cos(i * 1.7 + salt) * r * 0.12, z + hh * t] as [number, number, number],
    })),
    ruled: true,
  });
};

const mound = assembly('termite-mound');
const R = h * 0.2;
mound.part('skirt', ring(R * 1.6, 1, 0).loft([ring(R * 1.15, 2, 0.4), ring(R * 0.7, 3, 0)], {
  planes: [
    { plane: 'XY', origin: [0, 0, 0] },
    { plane: 'XY', origin: [0, 0, h * 0.08] },
    { plane: 'XY', origin: [0, 0, h * 0.15] },
  ],
  ruled: true,
}).color(skirt));
mound.part('spire', spire(R, h * 0.98, 0, 0, h * 0.02, 5).color(earth));
for (let i = 0; i < n; i++) {
  const a = i * 2.39996 + 0.5;
  const d = R * 0.75;
  const hh = h * (0.62 - 0.1 * i);
  mound.part(`side-spire-${i + 1}`, spire(R * 0.6, hh, d * Math.cos(a), d * Math.sin(a), h * 0.02, 10 + i * 4).color(earth));
}

return mound.model();
