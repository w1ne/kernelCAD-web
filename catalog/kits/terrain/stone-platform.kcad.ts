// Original kernelCAD low-poly stone platform: a 2 m x 2 m raised block of
// coursed masonry with staggered joints, two-tone blocks and a flagstone top
// flush with its edges. Its top sits at 0.2 m plus the rise, level with the
// back edge of the ramp and stair tiles, so it builds raised levels.

meta({
  name: 'stone-platform',
  license: 'CC0-1.0',
  title: 'Stone platform',
  description: 'Raised 2 m square block of coursed stone masonry with staggered two-tone blocks and a flagstone top, for building raised levels. Knobs: rise, block, accent block, mortar and top colours.',
  tags: ['platform', 'block', 'masonry', 'stone', 'wall', 'plinth', 'castle', 'terrain', 'grid', 'level design'],
  kit: 'terrain',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'town', 'castle', 'dungeon'],
  triangleBudget: 1300,
});

const riseM = param('riseM', '1', { choices: ['0.5', '1', '2'], label: 'Rise (m)' });
const block = param('block', '#a39d92', { label: 'Blocks' });
const block2 = param('block2', '#8f897e', { label: 'Accent blocks' });
const mortar = param('mortar', '#5e5a53', { label: 'Mortar' });
const topC = param('top', '#b9b3a7', { label: 'Top flagstones' });

presets({
  sandstone: { block: '#d6b886', block2: '#c4a172', mortar: '#8c7350', top: '#e2c999' },
  dungeon: { block: '#62656b', block2: '#55585e', mortar: '#2f3034', top: '#74777d' },
  mossy: { block: '#9a9c8a', block2: '#7f8c62', mortar: '#4f5640', top: '#7f9a4f' },
});

const S = 2000;
const h = S / 2;
const Z = 200 + Number(riseM.value) * 1000;
const courses = Math.max(2, Math.round(Z / 340));
const ch = Z / courses;
const g = 26; // joint width
const d = 160; // block depth

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
const rect = (x0: number, y0: number, x1: number, y1: number) =>
  path().moveTo(x0, y0).lineTo(x1, y0).lineTo(x1, y1).lineTo(x0, y1).close();

const pf = assembly('stone-platform');
pf.part('core', blk(-h + 18, -h + 18, 0, h - 18, h - 18, Z - 40).color(mortar));

let k = 0;
for (let c = 0; c < courses; c++) {
  const z0 = c * ch + (c === 0 ? 0 : g / 2);
  const z1 = Math.min(Z - 40, (c + 1) * ch - g / 2);
  // Odd courses shift the joints by half a block.
  const cuts = c % 2 === 0 ? [-h, -h / 3, h / 3, h] : [-h, -2 * h / 3 + 40, 0 + 30, 2 * h / 3 - 20, h];
  for (const side of ['front', 'back', 'left', 'right']) {
    for (let i = 0; i < cuts.length - 1; i++) {
      k++;
      const a0 = cuts[i] + (i === 0 ? 0 : g / 2);
      const a1 = cuts[i + 1] - (i === cuts.length - 2 ? 0 : g / 2);
      const inset = 8 * (0.5 + 0.5 * Math.sin(k * 7.3)); // slight unevenness
      let shape;
      if (side === 'front') shape = blk(a0, -h + inset, z0, a1, -h + d, z1);
      else if (side === 'back') shape = blk(a0, h - d, z0, a1, h - inset, z1);
      // Side walls stop short of the corners, which the front/back blocks own.
      else if (side === 'left') shape = blk(-h + inset, Math.max(a0, -h + d - 4), z0, -h + d, Math.min(a1, h - d + 4), z1);
      else shape = blk(h - d, Math.max(a0, -h + d - 4), z0, h - inset, Math.min(a1, h - d + 4), z1);
      pf.part(`block-${k}`, shape.color(k % 3 === 0 ? block2 : block));
    }
  }
}

// Flagstone top: a 3 x 3 grid of chamfered slabs flush with the outer edge.
const n = 3;
const cell = S / n;
for (let i = 0; i < n; i++) {
  for (let j = 0; j < n; j++) {
    const x0 = -h + i * cell + (i === 0 ? 0 : g / 2);
    const x1 = -h + (i + 1) * cell - (i === n - 1 ? 0 : g / 2);
    const y0 = -h + j * cell + (j === 0 ? 0 : g / 2);
    const y1 = -h + (j + 1) * cell - (j === n - 1 ? 0 : g / 2);
    const top = Z - 8 * (0.5 + 0.5 * Math.sin((i * 3 + j) * 4.1));
    pf.part(`top-${i * n + j + 1}`, rect(x0, y0, x1, y1).loft(rect(x0 + 25, y0 + 25, x1 - 25, y1 - 25), {
      planes: [
        { plane: 'XY', origin: [0, 0, Z - 60] },
        { plane: 'XY', origin: [0, 0, top] },
      ],
      ruled: true,
    }).color(topC));
  }
}

return pf.model();
