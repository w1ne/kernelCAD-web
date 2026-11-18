// Original kernelCAD low-poly lava tile: a 2 m x 2 m slab of cracked dark
// basalt crust plates floating on glowing lava, which shows through the
// cracks or opens into a central pool. Edges sit at the 0.2 m tile height.

meta({
  name: 'lava-tile',
  license: 'CC0-1.0',
  title: 'Lava tile',
  description: 'Square 2 m volcanic tile of cracked basalt crust plates over glowing lava, with lava in the cracks or an open lava pool. Knobs: layout, plates per row, crust, accent crust, lava and base colours.',
  tags: ['tile', 'lava', 'magma', 'volcano', 'volcanic', 'basalt', 'hazard', 'fire', 'hell', 'terrain', 'grid'],
  kit: 'terrain',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'volcanic', 'dungeon'],
  triangleBudget: 500,
});

const layout = param('layout', 'pool', { choices: ['cracks', 'pool'], label: 'Layout' });
const plates = param('plates', '4', { choices: ['3', '4', '5'], label: 'Plates per row' });
const crust = param('crust', '#3a3533', { label: 'Crust' });
const crust2 = param('crust2', '#4a423e', { label: 'Accent crust' });
const lava = param('lava', '#ff6a1a', { label: 'Lava' });
const base = param('base', '#241f1d', { label: 'Base' });

presets({
  cooling: { lava: '#c8401a', crust: '#2c2828' },
  blue: { lava: '#3fd0ff', crust: '#2a2e3a', crust2: '#363b4a', base: '#1a1d26' },
  toxic: { lava: '#8aff3a', crust: '#2f3328', crust2: '#3c4233' },
});

const S = 2000;
const h = S / 2;
const t = 200;
const n = Number(plates.value);
const cell = S / n;
const gap = 55;
const pool = layout.value === 'pool';

const tile = assembly('lava-tile');
tile.part('base', box(S, S, t - 70, true).translate(0, 0, (t - 70) / 2).color(base));
tile.part('lava', box(S - 2, S - 2, 30, true).translate(0, 0, t - 70 + 14).color(lava));

// Jittered grid corners shared by neighbouring plates; edge corners stay on
// the tile edge so tiles meet.
const jx = (i: number, j: number) => (i === 0 || i === n ? 0 : 0.22 * cell * Math.sin(i * 3.7 + j * 1.3));
const jy = (i: number, j: number) => (j === 0 || j === n ? 0 : 0.22 * cell * Math.sin(j * 2.9 + i * 2.1));
const corner = (i: number, j: number): [number, number] => [-h + i * cell + jx(i, j), -h + j * cell + jy(i, j)];
let k = 0;
for (let i = 0; i < n; i++) {
  for (let j = 0; j < n; j++) {
    const quad = [corner(i, j), corner(i + 1, j), corner(i + 1, j + 1), corner(i, j + 1)];
    const cx = quad.reduce((s, p) => s + p[0], 0) / 4;
    const cy = quad.reduce((s, p) => s + p[1], 0) / 4;
    if (pool && Math.hypot(cx, cy) < cell * 0.9) continue;
    k++;
    // Shrink towards the centre to open cracks, except along tile edges.
    const shrink = ([x, y]: [number, number]): [number, number] => {
      const sx = Math.abs(Math.abs(x) - h) < 1 ? x : x + Math.sign(cx - x) * gap / 2;
      const sy = Math.abs(Math.abs(y) - h) < 1 ? y : y + Math.sign(cy - y) * gap / 2;
      return [sx, sy];
    };
    const bot = quad.map(shrink);
    const top = bot.map(([x, y]) => [x + (cx - x) * 0.12, y + (cy - y) * 0.12] as [number, number]);
    const ringOf = (pts: [number, number][]) => path().moveTo(pts[0][0], pts[0][1]).lineTo(pts[1][0], pts[1][1]).lineTo(pts[2][0], pts[2][1]).lineTo(pts[3][0], pts[3][1]).close();
    const zt = t - 15 * (0.5 + 0.5 * Math.sin(k * 5.1));
    tile.part(`plate-${k}`, ringOf(bot).loft(ringOf(top), {
      planes: [
        { plane: 'XY', origin: [0, 0, t - 75] },
        { plane: 'XY', origin: [0, 0, zt] },
      ],
      ruled: true,
    }).color(k % 3 === 0 ? crust2 : crust));
  }
}
if (pool) {
  // A cooling crust island in the pool.
  let p = path().moveTo(160, 0);
  for (let s = 1; s < 6; s++) p = p.lineTo(160 * (0.8 + 0.25 * Math.sin(s * 2.3)) * Math.cos((s * Math.PI) / 3), 160 * (0.8 + 0.25 * Math.sin(s * 2.3)) * Math.sin((s * Math.PI) / 3));
  tile.part('island', p.close().loft(path().moveTo(70, 0).lineTo(0, 70).lineTo(-70, 0).lineTo(0, -70).close(), { spacing: 110, ruled: true })
    .translate(120, -80, t - 70).color(crust2));
}

return tile.model();
