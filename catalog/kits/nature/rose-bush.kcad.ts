// Original kernelCAD low-poly rose bush: a dense faceted leafy shrub dotted
// with open rose blooms (two stacked petal cups) sitting on its surface.

meta({
  name: 'rose-bush',
  license: 'CC0-1.0',
  title: 'Rose bush',
  description: 'Dense garden rose bush with open blooms scattered over a faceted leafy mound. Knobs: size, bloom count, rose, rose centre and leaf colours.',
  tags: ['rose', 'roses', 'rose bush', 'shrub', 'flower', 'garden', 'romantic', 'park', 'plant', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'garden', 'park', 'meadow'],
  triangleBudget: 600,
});

const size = param('size', '1', { choices: ['0.6', '1', '1.4'], label: 'Width (m)' });
const blooms = param('blooms', '9', { choices: ['5', '9', '12'], label: 'Roses' });
const rose = param('rose', '#c8203a', { label: 'Roses' });
const centre = param('centre', '#8a1028', { label: 'Rose centres' });
const leaves = param('leaves', '#3a7a3a', { label: 'Leaves' });

presets({
  white: { rose: '#f4f0ea', centre: '#e0d6c4' },
  pink: { rose: '#ec8aa8', centre: '#c85a80' },
  yellow: { rose: '#f2c840', centre: '#d89a20' },
});

const w = Number(size.value) * 1000;
const n = Number(blooms.value);

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

const bush = assembly('rose-bush');
const R = w / 2;
const H = w * 0.85;
const rings = [[R * 0.6, 0], [R, H * 0.35], [R * 0.85, H * 0.7], [R * 0.3, H]];
bush.part('foliage', stack(rings, 8).color(leaves));
bush.part('foliage-side', stack([[R * 0.35, 0], [R * 0.55, H * 0.3], [R * 0.2, H * 0.62]], 6, R * 0.6, -R * 0.35).color(leaves));
bush.part('foliage-side-2', stack([[R * 0.3, 0], [R * 0.5, H * 0.32], [R * 0.15, H * 0.7]], 6, -R * 0.55, -R * 0.4).color(leaves));
bush.part('foliage-top', stack([[R * 0.3, H * 0.6], [R * 0.45, H * 0.85], [R * 0.12, H * 1.08]], 6, -R * 0.15, R * 0.2).color(leaves));

const radiusAt = (z: number) => {
  for (let i = 1; i < rings.length; i++) {
    const [r0, a] = rings[i - 1];
    const [r1, b] = rings[i];
    if (z <= b) return r0 + ((r1 - r0) * (z - a)) / (b - a);
  }
  return rings[rings.length - 1][0];
};

// Bloom: an outer five-petal cup and an inner darker bud, tilted outward.
const br = w * 0.09;
for (let i = 0; i < n; i++) {
  const a = i * 2.39996;
  const z = H * (0.25 + 0.55 * ((i * 0.618) % 1));
  const d = radiusAt(z) * 0.97 + br * 0.15;
  const tilt = z > H * 0.6 ? 40 : 65;
  const cup = ngon(br * 0.45, 5).loft(ngon(br, 5, Math.PI / 5), { spacing: br * 0.7, ruled: true }).translate(0, 0, -br * 0.3);
  const bud = ngon(br * 0.55, 5, 0.3).loft(ngon(br * 0.2, 5, 0.9), { spacing: br * 0.6, ruled: true }).translate(0, 0, br * 0.1);
  const place = (s: Shape) => s.rotateY(tilt).rotateZ((a * 180) / Math.PI).translate(d * Math.cos(a), d * Math.sin(a), z);
  bush.part(`rose-${i + 1}`, place(cup).color(rose));
  bush.part(`rose-centre-${i + 1}`, place(bud).color(centre));
}

return bush.model();
