// Original kernelCAD low-poly dead bush: a dry, leafless shrub of thin
// tapered branches fanning out of a small root knot, some forking again.

meta({
  name: 'dead-bush',
  license: 'CC0-1.0',
  title: 'Dead bush',
  description: 'Dry leafless shrub of thin forking branches fanning from a root knot, for deserts, wastelands and spooky scenes. Knobs: size, branches, branch and root colours.',
  tags: ['dead bush', 'dry bush', 'shrub', 'brush', 'twigs', 'desert', 'wasteland', 'spooky', 'halloween', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'desert', 'prairie', 'swamp', 'spooky'],
  triangleBudget: 400,
});

const size = param('size', '1', { choices: ['0.6', '1', '1.5'], label: 'Height (m)' });
const branches = param('branches', '8', { choices: ['6', '8', '11'], label: 'Branches' });
const twig = param('twig', '#8a6e52', { label: 'Branches' });
const knot = param('knot', '#5e4a38', { label: 'Root knot' });

presets({
  bleached: { twig: '#c8bca8', knot: '#9a8e7a' },
  dark: { twig: '#4a3e34', knot: '#2f2822' },
});

const h = Number(size.value) * 1000;
const n = Number(branches.value);

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const twigFrom = (from: [number, number, number], r0: number, len: number, tilt: number, az: number) => {
  const piece = ngon(r0, 4).loft(ngon(r0 * 0.25, 4), { spacing: len, ruled: true }).rotateY(tilt).rotateZ(az).translate(from[0], from[1], from[2]);
  const t = (tilt * Math.PI) / 180;
  const a = (az * Math.PI) / 180;
  return { piece, at: (f: number) => [from[0] + f * len * Math.sin(t) * Math.cos(a), from[1] + f * len * Math.sin(t) * Math.sin(a), from[2] + f * len * Math.cos(t)] as [number, number, number] };
};

const bush = assembly('dead-bush');
const kr = h * 0.08;
bush.part('knot', ngon(kr * 1.3, 6).loft([ngon(kr, 6, 0.5), ngon(kr * 0.5, 6)], {
  planes: [
    { plane: 'XY', origin: [0, 0, 0] },
    { plane: 'XY', origin: [0, 0, kr * 0.6] },
    { plane: 'XY', origin: [0, 0, kr * 1.4] },
  ],
  ruled: true,
}).color(knot));

for (let i = 0; i < n; i++) {
  const az = (360 * i) / n + 17 * (i % 3);
  const tilt = 22 + 30 * ((i * 0.618) % 1);
  const len = h * (0.7 + 0.2 * Math.sin(i * 2.1));
  const b = twigFrom([0, 0, kr * 0.8], h * 0.022, len, tilt, az);
  bush.part(`branch-${i + 1}`, b.piece.color(twig));
  // Each branch forks off a side twig part way up, alternating sides.
  const f = twigFrom(b.at(0.45), h * 0.012, len * 0.45, tilt + 20, az + (i % 2 ? -40 : 40));
  bush.part(`fork-${i + 1}`, f.piece.color(twig));
}

return bush.model();
