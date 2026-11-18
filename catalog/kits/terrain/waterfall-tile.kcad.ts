// Original kernelCAD low-poly waterfall tile: a 2 m x 2 m tile with a
// straight stepped rock cliff (the cliff wall tile's profile) whose plateau
// is cut by a stream that pours over the lip as a leaning sheet of water into
// a splash pool with foam at the foot. The stream leaves the back edge
// centred, so it joins a river tile on the plateau.

meta({
  name: 'waterfall-tile',
  license: 'CC0-1.0',
  title: 'Waterfall tile',
  description: 'Square 2 m cliff tile with a stream pouring over the edge as a waterfall into a foaming splash pool. Knobs: cliff height, fall width, rock, accent rock, grass, water, foam and dirt colours.',
  tags: ['tile', 'waterfall', 'cascade', 'cliff', 'river', 'stream', 'pool', 'water', 'mountain', 'terrain', 'grid'],
  kit: 'terrain',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'mountain', 'forest'],
  triangleBudget: 700,
});

const heightM = param('heightM', '2', { choices: ['1', '2', '3'], label: 'Cliff height (m)' });
const fall = param('fall', 'medium', { choices: ['narrow', 'medium', 'wide'], label: 'Fall width' });
const rockC = param('rock', '#8a8580', { label: 'Rock' });
const rock2 = param('rock2', '#77726d', { label: 'Rock accent' });
const grass = param('grass', '#6aa443', { label: 'Grass' });
const water = param('water', '#4f9fd4', { label: 'Water' });
const foam = param('foam', '#e8f4fa', { label: 'Foam' });
const dirt = param('dirt', '#7a5636', { label: 'Dirt edge' });

presets({
  desert: { rock: '#b8724a', rock2: '#a5633f', grass: '#d8b77a', dirt: '#9a6a44', water: '#45a8b8' },
  jungle: { grass: '#3f8f3a', water: '#3fb0a0', rock: '#6f7a6a', rock2: '#5f6a5a' },
});

const S = 2000;
const h = S / 2;
const t = 200;
const skirtH = t * 0.7;
const H = Number(heightM.value) * 1000;
const ns = 3;
const capT = 120;
const front = -350;
const depth = 600 / ns;
const rise = (H - capT) / ns;
const cw = fall.value === 'narrow' ? 220 : fall.value === 'wide' ? 450 : 320; // half width of the fall

const footprint = (f: number, salt: number): [number, number][] => {
  const pts: [number, number][] = [];
  const segs = 6;
  for (let k = 0; k <= segs; k++) {
    const j = k === 0 || k === segs ? 0 : 60 * Math.sin(k * 2.7 + salt * 1.9);
    pts.push([-h + (S * k) / segs, f + j]);
  }
  pts.push([h, h], [-h, h]);
  return pts;
};
const ring = (pts: [number, number][]) => {
  let p = path().moveTo(pts[0][0], pts[0][1]);
  for (let k = 1; k < pts.length; k++) p = p.lineTo(pts[k][0], pts[k][1]);
  return p.close();
};
const slab = (pts: [number, number][], x0: number, len: number) =>
  extrudePolygon(pts, len).rotateX(90).rotateZ(90).translate(x0, 0, 0);
const prism = (pts: [number, number][], z0: number, z1: number) => extrudePolygon(pts, z1 - z0).translate(0, 0, z0);

const tile = assembly('waterfall-tile');
// Splash pool in the ground at the cliff foot.
const pool: [number, number][] = [];
for (let k = 0; k < 9; k++) {
  const a = (2 * Math.PI * k) / 9;
  const rr = (cw + 260) * (0.88 + 0.14 * Math.sin(k * 2.3));
  pool.push([rr * Math.cos(a), front - 120 + rr * 0.62 * Math.sin(a)]);
}
tile.part('dirt', box(S, S, skirtH, true).translate(0, 0, skirtH / 2).subtract(prism(pool, 60, t)).color(dirt));
tile.part('grass', box(S, S, t - skirtH, true).translate(0, 0, (t + skirtH) / 2).subtract(prism(pool, skirtH - 10, t + 10)).color(grass));
tile.part('pool', prism(pool, 55, t - 50).color(water));

for (let i = 0; i < ns; i++) {
  const f = front + i * depth;
  const zTop = (i + 1) * rise + (i === ns - 1 ? 0 : 30 * Math.sin(i * 2.2));
  const z0 = i === 0 ? 0 : i * rise - 60;
  tile.part(`rock-${i + 1}`, ring(footprint(f - 20, i + 1)).loft(ring(footprint(f + depth * 0.55, i + 5)), {
    planes: [
      { plane: 'XY', origin: [0, 0, z0] },
      { plane: 'XY', origin: [0, 0, zTop] },
    ],
    ruled: true,
  }).color(i % 2 === 0 ? rockC : rock2));
}
const fTop = front + (ns - 1) * depth - 25;
const lipZ = H - capT;
// Plateau grass either side of the stream, stream bed and water between.
tile.part('ledge-left', box(h - cw, h - fTop, capT, true).translate(-(h + cw) / 2, (h + fTop) / 2, H - capT / 2).color(grass));
tile.part('ledge-right', box(h - cw, h - fTop, capT, true).translate((h + cw) / 2, (h + fTop) / 2, H - capT / 2).color(grass));
tile.part('stream', box(2 * cw + 2, h - fTop + 40, capT - 40, true).translate(0, (h + fTop - 40) / 2, H - capT / 2 - 20).color(water));
// The falling sheet: a leaning slab in front of the face, from the lip to the pool.
const lipY = fTop - 30;
const sheet: [number, number][] = [[front - 230, t - 55], [front - 140, t - 55], [lipY + 10, lipZ + 82], [lipY - 60, lipZ + 82]];
tile.part('fall', slab(sheet, -cw, 2 * cw).color(water));
// Foam: chunky low blobs where the fall hits the pool.
for (let i = 0; i < 4; i++) {
  const x = -cw + (2 * cw * (i + 0.5)) / 4;
  const r = 110 + 30 * Math.sin(i * 2.1);
  let p = path().moveTo(r, 0);
  for (let s = 1; s < 6; s++) p = p.lineTo(r * Math.cos((s * Math.PI) / 3), r * 0.7 * Math.sin((s * Math.PI) / 3));
  tile.part(`foam-${i + 1}`, p.close().loft(path().moveTo(r * 0.4, 0).lineTo(0, r * 0.3).lineTo(-r * 0.4, 0).lineTo(0, -r * 0.3).close(), { spacing: 90 + 20 * Math.sin(i), ruled: true })
    .translate(x, front - 200 + 40 * Math.sin(i * 3.3), t - 60).color(foam));
}

return tile.model();
