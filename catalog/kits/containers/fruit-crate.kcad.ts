// Original kernelCAD low-poly fruit crate: two solid end boards with
// hand-hold slots joined by spaced side and floor slats, empty or heaped
// with faceted fruit. Millimetres, Z up, base on z = 0 centred on
// x = y = 0, long side along X.

meta({
  name: 'fruit-crate',
  license: 'CC0-1.0',
  title: 'Fruit crate',
  description: 'Open wooden slatted fruit crate with solid end boards and hand-holds, empty or heaped with apples, oranges or lemons. Knobs: fill, slats, wood, end board and fruit colours.',
  tags: ['fruit crate', 'crate', 'apple crate', 'produce', 'slatted', 'market', 'orchard', 'farm'],
  kit: 'containers',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'indoor', 'farm', 'market', 'shop', 'kitchen', 'warehouse'],
  triangleBudget: 460,
});

const fill = param('fill', 'full', { choices: ['empty', 'full'], label: 'Fill' });
const slats = param('slats', '3', { choices: ['2', '3'], label: 'Side slats' });
const wood = param('wood', '#c8a06a', { label: 'Slats' });
const ends = param('ends', '#a87e4a', { label: 'End boards' });
const fruit = param('fruit', '#c8302a', { label: 'Fruit' });

presets({
  oranges: { fruit: '#ee8a1e' },
  lemons: { fruit: '#ecd23a' },
  weathered: { wood: '#9a9080', ends: '#7a7062', fruit: '#7ac043' },
});

const L = 520;
const W = 340;
const H = 290;
const et = 22; // end board thickness
const st = 12; // slat thickness
const ns = Number(slats.value);

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const c = assembly('fruit-crate');
// End boards with a hand-hold slot near the top.
for (const sx of [-1, 1]) {
  const x0 = sx < 0 ? -L / 2 : L / 2 - et;
  c.part(`end-${sx < 0 ? 'l' : 'r'}`, blk(x0, -W / 2, 0, x0 + et, W / 2, H)
    .subtract(blk(x0 - 5, -60, H - 75, x0 + et + 5, 60, H - 40))
    .color(ends));
}
// Side slats: equal boards with gaps, the top one flush with the end tops.
const sh = ns === 2 ? 110 : 75;
for (const sy of [-1, 1]) {
  for (let k = 0; k < ns; k++) {
    const z1 = H - k * ((H - sh) / (ns - 1));
    const y0 = sy < 0 ? -W / 2 - st : W / 2;
    c.part(`slat-${sy < 0 ? 'f' : 'b'}${k + 1}`, blk(-L / 2 - 3, y0, z1 - sh, L / 2 + 3, y0 + st, z1).color(wood));
  }
}
// Floor slats.
for (let k = 0; k < 3; k++) {
  const y = -W / 2 + 20 + k * ((W - 40 - 80) / 2);
  c.part(`floor-${k + 1}`, blk(-L / 2 + et - 1, y, 6, L / 2 - et + 1, y + 80, 6 + st).color(wood));
}

if (fill.value === 'full') {
  // A heap of fruit: a domed block filling the crate with a few loose
  // faceted fruit on top.
  const rect = (l: number, w: number) => path().moveTo(-l / 2, -w / 2).lineTo(l / 2, -w / 2).lineTo(l / 2, w / 2).lineTo(-l / 2, w / 2).close();
  c.part('heap', rect(L - 2 * et - 2, W - 2).loft([rect(L - 2 * et - 30, W - 40), rect(L * 0.4, W * 0.35)], {
    planes: [
      { plane: 'XY', origin: [0, 0, 18] },
      { plane: 'XY', origin: [0, 0, H - 15] },
      { plane: 'XY', origin: [0, 0, H + 25] },
    ],
    ruled: true,
  }).color(fruit));
  const ngon = (r: number, rot: number) => {
    let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
    for (let k = 1; k < 6; k++) p = p.lineTo(r * Math.cos(rot + (Math.PI * k) / 3), r * Math.sin(rot + (Math.PI * k) / 3));
    return p.close();
  };
  const fr = 52;
  const one = (x: number, y: number, z: number) => ngon(fr * 0.5, 0).loft([ngon(fr, Math.PI / 6), ngon(fr * 0.55, 0)], {
    planes: [
      { plane: 'XY', origin: [x, y, z - fr * 0.75] },
      { plane: 'XY', origin: [x, y, z] },
      { plane: 'XY', origin: [x, y, z + fr * 0.7] },
    ],
    ruled: true,
  });
  [[-150, -85, H + 12], [-55, 80, H + 30], [35, -70, H + 34], [150, 65, H + 12], [-170, 85, H + 2], [150, -95, H + 2], [-40, -20, H + 50]]
    .forEach(([x, y, z], i) => c.part(`fruit-${i + 1}`, one(x, y, z).color(fruit)));
}

return c.model();
