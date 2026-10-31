// Original kernelCAD low-poly rug: a thin two-tone mat with a border and a
// centre field or stripes. Millimetres, Z up, lying on z = 0 centred on x = y = 0.

meta({
  name: 'rug',
  title: 'Rug',
  description: 'Flat two-tone area rug with a border, in three room sizes, plain-field or striped. Knobs: size, pattern, border and field colours.',
  tags: ['rug', 'carpet', 'mat', 'area rug', 'floor', 'living room'],
  kit: 'interior',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'living-room', 'bedroom', 'office'],
  triangleBudget: 200,
});

const size = param('size', '2x3', { choices: ['1.6x2.3', '2x3', '2.5x3.5'], label: 'Size (m)' });
const pattern = param('pattern', 'border', { choices: ['border', 'stripes'], label: 'Pattern' });
const border = param('border', '#7a2f35', { label: 'Border' });
const field = param('field', '#d8c6a3', { label: 'Field' });

presets({
  navy: { border: '#24344d', field: '#c9cfd6' },
  forest: { border: '#2f5a46', field: '#e6dcc4' },
});

const [wm, lm] = size.value.split('x').map(Number);
const W = lm * 1000; // long side along X
const D = wm * 1000;
const t = 10;
const b = Math.min(W, D) * 0.08;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const rug = assembly('rug');
// Border strips frame the field instead of lying under it, so no faces overlap.
rug.part('border-front', blk(-W / 2, -D / 2, 0, W / 2, -D / 2 + b, t).color(border));
rug.part('border-back', blk(-W / 2, D / 2 - b, 0, W / 2, D / 2, t).color(border));
rug.part('border-left', blk(-W / 2, -D / 2 + b, 0, -W / 2 + b, D / 2 - b, t).color(border));
rug.part('border-right', blk(W / 2 - b, -D / 2 + b, 0, W / 2, D / 2 - b, t).color(border));
if (pattern.value === 'border') {
  rug.part('field', blk(-W / 2 + b, -D / 2 + b, 0, W / 2 - b, D / 2 - b, t).color(field));
} else {
  const n = 9;
  const sw = (W - 2 * b) / n;
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + b + i * sw;
    rug.part(`stripe-${i + 1}`, blk(x, -D / 2 + b, 0, x + sw, D / 2 - b, t).color(i % 2 === 0 ? field : border));
  }
}

return rug.model();
