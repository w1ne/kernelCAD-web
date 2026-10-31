// Original kernelCAD low-poly bush: overlapping faceted blobs (ruled lofts of
// polygon rings) with optional berry dots.

meta({
  name: 'bush',
  title: 'Bush',
  description: 'Rounded leafy shrub made of clustered faceted lumps, with optional berries. Knobs: size, lump count, berries, leaf and berry colours.',
  tags: ['bush', 'shrub', 'hedge', 'plant', 'garden', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'forest', 'meadow', 'park', 'garden'],
  triangleBudget: 300,
});

const size = param('size', '1.2', { choices: ['0.6', '1.2', '1.8'], label: 'Width (m)' });
const lumps = param('lumps', '4', { choices: ['3', '4', '5'], label: 'Lumps' });
const berries = param('berries', 'no', { choices: ['no', 'yes'], label: 'Berries' });
const leaves = param('leaves', '#4c8c3c', { label: 'Leaves' });
const berry = param('berry', '#c8323a', { label: 'Berries' });

presets({
  autumn: { leaves: '#b5652b' },
  berry: { berries: 'yes' },
  snowy: { leaves: '#e3eaee' },
});

const w = Number(size.value) * 1000;
const n = Number(lumps.value);

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const blob = (x: number, y: number, z: number, r: number, hh: number, s: number) =>
  ngon(r * 0.6, s).loft([ngon(r, s, Math.PI / s), ngon(r * 0.82, s), ngon(r * 0.32, s, Math.PI / s)], {
    planes: [
      { plane: 'XY', origin: [x, y, z] },
      { plane: 'XY', origin: [x, y, z + hh * 0.33] },
      { plane: 'XY', origin: [x, y, z + hh * 0.7] },
      { plane: 'XY', origin: [x, y, z + hh] },
    ],
    ruled: true,
  });

const bush = assembly('bush');
const r = w * 0.3;
bush.part('core', blob(0, 0, 0, r * 1.15, w * 0.62, 7).color(leaves));
const spots: number[][] = [];
for (let i = 0; i < n - 1; i++) {
  const a = (2 * Math.PI * i) / (n - 1) + 0.3;
  const d = r * 0.85;
  const rr = r * (0.8 + 0.12 * Math.sin(i * 1.7));
  const hh = w * (0.42 + 0.06 * Math.cos(i * 2.3));
  bush.part(`lump-${i + 1}`, blob(d * Math.cos(a), d * Math.sin(a), 0, rr, hh, 6).color(leaves));
  spots.push([(d + rr * 0.78) * Math.cos(a + 0.2), (d + rr * 0.78) * Math.sin(a + 0.2), hh * 0.4]);
}
if (berries.value === 'yes') {
  spots.push([r * 0.4, -r * 0.5, w * 0.6]);
  spots.forEach(([x, y, z], i) => {
    const br = w * 0.035;
    bush.part(`berry-${i + 1}`, ngon(br, 4).loft(ngon(br * 0.4, 4), { spacing: br * 1.2, ruled: true }).translate(x, y, z).color(berry));
  });
}

return bush.model();
