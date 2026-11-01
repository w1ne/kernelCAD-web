// Original kernelCAD low-poly rock pillar (hoodoo): stacked, offset faceted
// chunks in alternating sediment bands under a wider cap rock.

meta({
  name: 'rock-pillar',
  license: 'CC0-1.0',
  title: 'Rock pillar',
  description: 'Tall eroded rock spire (hoodoo) of stacked offset chunks in banded stone under a wide cap rock, for canyon and desert scenes. Knobs: height, chunks, stone, band and cap colours.',
  tags: ['rock', 'pillar', 'spire', 'hoodoo', 'stack', 'canyon', 'desert', 'cliff', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'desert', 'mountain', 'canyon'],
  triangleBudget: 300,
});

const heightM = param('heightM', '4', { choices: ['2', '4', '6', '9'], label: 'Height (m)' });
const chunks = param('chunks', '4', { choices: ['3', '4', '5'], label: 'Chunks' });
const stone = param('stone', '#c27a4a', { label: 'Stone' });
const band = param('band', '#a85f38', { label: 'Bands' });
const cap = param('cap', '#8a6a52', { label: 'Cap rock' });

presets({
  grey: { stone: '#8d9095', band: '#757980', cap: '#5f6368' },
  sandstone: { stone: '#d8b27c', band: '#c49862', cap: '#9a7a58' },
});

const h = Number(heightM.value) * 1000;
const n = Number(chunks.value);
const s = 7;

const jit = (k: number, salt: number) => 0.82 + 0.3 * (0.5 + 0.5 * Math.sin(k * 12.9898 + salt * 78.233));
const ring = (r: number, salt: number, rot: number) => {
  const pt = (k: number) => {
    const a = rot + (2 * Math.PI * k) / s;
    const rr = r * jit(k, salt);
    return [rr * Math.cos(a), rr * 0.9 * Math.sin(a)] as const;
  };
  const [x0, y0] = pt(0);
  let p = path().moveTo(x0, y0);
  for (let k = 1; k < s; k++) {
    const [x, y] = pt(k);
    p = p.lineTo(x, y);
  }
  return p.close();
};
// Chunk: narrower at both ends, bulging in the middle.
const chunk = (r: number, z: number, hh: number, salt: number, dx: number, dy: number) =>
  ring(r * 0.9, salt, 0).loft([ring(r, salt + 1, Math.PI / s), ring(r * 0.88, salt + 2, 0)], {
    planes: [
      { plane: 'XY', origin: [dx, dy, z] },
      { plane: 'XY', origin: [dx * 1.2, dy * 1.2, z + hh * 0.5] },
      { plane: 'XY', origin: [dx, dy, z + hh] },
    ],
    ruled: true,
  });

const pillar = assembly('rock-pillar');
const capH = h * 0.14;
const bodyH = h - capH;
const segH = bodyH / n;
const R0 = h * 0.14;
for (let i = 0; i < n; i++) {
  const t = i / n;
  const r = R0 * (i === 0 ? 1.15 : 1 - t * 0.5);
  const dx = Math.sin(i * 2.1) * r * 0.12;
  const dy = Math.cos(i * 1.7) * r * 0.1;
  const zz = i * segH - (i > 0 ? segH * 0.06 : 0);
  pillar.part(`chunk-${i + 1}`, chunk(r, zz, segH * (i > 0 ? 1.12 : 1.06), i * 3 + 1, dx, dy).color(i % 2 ? band : stone));
}
// Wide flat cap rock overhanging the neck.
const capR = R0 * 1.15;
pillar.part('cap', ring(capR * 0.7, 20, 0).loft([ring(capR, 21, Math.PI / s), ring(capR * 0.8, 22, 0)], {
  planes: [
    { plane: 'XY', origin: [0, 0, bodyH - capH * 0.15] },
    { plane: 'XY', origin: [capR * 0.05, 0, bodyH + capH * 0.45] },
    { plane: 'XY', origin: [0, 0, h] },
  ],
  ruled: true,
}).color(cap));

return pillar.model();
