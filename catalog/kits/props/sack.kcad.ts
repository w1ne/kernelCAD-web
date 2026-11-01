// Original kernelCAD low-poly sack: a slumped burlap bag lofted from
// irregular polygon rings, cinched at the neck with a rope tie and a
// ruffled top, or rolled open to show its contents.
// Millimetres, Z up, base on z = 0 centred on x = y = 0.

meta({
  name: 'sack',
  license: 'CC0-1.0',
  title: 'Sack',
  description: 'Lumpy burlap sack, tied shut with rope or rolled open to show grain, flour or potatoes. Knobs: size, style, cloth, rope and contents colours.',
  tags: ['sack', 'bag', 'burlap', 'grain', 'flour', 'potatoes', 'farm', 'market', 'storage'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'indoor', 'medieval', 'farm', 'market', 'warehouse'],
  triangleBudget: 240,
});

const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Size' });
const style = param('style', 'tied', { choices: ['tied', 'open'], label: 'Style' });
const cloth = param('cloth', '#c2a477', { label: 'Cloth' });
const rope = param('rope', '#7a5a35', { label: 'Rope tie' });
const contents = param('contents', '#e6d6a8', { label: 'Contents' });

presets({
  flour: { cloth: '#e8e2d2', rope: '#9a8a6a', contents: '#f6f3ea' },
  potatoes: { cloth: '#a68a5e', contents: '#b98a4f' },
  coal: { cloth: '#6f6656', rope: '#3a3128', contents: '#2a2a2c' },
});

const s = size.value === 'small' ? 0.7 : size.value === 'large' ? 1.3 : 1;
const sides = 8;
const W = 480 * s;
const H = 600 * s;

// Irregular, slightly flattened ring so the bag looks slumped, not turned.
const jit = (k: number, salt: number) => 0.88 + 0.22 * (0.5 + 0.5 * Math.sin(k * 12.9898 + salt * 78.233));
const ring = (r: number, salt: number, rot = 0) => {
  const pt = (k: number) => {
    const a = rot + (2 * Math.PI * k) / sides;
    const rr = r * jit(k, salt);
    return [rr * Math.cos(a), rr * 0.8 * Math.sin(a)] as const;
  };
  const [x0, y0] = pt(0);
  let p = path().moveTo(x0, y0);
  for (let k = 1; k < sides; k++) {
    const [x, y] = pt(k);
    p = p.lineTo(x, y);
  }
  return p.close();
};
// Rings: [radius, jitter salt, z, rotation, x lean].
const loftRings = (rings: [number, number, number, number, number][]) =>
  ring(rings[0][0], rings[0][1], rings[0][3]).loft(rings.slice(1).map(([r, salt, , rot]) => ring(r, salt, rot)), {
    planes: rings.map(([, , z, , x]) => ({ plane: 'XY' as const, origin: [x, 0, z] as [number, number, number] })),
    ruled: true,
  });

const sack = assembly('sack');
const r = W / 2;
const off = Math.PI / sides;
if (style.value === 'tied') {
  // Slumped body leaning a little to +X, cinched neck, splayed ruffle.
  const neckZ = H * 0.78;
  const lean = r * 0.18;
  sack.part('bag', loftRings([
    [r * 0.95, 1, 0, 0, 0],
    [r * 1.1, 2, H * 0.18, off, 0],
    [r * 1.0, 3, H * 0.45, 0, lean * 0.4],
    [r * 0.62, 12, H * 0.68, off, lean * 0.8],
    [r * 0.24, 4, neckZ, 0, lean],
  ]).color(cloth));
  sack.part('ruffle', loftRings([
    [r * 0.2, 5, neckZ - 15 * s, 0, lean],
    [r * 0.5, 6, H * 0.94, off, lean * 1.2],
    [r * 0.38, 7, H, 0, lean * 1.3],
  ]).color(cloth));
  sack.part('tie', ring(r * 0.27, 9).extrude(35 * s).translate(lean, 0, neckZ - 20 * s).color(rope));
} else {
  const topZ = H * 0.78;
  sack.part('bag', loftRings([
    [r * 0.95, 1, 0, 0, 0],
    [r * 1.1, 2, H * 0.22, off, 0],
    [r * 1.0, 3, H * 0.6, 0, 0],
    [r * 0.95, 4, topZ, off, 0],
  ]).color(cloth));
  // Rolled-down cuff and a mounded heap of contents.
  sack.part('cuff', ring(r * 1.04, 4, off).extrude(45 * s).translate(0, 0, topZ - 30 * s).color(cloth));
  sack.part('contents', ring(r * 0.9, 8, off).loft(ring(r * 0.35, 11), { spacing: 110 * s, ruled: true }).translate(0, 0, topZ - 20 * s).color(contents));
}

return sack.model();
