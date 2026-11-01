// Original kernelCAD low-poly pebble cluster: a scatter of smooth flattened
// stones of mixed sizes in two tones, for riverbeds, paths and beaches.

meta({
  name: 'pebble-cluster',
  license: 'CC0-1.0',
  title: 'Pebble cluster',
  description: 'Scatter of flattened river pebbles in mixed sizes and two tones, for riverbanks, beaches and garden paths. Knobs: pebble count, spread, stone and accent colours.',
  tags: ['pebbles', 'stones', 'gravel', 'rocks', 'river', 'beach', 'path', 'scatter', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'water', 'beach', 'garden', 'meadow', 'forest'],
  triangleBudget: 400,
});

const count = param('count', '8', { choices: ['5', '8', '12'], label: 'Pebbles' });
const spread = param('spread', '0.6', { choices: ['0.4', '0.6', '1'], label: 'Spread (m)' });
const stone = param('stone', '#9a9a94', { label: 'Stone' });
const accent = param('accent', '#c8bca8', { label: 'Accent stones' });

presets({
  beach: { stone: '#d8c8a8', accent: '#f0e8d8' },
  dark: { stone: '#5a5e62', accent: '#8a8e92' },
  red: { stone: '#a86a4a', accent: '#c89a7a' },
});

const n = Number(count.value);
const W = Number(spread.value) * 1000;

// Flattened pebble: a jittered hexagon swelling to a wider middle ring and a
// small top, so it reads as a smooth flat stone.
const jit = (k: number, salt: number) => 0.85 + 0.25 * (0.5 + 0.5 * Math.sin(k * 12.9898 + salt * 78.233));
const ring = (r: number, salt: number, rot: number, squash: number) => {
  const pt = (k: number) => {
    const a = rot + (2 * Math.PI * k) / 6;
    const rr = r * jit(k, salt);
    return [rr * Math.cos(a), rr * squash * Math.sin(a)] as const;
  };
  const [x0, y0] = pt(0);
  let p = path().moveTo(x0, y0);
  for (let k = 1; k < 6; k++) {
    const [x, y] = pt(k);
    p = p.lineTo(x, y);
  }
  return p.close();
};
const pebble = (r: number, salt: number) => {
  const sq = 0.6 + 0.3 * jit(1, salt + 9) - 0.25;
  const hh = r * (0.45 + 0.2 * jit(2, salt));
  return ring(r * 0.75, salt, 0, sq).loft([ring(r, salt + 1, Math.PI / 6, sq), ring(r * 0.55, salt + 2, 0, sq)], {
    planes: [
      { plane: 'XY', origin: [0, 0, 0] },
      { plane: 'XY', origin: [0, 0, hh * 0.45] },
      { plane: 'XY', origin: [0, 0, hh] },
    ],
    ruled: true,
  });
};

const cluster = assembly('pebble-cluster');
for (let i = 0; i < n; i++) {
  const a = i * 2.39996;
  const d = i === 0 ? 0 : (W / 2) * 0.85 * Math.sqrt(i / n);
  const r = W * (i === 0 ? 0.16 : 0.07 + 0.05 * ((i * 0.618) % 1));
  const p = pebble(r, i * 3 + 1).rotateZ(i * 53).translate(d * Math.cos(a), d * Math.sin(a), 0);
  cluster.part(`pebble-${i + 1}`, p.color(i % 3 === 1 ? accent : stone));
}

return cluster.model();
