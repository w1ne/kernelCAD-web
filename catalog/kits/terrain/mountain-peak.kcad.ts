// Original kernelCAD low-poly mountain: a rugged rock massif filling a 4 m x
// 4 m footprint (2 x 2 tiles) on a grassy base, built from stacked jittered
// rings with a secondary shoulder peak, a snow cap and scree boulders round
// its foot. The base edges sit at the 0.2 m tile height of the 2 m grid.

meta({
  name: 'mountain-peak',
  license: 'CC0-1.0',
  title: 'Mountain peak',
  description: 'Rugged low-poly mountain on a 4 m (2 x 2 tile) grassy base with a shoulder peak, snow cap and scree boulders. Knobs: height, snow cap, rock, accent rock, snow, grass and dirt colours.',
  tags: ['mountain', 'peak', 'summit', 'massif', 'rock', 'snow', 'alpine', 'landmark', 'terrain', 'grid'],
  kit: 'terrain',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'mountain', 'winter'],
  triangleBudget: 700,
});

const heightM = param('heightM', '4', { choices: ['3', '4', '6'], label: 'Height (m)' });
const snowCap = param('snowCap', 'yes', { choices: ['yes', 'no'], label: 'Snow cap' });
const rock = param('rock', '#86817c', { label: 'Rock' });
const rock2 = param('rock2', '#6f6a66', { label: 'Accent rock' });
const snow = param('snow', '#f1f5f8', { label: 'Snow' });
const grass = param('grass', '#6aa443', { label: 'Grass' });
const dirt = param('dirt', '#7a5636', { label: 'Dirt edge' });

presets({
  desert: { rock: '#b8724a', rock2: '#9a5c3a', grass: '#d8b77a', dirt: '#9a6a44', snowCap: 'no' },
  volcanic: { rock: '#3f3a37', rock2: '#2c2826', snow: '#ff6a1a', grass: '#4a4440' },
  winter: { grass: '#eef3f6', rock: '#6f747a', rock2: '#5f646a' },
});

const S = 4000;
const h = S / 2;
const t = 200;
const skirtH = t * 0.7;
const H = Number(heightM.value) * 1000;
const hasSnow = snowCap.value === 'yes';

const ring = (r: number, s: number, salt: number, rot = 0) => {
  let p = path();
  for (let k = 0; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    const rr = r * (0.68 + 0.5 * (0.5 + 0.5 * Math.sin(k * 12.9898 + salt * 78.233)));
    p = k === 0 ? p.moveTo(rr * Math.cos(a), rr * Math.sin(a)) : p.lineTo(rr * Math.cos(a), rr * Math.sin(a));
  }
  return p.close();
};
// Stacked loft of jittered 9-gon rings between the given (radius, z, dx, dy) stations.
const massif = (st: [number, number, number, number][], salt: number) =>
  ring(st[0][0], 9, salt).loft(st.slice(1).map(([r], i) => ring(r, 9, salt + i + 1, (i % 2) * 0.35)), {
    planes: st.map(([, z, dx, dy]) => ({ plane: 'XY' as const, origin: [dx, dy, z] as [number, number, number] })),
    ruled: true,
  });

const mt = assembly('mountain-peak');
mt.part('dirt', box(S, S, skirtH, true).translate(0, 0, skirtH / 2).color(dirt));
mt.part('grass', box(S, S, t - skirtH, true).translate(0, 0, (t + skirtH) / 2).color(grass));
const snowLine = H * 0.68;
mt.part('main', massif([[h * 0.95, t - 20, 0, 0], [h * 0.78, H * 0.2, 120, -60], [h * 0.5, H * 0.42, -60, 140], [h * 0.34, snowLine, 150, 120]], 1).color(rock));
mt.part('summit', massif([[h * 0.34, snowLine - 1, 150, 120], [h * 0.22, H * 0.8, 260, 40], [h * 0.03, H, 120, 220]], 4).color(hasSnow ? snow : rock));
// Shoulder peak to one side and a low ridge spur to the other.
mt.part('spur', massif([[h * 0.42, t - 20, h * 0.42, h * 0.3], [h * 0.26, H * 0.22, h * 0.4, h * 0.32], [h * 0.05, H * 0.34, h * 0.35, h * 0.3]], 12).color(rock2));
mt.part('shoulder', massif([[h * 0.5, t - 20, -h * 0.4, -h * 0.25], [h * 0.3, H * 0.35, -h * 0.42, -h * 0.25], [h * 0.06, H * 0.55, -h * 0.45, -h * 0.3]], 7).color(rock2));
if (hasSnow) {
  mt.part('shoulder-snow', ring(h * 0.12, 9, 9).loft(ring(h * 0.03, 9, 10), { spacing: H * 0.12, ruled: true })
    .translate(-h * 0.445, -h * 0.29, H * 0.45).color(snow));
}
// Scree boulders round the foot.
[[1500, -1300, 260], [-1450, 1350, 220], [1450, 1200, 200], [-300, -1650, 180]].forEach(([x, y, r], i) => {
  mt.part(`boulder-${i + 1}`, ring(r, 6, i + 20).loft(ring(r * 0.45, 6, i + 30), { spacing: r * 0.9, ruled: true })
    .translate(x, y, t - 20).color(i % 2 === 0 ? rock2 : rock));
});

return mt.model();
