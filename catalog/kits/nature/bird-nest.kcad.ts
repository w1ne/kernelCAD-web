// Original kernelCAD low-poly bird nest: a bowl of woven twigs (a faceted
// cup with a hollow) with a few stray twigs and speckle-free eggs inside.

meta({
  name: 'bird-nest',
  license: 'CC0-1.0',
  title: 'Bird nest',
  description: 'Woven twig bird nest with a hollow cup, stray twigs and a clutch of eggs, for trees, rooftops and egg hunts. Knobs: size, eggs, nest and egg colours.',
  tags: ['nest', 'bird nest', 'eggs', 'twigs', 'bird', 'spring', 'easter', 'forest', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'forest', 'garden', 'farm'],
  triangleBudget: 340,
});

const size = param('size', 'songbird', { choices: ['songbird', 'crow', 'stork'], label: 'Size' });
const eggs = param('eggs', '3', { choices: ['0', '2', '3', '4'], label: 'Eggs' });
const nest = param('nest', '#8a6a44', { label: 'Nest' });
const twig = param('twig', '#a88a5e', { label: 'Stray twigs' });
const egg = param('egg', '#9ad0e0', { label: 'Eggs' });

presets({
  white: { egg: '#f2efe6' },
  speckled: { egg: '#d8c8a8' },
  dark: { nest: '#5a4632', twig: '#7a6248' },
});

const s = size.value === 'songbird' ? 1 : size.value === 'crow' ? 2 : 5;
const n = Number(eggs.value);
const R = 80 * s;
const H = 60 * s;

const ngon = (r: number, k0: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < k0; k++) {
    const a = rot + (2 * Math.PI * k) / k0;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};

const nestA = assembly('bird-nest');
// Cup: an outer bowl with a bowl-shaped hollow cut from the top.
const outer = ngon(R * 0.6, 9).loft([ngon(R, 9, 0.35), ngon(R * 0.92, 9)], {
  planes: [
    { plane: 'XY', origin: [0, 0, 0] },
    { plane: 'XY', origin: [0, 0, H * 0.6] },
    { plane: 'XY', origin: [0, 0, H] },
  ],
  ruled: true,
});
const hollow = ngon(R * 0.35, 9).loft([ngon(R * 0.72, 9, 0.35), ngon(R * 0.75, 9)], {
  planes: [
    { plane: 'XY', origin: [0, 0, H * 0.35] },
    { plane: 'XY', origin: [0, 0, H * 0.85] },
    { plane: 'XY', origin: [0, 0, H + 20] },
  ],
  ruled: true,
});
nestA.part('nest', outer.subtract(hollow).color(nest));

// Stray twigs poking out round the rim at different angles.
for (let i = 0; i < 6; i++) {
  const az = i * 61 + 10;
  const len = R * (0.9 + 0.3 * (i % 2));
  const tw = ngon(R * 0.03, 3).extrude(len).rotateY(70 + 12 * (i % 3)).rotateZ(az).translate(0, 0, H * (0.55 + 0.1 * (i % 2)));
  const a = (az * Math.PI) / 180;
  nestA.part(`twig-${i + 1}`, tw.translate(R * 0.55 * Math.cos(a), R * 0.55 * Math.sin(a), 0).color(twig));
}

// Eggs: small faceted ovoids lying in the hollow.
const er = R * 0.2;
for (let i = 0; i < n; i++) {
  const a = (2 * Math.PI * i) / Math.max(1, n) + 0.3;
  const d = n === 1 ? 0 : R * 0.25;
  const e = ngon(er * 0.6, 6).loft([ngon(er, 6, 0.52), ngon(er * 0.8, 6), ngon(er * 0.3, 6, 0.52)], {
    planes: [
      { plane: 'XY', origin: [0, 0, 0] },
      { plane: 'XY', origin: [0, 0, er * 0.7] },
      { plane: 'XY', origin: [0, 0, er * 1.4] },
      { plane: 'XY', origin: [0, 0, er * 1.9] },
    ],
    ruled: true,
  }).rotateY(70).rotateZ((a * 180) / Math.PI + 90);
  nestA.part(`egg-${i + 1}`, e.translate(d * Math.cos(a), d * Math.sin(a), H * 0.42 + er * 0.6).color(egg));
}

return nestA.model();
