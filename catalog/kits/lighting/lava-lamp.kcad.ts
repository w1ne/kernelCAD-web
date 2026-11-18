// Original kernelCAD low-poly lava lamp: a tapered metal base, a faceted
// rocket-shaped glass body with wax blobs bulging through it and a small cap.
// Millimetres, Z up, base on z = 0 centred on x = y = 0.

meta({
  name: 'lava-lamp',
  license: 'CC0-1.0',
  title: 'Lava lamp',
  description: 'Retro lava lamp with a tapered metal base, faceted glass body full of floating wax blobs and a cone cap, for desks, shelves and 70s living rooms. Knobs: size, blobs, base, liquid and wax colours.',
  tags: ['lava lamp', 'lamp', 'retro', '70s', 'groovy', 'desk lamp', 'light', 'decor'],
  kit: 'lighting',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'living-room', 'bedroom', 'office', 'retro'],
  triangleBudget: 400,
});

const size = param('size', 'classic', { choices: ['mini', 'classic', 'grande'], label: 'Size' });
const blobs = param('blobs', '3', { choices: ['2', '3', '5'], label: 'Wax blobs' });
const metal = param('metal', '#b9bcc2', { label: 'Base and cap' });
const liquid = param('liquid', '#d8326a', { label: 'Liquid' });
const wax = param('wax', '#ffcf3a', { label: 'Wax' });

presets({
  ocean: { liquid: '#2a6ad8', wax: '#7af0d8' },
  gold: { metal: '#c9a43a', liquid: '#f08a2a', wax: '#fff2a0' },
  slime: { metal: '#2a2a2e', liquid: '#3a1a5a', wax: '#8af04a' },
});

const s = size.value === 'mini' ? 0.65 : size.value === 'grande' ? 1.45 : 1;
const nb = Number(blobs.value);
const N = 8;
const ngon = (r: number, n = N, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos(rot + (2 * Math.PI * k) / n), r * Math.sin(rot + (2 * Math.PI * k) / n));
  return p.close();
};
const rings = (rs: [number, number][], n = N, rot = 0) =>
  ngon(rs[0][0] * s, n, rot).loft(rs.slice(1).map(([r]) => ngon(r * s, n, rot)), {
    planes: rs.map(([, z]) => ({ plane: 'XY' as const, origin: [0, 0, z * s] as [number, number, number] })),
    ruled: true,
  });

const l = assembly('lava-lamp');
// Base: wide foot narrowing up to the glass collar.
l.part('base', rings([[78, 0], [78, 10], [44, 150], [48, 158]]).color(metal));
// Glass: narrow at the collar, widest a third of the way up, tapering to the cap.
const glass: [number, number][] = [[42, 155], [62, 240], [56, 330], [34, 410]];
l.part('glass', rings(glass, N, Math.PI / N).color(liquid));
l.part('cap', rings([[38, 405], [36, 420], [14, 465]]).color(metal));
// Wax: a puddle on the bottom plus floating blobs poking through the glass.
const glassR = (z: number) => {
  for (let i = 0; i < glass.length - 1; i++) {
    const [r0, z0] = glass[i]; const [r1, z1] = glass[i + 1];
    if (z <= z1) return r0 + ((r1 - r0) * (z - z0)) / (z1 - z0);
  }
  return glass[glass.length - 1][0];
};
const spots: [number, number, number][] = [[215, -1.3, 34], [300, -2.5, 28], [365, -0.6, 20], [255, 2.0, 22], [330, 0.9, 18]];
// A blob is a squashed six-sided double cone; its centre sits just inside the glass.
const blob = (r: number) => ngon(r * 0.4, 6).loft([ngon(r * 0.9, 6, 0.5), ngon(r * 0.85, 6, 0), ngon(r * 0.35, 6, 0.5)], {
  planes: [-1.1, -0.45, 0.45, 1.2].map((t) => ({ plane: 'XY' as const, origin: [0, 0, t * r] as [number, number, number] })),
  ruled: true,
});
for (let i = 0; i < nb; i++) {
  const [z, a, r] = spots[i];
  const rr = glassR(z) - r * 0.15;
  l.part(`blob-${i + 1}`, blob(r * s).rotateZ((a * 180) / Math.PI)
    .translate(rr * s * Math.cos(a), rr * s * Math.sin(a), z * s).color(wax));
}

return l.model();
