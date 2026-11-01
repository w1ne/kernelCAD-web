// Original kernelCAD low-poly wooden crate: a plank core wrapped in raised
// edge battens with optional diagonal or cross braces on the faces.
// Millimetres, Z up, base on z = 0 centred on x = y = 0.

meta({
  name: 'wooden-crate',
  license: 'CC0-1.0',
  title: 'Wooden crate',
  description: 'Cubic wooden shipping crate with raised edge battens and braced faces. Knobs: size, brace style, plank and batten colours.',
  tags: ['crate', 'box', 'wooden crate', 'container', 'cargo', 'storage', 'warehouse'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'indoor', 'warehouse', 'medieval', 'farm', 'street'],
  triangleBudget: 260,
});

const size = param('size', '0.6', { choices: ['0.4', '0.6', '0.8', '1'], label: 'Size (m)' });
const brace = param('brace', 'diagonal', { choices: ['diagonal', 'cross', 'none'], label: 'Face braces' });
const planks = param('planks', '#c49a5c', { label: 'Planks' });
const battens = param('battens', '#8a6236', { label: 'Battens' });

presets({
  weathered: { planks: '#a39880', battens: '#6e6555' },
  painted: { planks: '#5d7f4a', battens: '#3e5a33' },
  dark: { planks: '#7a5434', battens: '#4a3220' },
});

const S = Number(size.value) * 1000;
const b = S * 0.1; // batten width
const t = 18; // how far battens stand proud of the planks

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const crate = assembly('wooden-crate');
crate.part('planks', blk(-S / 2 + t, -S / 2 + t, 0, S / 2 - t, S / 2 - t, S - t).color(planks));

const h = S / 2;
// Corner posts.
for (const [i, [sx, sy]] of [[-1, -1], [1, -1], [1, 1], [-1, 1]].entries()) {
  const x0 = sx < 0 ? -h : h - b;
  const y0 = sy < 0 ? -h : h - b;
  crate.part(`post-${i + 1}`, blk(x0, y0, 0, x0 + b, y0 + b, S).color(battens));
}
// Top and bottom rails between the posts, on all four faces.
for (const [j, z0] of [[1, 0], [2, S - b]] as [number, number][]) {
  crate.part(`rail-front-${j}`, blk(-h + b - 1, -h, z0, h - b + 1, -h + b, z0 + b).color(battens));
  crate.part(`rail-back-${j}`, blk(-h + b - 1, h - b, z0, h - b + 1, h, z0 + b).color(battens));
  crate.part(`rail-left-${j}`, blk(-h, -h + b - 1, z0, -h + b, h - b + 1, z0 + b).color(battens));
  crate.part(`rail-right-${j}`, blk(h - b, -h + b - 1, z0, h, h - b + 1, z0 + b).color(battens));
}

// Face braces run corner to corner inside each face's batten frame.
if (brace.value !== 'none') {
  const inner = S - 2 * b;
  const len = Math.SQRT2 * inner - b * 0.6;
  const angles = brace.value === 'cross' ? [45, -45] : [45];
  let k = 0;
  for (const ang of angles) {
    for (const sy of [-1, 1]) {
      k++;
      crate.part(`brace-${k}`, box(len, t, b * 0.8, true).rotateY(ang * sy).translate(0, sy * (h - t / 2), S / 2).color(battens));
    }
    for (const sx of [-1, 1]) {
      k++;
      crate.part(`brace-${k}`, box(t, len, b * 0.8, true).rotateX(ang * sx).translate(sx * (h - t / 2), 0, S / 2).color(battens));
    }
  }
}

return crate.model();
