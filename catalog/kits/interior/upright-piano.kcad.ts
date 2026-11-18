// Original kernelCAD low-poly upright piano: a tall case with cheeks, a
// keybed with white keys and grouped black keys, a fallboard, music desk,
// toe blocks and pedals, plus an optional matching bench. Millimetres, Z up,
// standing on z = 0 centred on x = y = 0. Keyboard faces -Y.

meta({
  name: 'upright-piano',
  license: 'CC0-1.0',
  title: 'Upright piano',
  description: 'Upright piano with a keyboard of white and grouped black keys, music desk, pedals and an optional piano bench. Knobs: bench, case, white key, black key and pedal colours.',
  tags: ['piano', 'upright piano', 'keyboard', 'instrument', 'music', 'living room', 'bench'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'living-room', 'school', 'bar'],
  triangleBudget: 600,
});

const bench = param('bench', 'yes', { choices: ['yes', 'no'], label: 'Bench' });
const caseC = param('case', '#1d1b1a', { label: 'Case' });
const ivory = param('ivory', '#f4f1e8', { label: 'White keys' });
const ebony = param('ebony', '#141414', { label: 'Black keys' });
const brass = param('brass', '#c9a24a', { label: 'Pedals' });

presets({
  walnut: { case: '#5a3a27', ebony: '#1a1a1a' },
  white: { case: '#f2f1ec', ebony: '#1a1a1a', brass: '#c9ccd0' },
});

const W = 1480;
const D = 600;
const H = 1250;
const keyZ = 720;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const p = assembly('upright-piano');
const yb = D / 2; // back
const yCase = yb - 330; // front face of the upper case
const yKey = yb - D; // front of the keybed
p.part('upper-case', blk(-W / 2, yCase, keyZ - 40, W / 2, yb, H).color(caseC));
p.part('lid', blk(-W / 2 - 15, yCase - 20, H - 1, W / 2 + 15, yb + 5, H + 25).color(caseC));
p.part('lower-case', blk(-W / 2 + 50, yCase + 40, 0, W / 2 - 50, yb, keyZ - 100).color(caseC));
for (const sx of [-1, 1]) {
  const x0 = sx < 0 ? -W / 2 : W / 2 - 50;
  p.part(`cheek-${sx < 0 ? 'left' : 'right'}`, blk(x0, yKey, keyZ - 120, x0 + 50, yCase + 1, keyZ + 110).color(caseC));
  p.part(`toe-block-${sx < 0 ? 'left' : 'right'}`, blk(x0, yKey + 20, 0, x0 + 50, yCase + 41, 80).color(caseC));
  p.part(`leg-${sx < 0 ? 'left' : 'right'}`, blk(x0 + 5, yKey + 30, 79, x0 + 45, yKey + 80, keyZ - 119).color(caseC));
}
p.part('keybed', blk(-W / 2 + 49, yKey, keyZ - 120, W / 2 - 49, yCase + 1, keyZ - 40).color(caseC));
p.part('fallboard', blk(-W / 2 + 49, yCase - 70, keyZ + 20, W / 2 - 49, yCase + 1, keyZ + 110).color(caseC));
p.part('music-desk', blk(-W / 2 + 200, yCase - 50, keyZ + 140, W / 2 - 200, yCase + 1, keyZ + 380).color(caseC));

// Keys: one white slab and five octaves of black keys (2 + 3 per octave).
const kx0 = -W / 2 + 60;
const kx1 = W / 2 - 60;
p.part('white-keys', blk(kx0, yKey + 10, keyZ - 41, kx1, yCase - 69, keyZ).color(ivory));
const octaves = 5;
const ow = (kx1 - kx0) / octaves;
const wk = ow / 7;
const blackAt = [1, 2, 4, 5, 6]; // after these white keys
for (let o = 0; o < octaves; o++) {
  for (const k of blackAt) {
    const x = kx0 + o * ow + k * wk;
    p.part(`black-${o + 1}-${k}`, blk(x - wk * 0.3, yKey + 70, keyZ - 1, x + wk * 0.3, yCase - 69, keyZ + 22).color(ebony));
  }
}
for (const dx of [-80, 0, 80]) {
  p.part(`pedal-${dx + 80}`, blk(dx - 15, yCase - 60, 60, dx + 15, yCase + 41, 80).color(brass));
}
if (bench.value === 'yes') {
  const by = yKey - 380;
  p.part('bench-top', blk(-380, by - 180, 440, 380, by + 180, 500).color(caseC));
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x = sx * 330;
    const y = by + sy * 140;
    p.part(`bench-leg-${sx}-${sy}`, blk(x - 22, y - 22, 0, x + 22, y + 22, 441).color(caseC));
  }
}

return p.model();
