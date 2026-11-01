// Original kernelCAD low-poly cave entrance: a faceted rock hill filling a
// 2 m x 2 m tile, with an arched tunnel mouth cut into its front (-Y) face,
// a dark interior, a grassy cap and either a natural opening or a timber-
// framed mine portal. Stands on the 2 m grid.

meta({
  name: 'cave-entrance',
  license: 'CC0-1.0',
  title: 'Cave entrance',
  description: 'Faceted rock hill with an arched cave mouth and dark interior, natural or framed as a timber mine portal, with a grassy cap. Knobs: style, hill height, rock, accent rock, grass, shadow and timber colours.',
  tags: ['cave', 'cavern', 'mine', 'tunnel', 'entrance', 'dungeon entrance', 'rock', 'hill', 'mountain', 'terrain', 'grid'],
  kit: 'terrain',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'mountain', 'forest', 'dungeon'],
  triangleBudget: 600,
});

const style = param('style', 'natural', { choices: ['natural', 'mine'], label: 'Style' });
const heightM = param('heightM', '2', { choices: ['1.8', '2', '2.4'], label: 'Hill height (m)' });
const rock = param('rock', '#8a8580', { label: 'Rock' });
const rock2 = param('rock2', '#76716b', { label: 'Accent rock' });
const grass = param('grass', '#6aa443', { label: 'Grass cap' });
const shadow = param('shadow', '#1c1a19', { label: 'Cave shadow' });
const timber = param('timber', '#7a5434', { label: 'Timber' });

presets({
  desert: { rock: '#c08a5a', rock2: '#a8744a', grass: '#d8b77a' },
  snowy: { rock: '#6f747a', rock2: '#5f646a', grass: '#eef3f6' },
  mine: { style: 'mine' },
});

const S = 2000;
const h = S / 2;
const H = Number(heightM.value) * 1000;
const mine = style.value === 'mine';
const aw = 560; // half width of the opening
const ah = 1200; // opening height

// Squarish jittered ring that fills most of the tile at scale 1.
const ring = (r: number, salt: number, rot = 0) => {
  let p = path();
  const s = 10;
  for (let k = 0; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    const sq = 1 / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))) ** 0.6;
    const rr = r * sq * (0.9 + 0.12 * Math.sin(k * 2.7 + salt));
    p = k === 0 ? p.moveTo(rr * Math.cos(a), rr * Math.sin(a)) : p.lineTo(rr * Math.cos(a), rr * Math.sin(a));
  }
  return p.close();
};
// Arch opening profile in (x, z), extruded along +Y from the front.
const archPts = (wd: number, ht: number): [number, number][] => {
  const pts: [number, number][] = [[-wd, -10], [wd, -10], [wd, ht - wd]];
  for (let i = 1; i < 6; i++) {
    const a = (Math.PI * i) / 6;
    pts.push([wd * Math.cos(a), ht - wd + wd * 0.9 * Math.sin(a)]);
  }
  pts.push([-wd, ht - wd]);
  return pts;
};
const alongY = (pts: [number, number][], y0: number, len: number) => extrudePolygon(pts, len).rotateX(90).translate(0, y0 + len, 0);

const cave = assembly('cave-entrance');
const hill = ring(h * 0.94, 1).loft([ring(h * 0.86, 2, 0.3), ring(h * 0.66, 3, 0.1), ring(h * 0.38, 4, 0.4)], {
  planes: [
    { plane: 'XY', origin: [0, 0, 0] },
    { plane: 'XY', origin: [0, 30, H * 0.45] },
    { plane: 'XY', origin: [0, 80, H * 0.85] },
    { plane: 'XY', origin: [0, 120, H] },
  ],
  ruled: true,
});
cave.part('hill', hill.subtract(alongY(archPts(aw, ah), -h - 50, h + 50 + 200)).color(rock));
// Dark interior: back wall and floor of the tunnel.
cave.part('shadow', alongY(archPts(aw - 5, ah - 5), 150, 60).translate(0, 0, 10).color(shadow));
cave.part('floor', box(2 * aw - 10, h * 0.62 + 150, 20, true).translate(0, (-h * 0.62 + 150) / 2, 10).color(shadow));
// Grass cap on the top and a few accent boulders round the foot.
cave.part('cap', ring(h * 0.42, 5, 0.4).loft(ring(h * 0.2, 6, 0.1), { spacing: H * 0.1, ruled: true }).translate(0, 120, H * 0.95).color(grass));
[[-820, -700, 190], [760, -620, 160], [820, 520, 140]].forEach(([x, y, r], i) => {
  let p = path().moveTo(r, 0);
  for (let s = 1; s < 6; s++) p = p.lineTo(r * (0.85 + 0.2 * Math.sin(s * 1.9 + i)) * Math.cos((s * Math.PI) / 3), r * Math.sin((s * Math.PI) / 3));
  cave.part(`boulder-${i + 1}`, p.close().loft(path().moveTo(r * 0.45, 0).lineTo(0, r * 0.45).lineTo(-r * 0.45, 0).lineTo(0, -r * 0.45).close(), { spacing: r * 0.9, ruled: true })
    .translate(x, y, 0).color(rock2));
});
if (mine) {
  // Timber portal: two posts, a lintel and a cross brace just inside the mouth.
  const y0 = -h * 0.55;
  cave.part('post-left', box(140, 140, ah - aw * 0.6, true).translate(-aw + 110, y0, (ah - aw * 0.6) / 2).color(timber));
  cave.part('post-right', box(140, 140, ah - aw * 0.6, true).translate(aw - 110, y0, (ah - aw * 0.6) / 2).color(timber));
  cave.part('lintel', box(2 * aw - 40, 170, 160, true).translate(0, y0, ah - aw * 0.6 + 70).color(timber));
  cave.part('sill', box(2 * aw - 60, 120, 40, true).translate(0, y0 - 300, 20).color(timber));
}

return cave.model();
