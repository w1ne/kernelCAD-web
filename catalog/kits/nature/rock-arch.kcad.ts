// Original kernelCAD low-poly natural rock arch: two eroded, leaning rock
// legs bridged by a heavy faceted span, in banded desert stone.
// The arch spans along X, centred, base on z = 0.

meta({
  name: 'rock-arch',
  license: 'CC0-1.0',
  title: 'Rock arch',
  description: 'Natural eroded rock arch of two leaning legs and a heavy faceted span, for desert canyons, coasts and adventure maps. Knobs: span, height, stone and band colours.',
  tags: ['rock arch', 'arch', 'natural arch', 'canyon', 'desert', 'landmark', 'cliff', 'coast', 'rock', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'desert', 'canyon', 'mountain', 'beach'],
  triangleBudget: 300,
});

const spanM = param('spanM', '4', { choices: ['3', '4', '6'], label: 'Span (m)' });
const heightM = param('heightM', '3.5', { choices: ['2.5', '3.5', '5'], label: 'Height (m)' });
const stone = param('stone', '#c47a4e', { label: 'Stone' });
const band = param('band', '#a85f3c', { label: 'Span band' });

presets({
  grey: { stone: '#8e9094', band: '#74777c' },
  sandstone: { stone: '#d8b07a', band: '#c49660' },
});

const S = Number(spanM.value) * 1000;
const H = Number(heightM.value) * 1000;
const s = 7;

const jit = (k: number, salt: number) => 0.82 + 0.3 * (0.5 + 0.5 * Math.sin(k * 12.9898 + salt * 78.233));
const ring = (r: number, salt: number, rot: number, sx = 1) => {
  const pt = (k: number) => {
    const a = rot + (2 * Math.PI * k) / s;
    const rr = r * jit(k, salt);
    return [rr * sx * Math.cos(a), rr * Math.sin(a)] as const;
  };
  const [x0, y0] = pt(0);
  let p = path().moveTo(x0, y0);
  for (let k = 1; k < s; k++) {
    const [x, y] = pt(k);
    p = p.lineTo(x, y);
  }
  return p.close();
};

const arch = assembly('rock-arch');
const legR = S * 0.2;
const rEnd = H * 0.2;
const rMid = H * 0.13;
const legTop = H * 0.55;
// Legs: wide foot, slight waist, swelling into the span; leaning inward.
for (const side of [-1, 1]) {
  const x = side * (S / 2 + legR * 0.5);
  const lean = -side * legR * 0.3;
  arch.part(`leg-${side < 0 ? 'left' : 'right'}`, ring(legR * 1.2, side + 3, 0).loft([ring(legR * 0.85, side + 4, Math.PI / s), ring(legR * 0.7, side + 5, 0)], {
    planes: [
      { plane: 'XY', origin: [x, 0, 0] },
      { plane: 'XY', origin: [x + lean * 0.5, 0, legTop * 0.5] },
      { plane: 'XY', origin: [x + lean, 0, legTop + rEnd * 0.45] },
    ],
    ruled: true,
  }).color(stone));
}
// Span: rings across X following a rising curve, thick where it meets the
// legs and thinner at the crown, so it reads as one eroded bridge of rock.
const xs = [-1, -0.5, 0, 0.5, 1];
const sections = xs.map((t) => {
  const x = t * (S / 2 + legR * 0.3);
  const r = rEnd + (rMid - rEnd) * (1 - t * t);
  const z = legTop + rEnd * 0.6 + (H - rMid - legTop - rEnd * 0.6) * (1 - t * t);
  return { x, r, z };
});
const profiles = sections.map(({ r }, i) => ring(r, 9 + i, (i % 2) * (Math.PI / s)));
arch.part('span', profiles[0].loft(profiles.slice(1), {
  planes: sections.map(({ x, z }) => ({ plane: 'YZ' as const, origin: [x, 0, z] as [number, number, number] })),
  ruled: true,
}).color(band));

return arch.model();
