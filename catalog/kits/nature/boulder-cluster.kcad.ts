// Original kernelCAD low-poly boulder cluster: one large faceted boulder with
// smaller rocks huddled around it, each an irregular ruled loft of jittered
// polygon rings with a flat base.

meta({
  name: 'boulder-cluster',
  title: 'Boulder cluster',
  description: 'Group of faceted boulders, one large rock surrounded by smaller ones. Knobs: rock count, cluster size, shape, main and secondary stone colours.',
  tags: ['boulder', 'rocks', 'stones', 'cluster', 'outcrop', 'mountain', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'forest', 'meadow', 'desert', 'mountain'],
  triangleBudget: 300,
});

const count = param('count', '4', { choices: ['3', '4', '5'], label: 'Rocks' });
const size = param('size', '2', { choices: ['1', '2', '3.5'], label: 'Cluster width (m)' });
const shape = param('shape', 'round', { choices: ['flat', 'round', 'jagged'], label: 'Shape' });
const stone = param('stone', '#8b8e93', { label: 'Main stone' });
const stone2 = param('stone2', '#a39d92', { label: 'Small rocks' });

presets({
  desert: { stone: '#b9774a', stone2: '#cf9a66' },
  granite: { stone: '#9a8f8a', stone2: '#6e6a6a' },
  snowy: { stone: '#7a8088', stone2: '#e9eff3' },
});

const W = Number(size.value) * 1000;
const n = Number(count.value);
const hf = shape.value === 'flat' ? 0.45 : shape.value === 'jagged' ? 1.05 : 0.7;
const topF = shape.value === 'jagged' ? 0.2 : 0.55;

const jit = (k: number, salt: number) => 0.8 + 0.35 * (0.5 + 0.5 * Math.sin(k * 12.9898 + salt * 78.233));
const ring = (r: number, s: number, salt: number, rot: number) => {
  const pt = (k: number) => {
    const a = rot + (2 * Math.PI * k) / s;
    const rr = r * jit(k, salt);
    return [rr * Math.cos(a), rr * 0.85 * Math.sin(a)];
  };
  let p = path().moveTo(pt(0)[0], pt(0)[1]);
  for (let k = 1; k < s; k++) p = p.lineTo(pt(k)[0], pt(k)[1]);
  return p.close();
};
const rock = (x: number, y: number, r: number, s: number, salt: number, turn: number, squash: number) => {
  const h = r * 2 * hf * squash;
  return ring(r * 0.8, s, salt, 0)
    .loft([ring(r, s, salt + 1, Math.PI / s), ring(r * 0.8, s, salt + 2, 0.3), ring(r * topF, s, salt + 3, Math.PI / s)], {
      planes: [
        { plane: 'XY', origin: [0, 0, 0] },
        { plane: 'XY', origin: [r * 0.08, 0, h * 0.3] },
        { plane: 'XY', origin: [-r * 0.06, r * 0.1, h * 0.68] },
        { plane: 'XY', origin: [r * 0.12, -r * 0.05, h] },
      ],
      ruled: true,
    })
    .rotateZ(turn)
    .translate(x, y, 0);
};

const cl = assembly('boulder-cluster');
const R = W * 0.28;
cl.part('boulder', rock(0, 0, R, 7, 1, 0, 1).color(stone));
for (let i = 0; i < n - 1; i++) {
  const a = (2 * Math.PI * i) / (n - 1) + 0.6;
  const r = R * (0.62 - 0.1 * i);
  const d = R * 0.85 + r * 0.6;
  cl.part(`rock-${i + 1}`, rock(d * Math.cos(a), d * Math.sin(a), r, 6, 3 + i * 5, i * 47, 0.75).color(stone2));
}

return cl.model();
