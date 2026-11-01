// Original kernelCAD low-poly cairn: a balanced stack of flat river stones,
// largest at the bottom, each slightly offset and turned, in two tones.

meta({
  name: 'cairn',
  license: 'CC0-1.0',
  title: 'Stone cairn',
  description: 'Balanced stack of flat stones shrinking toward the top, a trail marker or zen garden piece. Knobs: stones, base width, stone and accent colours.',
  tags: ['cairn', 'stone stack', 'rock stack', 'trail marker', 'zen', 'balanced stones', 'path', 'mountain', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'mountain', 'beach', 'garden', 'forest'],
  triangleBudget: 340,
});

const stones = param('stones', '6', { choices: ['4', '6', '8'], label: 'Stones' });
const size = param('size', '0.5', { choices: ['0.3', '0.5', '0.8'], label: 'Base width (m)' });
const stone = param('stone', '#8e8e88', { label: 'Stone' });
const accent = param('accent', '#b8b0a2', { label: 'Accent stones' });

presets({
  dark: { stone: '#4f545a', accent: '#6e747a' },
  sandstone: { stone: '#b88a62', accent: '#d4ae84' },
});

const n = Number(stones.value);
const W = Number(size.value) * 1000;

const jit = (k: number, salt: number) => 0.86 + 0.22 * (0.5 + 0.5 * Math.sin(k * 12.9898 + salt * 78.233));
const ring = (r: number, salt: number, rot: number) => {
  const pt = (k: number) => {
    const a = rot + (2 * Math.PI * k) / 7;
    const rr = r * jit(k, salt);
    return [rr * Math.cos(a), rr * 0.8 * Math.sin(a)] as const;
  };
  const [x0, y0] = pt(0);
  let p = path().moveTo(x0, y0);
  for (let k = 1; k < 7; k++) {
    const [x, y] = pt(k);
    p = p.lineTo(x, y);
  }
  return p.close();
};
// Flat stone: narrow foot, wide belly, smaller top.
const flat = (r: number, t: number, salt: number, x: number, y: number, z: number) =>
  ring(r * 0.72, salt, 0).loft([ring(r, salt + 1, Math.PI / 7), ring(r * 0.68, salt + 2, 0)], {
    planes: [
      { plane: 'XY', origin: [x, y, z] },
      { plane: 'XY', origin: [x, y, z + t * 0.45] },
      { plane: 'XY', origin: [x, y, z + t] },
    ],
    ruled: true,
  });

const cairn = assembly('cairn');
let z = 0;
for (let i = 0; i < n; i++) {
  const t = i / Math.max(1, n - 1);
  const r = (W / 2) * (1 - t * 0.62);
  const th = r * (0.55 - 0.1 * (i % 2));
  const x = Math.sin(i * 2.1) * r * 0.08;
  const y = Math.cos(i * 1.6) * r * 0.08;
  cairn.part(`stone-${i + 1}`, flat(r, th, i * 3 + 1, x, y, z).rotateZ(i * 41).color(i % 3 === 1 ? accent : stone));
  // Next stone sinks a little into this one's top so the stack touches.
  z += th * 0.9;
}

return cairn.model();
