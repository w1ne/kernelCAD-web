// Original kernelCAD low-poly tumbleweed: a scraggly ball of tilted spiky
// star-section brush layers round a darker core.

meta({
  name: 'tumbleweed',
  license: 'CC0-1.0',
  title: 'Tumbleweed',
  description: 'Dry tumbleweed: a scraggly ball of spiky twig layers round a darker core, for desert and western scenes. Knobs: diameter, brush layers, twig and core colours.',
  tags: ['tumbleweed', 'desert', 'western', 'dry', 'brush', 'wild west', 'prairie', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'desert', 'prairie'],
  triangleBudget: 400,
});

const size = param('size', '0.8', { choices: ['0.5', '0.8', '1.2'], label: 'Diameter (m)' });
const layers = param('layers', '3', { choices: ['2', '3', '4'], label: 'Brush layers' });
const twig = param('twig', '#b89a6a', { label: 'Twigs' });
const core = param('core', '#8a6f4a', { label: 'Core' });

presets({
  green: { twig: '#8a9a5a', core: '#6a7a42' },
  grey: { twig: '#a8a296', core: '#7a756a' },
});

const R = (Number(size.value) * 1000) / 2;
const n = Number(layers.value);

// Spiky star ring: k points with deep notches, so stacked rings read as a
// scraggly ball of dry twigs.
const star = (r: number, k: number, rot: number) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let i = 1; i < 2 * k; i++) {
    const a = rot + (Math.PI * i) / k;
    const rr = i % 2 === 0 ? r : r * 0.18;
    p = p.lineTo(rr * Math.cos(a), rr * Math.sin(a));
  }
  return p.close();
};
// Brush ball: four star rings from a narrow foot to a narrow crown, every
// ring turned so the spikes interleave.
const ball = (r: number, z0: number, rot: number) =>
  star(r * 0.35, 5, rot).loft([star(r * 0.95, 5, rot + 0.3), star(r, 5, rot + 0.95), star(r * 0.4, 5, rot + 1.3)], {
    planes: [
      { plane: 'XY', origin: [0, 0, z0] },
      { plane: 'XY', origin: [0, 0, z0 + r * 0.6] },
      { plane: 'XY', origin: [0, 0, z0 + r * 1.3] },
      { plane: 'XY', origin: [0, 0, z0 + r * 1.9] },
    ],
    ruled: true,
  });

const weed = assembly('tumbleweed');
weed.part('core', ball(R * 0.75, 0, 0).color(core));
// Outer brush layers, each tipped a little differently round the core.
for (let i = 0; i < n; i++) {
  const tilt = 25 + 12 * (i % 2);
  const az = (360 * i) / n;
  weed.part(`brush-${i + 1}`, ball(R * 0.85, -R * 0.85, i * 0.5).rotateY(tilt).rotateZ(az).translate(0, 0, R * 0.95).color(twig));
}

return weed.model();
